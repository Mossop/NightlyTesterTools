// -*- js-var:dump,Components,XULTreeView,XULTreeViewRecord -*-
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Nightly Tester Tools.
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * $HeadURL: svn://svn.blueprintit.co.uk/dave/mozilla/firefox/buildid/trunk/src/components/nsTalkbackService.js $
 * $LastChangedBy: dave $
 * $Date: 2006-08-17 15:32:11 +0100 (Thu, 17 Aug 2006) $
 * $Revision: 733 $
 *
 */

const Cc = Components.classes;
const Ci = Components.interfaces;

const PREFIX_NS_EM    = "http://www.mozilla.org/2004/em-rdf#";
const PREFIX_ITEM_URI = "urn:mozilla:item:";

var gConsole = null;
var gRDF = null;
var gDS = null;
var gStateProp = null;
var gOpTypeProp = null;

function LOG(string)
{
	if (nttAddonMonitorService.logging)
		gConsole.logStringMessage(string);
}

function getValue(node)
{
	if (node instanceof Components.interfaces.nsIRDFResource)
		return node.Value;
	else if (node instanceof Components.interfaces.nsIRDFLiteral)
		return node.Value;
	else if (node instanceof Components.interfaces.nsIRDFInt)
		return node.Value;
}

function ZipEntryEnumeratorWrapper(entries)
{
	this.entries = entries;
}

ZipEntryEnumeratorWrapper.prototype = {
	entries: null,
	
	hasMore: function()
	{
		return this.entries.hasMoreElements();
	},
	
	getNext: function()
	{
		return this.entries.getNext().QueryInterface(Ci.nsIZipEntry).name;
	},
}

function OldZipReaderWrapper(reader)
{
	this.zipreader = reader;
}

OldZipReaderWrapper.prototype = {
	open: function(file)
	{
		this.reader.init(file);
		this.reader.open();
	},
	
	findEntries: function(pattern)
	{
		return new ZipEntryEnumeratorWrapper(this.reader.findEntries(pattern));
	},
	
	extract: function(path, file)
	{
		this.reader.extract(path, file);
	},
	
	close: function()
	{
		this.reader.close();
	}
}

function ZipMonitor(zipwriter, rdftmp)
{
	this.zipwriter = zipwriter;
	this.rdftmp = rdftmp;
}

ZipMonitor.prototype = {
	rdftmp: null,
	zipwriter: null,
	
  onStartRequest: function(aRequest, aContext)
  {
  },

  onStopRequest: function(aRequest, aContext, aStatusCode)
  {
   	this.zipwriter.close();
    this.rdftmp.remove(true);
    LOG("Compression complete");
  }
}

var nttAddonMonitorService = {

logging: true,
currentURL: null,
installs: null,
installCount: 0,

_init: function()
{
	gDS = Cc["@mozilla.org/file/directory_service;1"]
				 .getService(Ci.nsIProperties);

	gConsole = Cc["@mozilla.org/consoleservice;1"]
               .getService(Ci.nsIConsoleService);
	gRDF = Cc["@mozilla.org/rdf/rdf-service;1"]
          .getService(Ci.nsIRDFService);
  gStateProp = gRDF.GetResource(PREFIX_NS_EM+"state");
  gOpTypeProp = gRDF.GetResource(PREFIX_NS_EM+"opType");
  
  this.installs = [];
  this.installCount = 0;
},

monitorInstall: function(url)
{
	if (this.installCount == 0)
	{
		this.previousSetting = true;
		var prefservice = Components.classes['@mozilla.org/preferences-service;1']
								                .getService(Components.interfaces.nsIPrefBranch);
		try
		{
		  this.previousSetting = prefservice.getBoolPref("extensions.checkCompatibility");
		}
		catch (e)
		{
		}
		prefservice.setBoolPref("extensions.checkCompatibility", false);
	  var em = Cc["@mozilla.org/extensions/manager;1"]
	             .getService(Ci.nsIExtensionManager);
	  em.datasource.AddObserver(this);
	}
	this.installs[url] = true;
	this.installCount++;
},

getStageFile: function(id)
{
	var stage = gDS.get("ProfD",Ci.nsIFile);
	stage.append("extensions");
	stage.append("staged-xpis");
	stage.append(id);
	var stageFile;
	if (stage.exists() && stage.isDirectory())
	{
		try
		{
			var entries = stage.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);
			while (entries.hasMoreElements())
			{
				var file = entries.nextFile;
				if (!(file instanceof Ci.nsILocalFile))
					continue;
				var extension = file.leafName.substr(-4);
				if ((extension == ".xpi") || (extension == ".jar"))
				{
					if (stageFile)
						stageFile.remove(false);
					stageFile = file;
				}
			}
		}
		catch (e) { LOG(e) }
		if (entries)
			entries.close();
		return stageFile;
	}
	else
		LOG("Illegal stage at "+stage.path);
	return null;
},

updateXPI: function(id)
{
  var ioService = Cc["@mozilla.org/network/io-service;1"]
                   .getService(Ci.nsIIOService);
  var appinfo = Cc['@mozilla.org/xre/app-info;1']
                 .getService(Ci.nsIXULAppInfo);
  var vc = Cc["@mozilla.org/xpcom/version-comparator;1"]
            .getService(Ci.nsIVersionComparator);

	var source = gRDF.GetResource("urn:mozilla:install-manifest");
	var idprop = gRDF.GetResource(PREFIX_NS_EM + "id");
	var targappprop = gRDF.GetResource(PREFIX_NS_EM + "targetApplication");
	var minprop = gRDF.GetResource(PREFIX_NS_EM + "minVersion");
	var maxprop = gRDF.GetResource(PREFIX_NS_EM + "maxVersion");

	var stageFile = this.getStageFile(id);
	if (stageFile)
	{
		var rdftmp = gDS.get("TmpD", Ci.nsIFile);
		rdftmp.append("install.rdf");
		rdftmp.createUnique(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0755);
		zipReader = Cc["@mozilla.org/libjar/zip-reader;1"]
                 .createInstance(Ci.nsIZipReader);
		if (zipReader.init)
			zipReader = new OldZipReaderWrapper(zipReader);
		
		zipReader.open(stageFile);

		zipReader.extract("install.rdf", rdftmp);
		zipReader.close();

		var fileuri=ioService.newFileURI(rdftmp);

		var rdfds = gRDF.GetDataSourceBlocking(fileuri.spec);
		var originalID = rdfds.GetTarget(source, idprop, true);
		
		var appid = appinfo.ID;
		var appversion = appinfo.version;
		var versionliteral = gRDF.GetLiteral(appversion);

  	var apps = rdfds.GetTargets(source, targappprop, true);
  	while (apps.hasMoreElements())
  	{
  		var appentry = apps.getNext();
  		var id = rdfds.GetTarget(appentry, idprop, true);
  		if (id)
  		{
  			id=id.QueryInterface(Components.interfaces.nsIRDFLiteral);
  			if (id.Value==appid)
  			{
  				var minv = rdfds.GetTarget(appentry, minprop, true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  				var maxv = rdfds.GetTarget(appentry, maxprop, true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  				
  				if (vc.compare(appversion, minv.Value)<0)
  				{
  					rdfds.Change(appentry, minprop, minv, versionliteral);
  					changed=true;
  				}
  				
  				if (vc.compare(appversion, maxv.Value)>0)
  				{
  					rdfds.Change(appentry, maxprop, maxv, versionliteral);
  					changed=true;
  				}
  			}
  		}
  	}
  	if (changed)
  	{
  		LOG("Writing new extension");
      rdfds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
      rdfds.Flush();

      var zipWriter = Cc["@blueprintit.co.uk/zipwriter;1"]
                       .createInstance(Ci.nttIZipWriter);

      zipWriter.open(stageFile, 0);
      zipWriter.queueRemoval("install.rdf");
      zipWriter.queueFile("install.rdf", rdftmp);
      zipWriter.processQueue(new ZipMonitor(zipWriter, rdftmp), null);
  	}
  	else
  	{
  		LOG("No changes necessary");
	 		rdftmp.remove(true);
  	}
	}
	else
		LOG("Unable to find staged file for "+id);
},

// nsIRDFObserver implementation

onAssert: function(aDataSource, aSource, aProperty, aTarget)
{
	if ((aProperty == gStateProp)
	 && (aTarget instanceof Ci.nsIRDFLiteral)
	 && (aTarget.Value=="finishing"))
	{
		if (this.installs[aSource.Value])
			this.currentURL = aSource.Value;
	}
	else if ((this.currentURL)
	      && (aProperty = gOpTypeProp)
	      && (aTarget instanceof Ci.nsIRDFLiteral)
	      && ((aTarget.Value=="needs-install")
	       || (aTarget.Value=="needs-upgrade")))
	{
		var id = aSource.Value.substr(PREFIX_ITEM_URI.length);
		this.updateXPI(id);
		this.installCount--;
		delete this.installs[this.currentURL];
		this.currentURL = null;
		
		if (this.installCount == 0)
		{
			var prefservice = Components.classes['@mozilla.org/preferences-service;1']
									                .getService(Components.interfaces.nsIPrefBranch);
		  prefservice.setBoolPref("extensions.checkCompatibility", this.previousSetting);
		  var em = Cc["@mozilla.org/extensions/manager;1"]
		             .getService(Ci.nsIExtensionManager);
		  em.datasource.RemoveObserver(this);
		}
	}
},

onUnassert: function(aDataSource, aSource, aProperty, aTarget)
{
},

onChange: function(aDataSource, aSource, aProperty, aOldTarget, aNewTarget)
{
	this.onUnassert(aDataSource, aSource, aProperty, aOldTarget);
	this.onAssert(aDataSource, aSource, aProperty, aNewTarget);
},

onMove: function(aDataSource, aOldSource, aNewSource, aProperty, aTarget)
{
	this.onUnassert(aDataSource, aOldSource, aProperty, aTarget);
	this.onAssert(aDataSource, aNewSource, aProperty, aTarget);
},

onBeginUpdateBatch: function(aDataSource)
{
	this.logging=false;
},

onEndUpdateBatch: function(aDataSource)
{
	this.logging=true;
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nttIAddonMonitorService)
		|| iid.equals(Ci.nsIRDFObserver)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

var initModule =
{
	ServiceCID: Components.ID("{fd0a310c-323f-41b4-b694-aab8c969e6b7}"),
	ServiceContractID: "@blueprintit.co.uk/addonmonitor;1",
	ServiceName: "Nightly Tester Addon Monitor Service",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
	},

	getClassObject: function (compMgr, cid, iid)
	{
		if (!cid.equals(this.ServiceCID))
			throw Components.results.NS_ERROR_NO_INTERFACE
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return this.instanceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	instanceFactory:
	{
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			nttAddonMonitorService._init();
			return nttAddonMonitorService.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
