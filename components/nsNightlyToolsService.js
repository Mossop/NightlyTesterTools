/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var nsNightlyToolsService = {

installCount: 0,
failCount: 0,
successCount: 0,

installComplete: function(success)
{
  if (success)
  {
    this.successCount++;
  }
  else
  {
    this.failCount++;
  }
  
  if ((this.failCount+this.successCount)==this.installCount)
  {
    if (this.successCount>0)
    {
     	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
    									.getService(Components.interfaces.nsIStringBundleService);
    	var bundle = sbs.createBundle("chrome://nightly/locale/nightly.properties");
   		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
  	                    .getService(Components.interfaces.nsIPromptService);
      var text;
      if (this.failCount==0)
      {
        text=bundle.formatStringFromName("nightly.installsuccess.message",[this.successCount],1);
      }
      else
      {
        text=bundle.formatStringFromName("nightly.installpartial.message",[this.successCount],1);
      }
      promptService.alert(null,"Nightly Tester Tools",text);
    }
    this.successCount=0;
    this.failCount=0;
    this.installCount=0;
  }
},

installExtension: function(name, uri)
{
  this.installCount++;
  
  if (uri.schemeIs("file"))
  {
    this.installLocalExtension(name,uri); //TODO add in 
  }
  else
  {
   	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
  									.getService(Components.interfaces.nsIStringBundleService);
  	var bundle = sbs.createBundle("chrome://nightly/locale/nightly.properties");
 		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
	                    .getService(Components.interfaces.nsIPromptService);

   	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
  										getService(Components.interfaces.nsIProperties);
  	dir = directoryService.get("TmpD",Components.interfaces.nsIFile);
  
  	var i=0;
  	var file;
  	do
  	{
  		file=dir.clone();
  		file.append("nightly-"+i+".xpi");
  		if (!file.exists())
  		{
  			file.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, 0644);
  			break;
  		}
  		i++
  	} while (i<1000);
  	if (i<1000)
  	{
  	  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
  	                            .getService(Components.interfaces.nsIIOService);
  	  fileuri=ioService.newFileURI(file);
  	  dump(uri);
  		
  		var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
  											.createInstance(Components.interfaces.nsIWebBrowserPersist);
  		const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  		const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
  		persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
  		persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
  	
  		// Create download and initiate it (below)
  		var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
  	  tr.init(uri, fileuri, name, null, null, null, persist);
  	  var listener = Components.classes["@blueprintit.co.uk/downloadlistener;1"]
  	  											.createInstance(Components.interfaces.nsIDownloadListener);
  	  listener.init(name,file,tr);
  	  persist.progressListener = listener;
  	  persist.saveURI(uri, null, null, null, null, fileuri);
  	}
  	else
  	{
      var text=bundle.formatStringFromName("nightly.notemp.message",[this.name],1);
      promptService.alert(null,"Nightly Tester Tools",text);
      this.installComplete(false);
  	}
  }
},

installLocalExtension: function(name, file)
{
  try
  {
   	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
  									.getService(Components.interfaces.nsIStringBundleService);
  	var bundle = sbs.createBundle("chrome://nightly/locale/nightly.properties");
 		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
	                    .getService(Components.interfaces.nsIPromptService);

		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
											getService(Components.interfaces.nsIProperties);
		dir = directoryService.get("TmpD",Components.interfaces.nsIFile);
	
	  // Find a temporary name for the rdf file.
		var i=0;
		var rdffile;
		do
		{
			rdffile=dir.clone();
			rdffile.append("nightly-rdf-"+i+".rdf");
			if (!rdffile.exists())
			{
				rdffile.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, 0644);
				break;
			}
			i++
		} while (i<1000);
		
		if (i<1000)
		{
			var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
									.createInstance(Components.interfaces.nsIZipReader);
			zipReader.init(file);
			zipReader.open();
			try
			{
			  // Extract the rdf file.
  			zipReader.extract("install.rdf", rdffile);
  			
  		  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
  		                            .getService(Components.interfaces.nsIIOService);
  		  fileuri=ioService.newFileURI(rdffile);
  
  			rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
  												.getService(Components.interfaces.nsIRDFService);
  			var ds = rdfService.GetDataSourceBlocking(fileuri.spec);
  			var source = rdfService.GetResource("urn:mozilla:install-manifest");
  			var idprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#id");
  			var id = ds.GetTarget(source,idprop,true);
  			
  			// Read all we need, delete the rdf file but dont care if this fails.
  			try
  			{
   				rdffile.remove(false);
   			}
   			catch (e) { }
  			if (id)
  			{
  				id=id.QueryInterface(Components.interfaces.nsIRDFLiteral);
  				extensionID=id.Value;
  				
  				var em = Components.classes["@mozilla.org/extensions/manager;1"]
  										.getService(Components.interfaces.nsIExtensionManager);
  				var installLocation = em.getInstallLocation(extensionID);
  				if (!installLocation)
  				{
  					installLocation = em.getInstallLocation("{8620c15f-30dc-4dba-a131-7c5d20cf4a29}");
  				}
  				else
  				{
  				  // Maybe we want to wipe the extension dir here?
  				  // var dest = installLocation.getItemLocation(extensionID);
  				  // dest.remove(true);
  				}
  				
  				var dest = installLocation.getItemLocation(extensionID);
  				
  				try
  				{
  		      // create directories first
  		      var entries = zipReader.findEntries("*/");
  		      while (entries.hasMoreElements())
  		      {
  		        var entry = entries.getNext().QueryInterface(Components.interfaces.nsIZipEntry);
  		        var target = installLocation.getItemFile(extensionID, entry.name);
  		        if (!target.exists())
  		        {
  		          try
  		          {
  		            target.create(Components.interfaces.nsILocalFile.DIRECTORY_TYPE, 0755);
  		          }
  		          catch (e)
  		          {
  		          }
  		        }
  		      }
  		
  		      entries = zipReader.findEntries("*");
  		      while (entries.hasMoreElements())
  		      {
  		        entry = entries.getNext().QueryInterface(Components.interfaces.nsIZipEntry);
  		        if (entry.name.substring(entry.name.length-1)!="/")
  		        {
    		        target = installLocation.getItemFile(extensionID, entry.name);
    		        try
    		        {
    			        if (!target.exists())
    			          target.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, 0644);
    			        zipReader.extract(entry.name, target);
    		        }
    		        catch (e)
    		        {
    		        }
    		      }
  		      }
  				}
  				catch (e)
  				{
  					dump("Failed - "+e+"\n");
  					zipReader.close();
  					dest.remove(true);
            var text=bundle.formatStringFromName("nightly.cannotwrite.message",[this.name],1);
            promptService.alert(null,"Nightly Tester Tools",text);
  					this.installComplete(false);
  					return;
  				}
  
  				var appinfo = Components.classes['@mozilla.org/xre/app-info;1']
  															.getService(Components.interfaces.nsIXULAppInfo);
  				var appid = appinfo.ID;
  				var appversion = appinfo.version;
  				try
  				{
  					appversion=prefservice.getCharPref("app.extensions.version");
  					if (!appversion)
  						appversion=appinfo.version;
  				}
  				catch (e) { }
  				var versionliteral = rdfService.GetLiteral(appversion);
  				
  				var vc = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
  	
  				manifest=ioService.newFileURI(installLocation.getItemFile(extensionID, "install.rdf"));
  				ds = rdfService.GetDataSourceBlocking(manifest.spec);
  				var targappprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#targetApplication");
  				var minprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#minVersion");
  				var maxprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#maxVersion");
  				
  				var changed=false;
  				var apps = ds.GetTargets(source,targappprop,true);
  				while (apps.hasMoreElements())
  				{
  					var appentry = apps.getNext();
  					var id = ds.GetTarget(appentry,idprop,true);
  					if (id)
  					{
  						id=id.QueryInterface(Components.interfaces.nsIRDFLiteral);
  						if (id.Value==appid)
  						{
  							var minv = ds.GetTarget(appentry,minprop,true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  							var maxv = ds.GetTarget(appentry,maxprop,true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  							
  							if (vc.compare(appversion,minv.Value)<0)
  							{
  								ds.Change(appentry,minprop,minv,versionliteral);
  								changed=true;
  							}
  							
  							if (vc.compare(appversion,maxv.Value)>0)
  							{
  								ds.Change(appentry,maxprop,maxv,versionliteral);
  								changed=true;
  							}
  						}
  					}
  				}
  				if (changed)
  				{
  		      ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
  		      ds.Flush();
  				}
  				this.installComplete(true);
  			}
  		}
  		catch (e)
  		{
				dump("Failed - "+e+"\n");
        var text=bundle.formatStringFromName("nightly.badrdf.message",[this.name],1);
        promptService.alert(null,"Nightly Tester Tools",text);
		    this.installComplete(false);
  		}
			zipReader.close();
		}
		else
		{
      var text=bundle.formatStringFromName("nightly.notemp.message",[this.name],1);
      promptService.alert(null,"Nightly Tester Tools",text);
		  this.installComplete(false);
		}
	}
	catch (e)
	{
		dump("Failed - "+e+"\n");
    var text=bundle.formatStringFromName("nightly.notemp.message",[this.name],1);
    promptService.alert(null,"Nightly Tester Tools",text);
	  this.installComplete(false);
	}
},

QueryInterface: function(iid)
{
	if (iid.equals(Components.interfaces.nsINightlyToolsService)
		|| iid.equals(Components.interfaces.nsIDownloadListener))
	{
		return this;
	}
	else (iid.equals(Components.interfaces.nsIRDFRemoteDataSource))
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

var initModule =
{
	ServiceCID: Components.ID("{1734c5a0-739a-43db-a483-e0eecce39ddf}"),
	ServiceContractID: "@blueprintit.co.uk/nightlytools;1",
	ServiceName: "Nightly Tester Tools Service",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
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
			return nsNightlyToolsService.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
