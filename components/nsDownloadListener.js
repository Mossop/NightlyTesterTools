/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

function DownloadListener()
{
}

DownloadListener.prototype.init = function(file,transfer)
{
	this.file=file;
	this.transfer=transfer;
}

DownloadListener.prototype.onLocationChange = function(webProgress, request, location)
{
	this.transfer.onLocationChange(webProgress, request, location);
}

DownloadListener.prototype.onProgressChange = function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress)
{
	this.transfer.onProgressChange(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress);
}

DownloadListener.prototype.onSecurityChange = function(webProgress, request, state)
{
	this.transfer.onSecurityChange(webProgress, request, state);
}

DownloadListener.prototype.onStateChange = function(webProgress, request, stateFlags, status)
{
	this.transfer.onStateChange(webProgress, request, stateFlags, status);
	if (stateFlags&Components.interfaces.nsIWebProgressListener.STATE_STOP)
	{
		try
		{
			var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
												getService(Components.interfaces.nsIProperties);
			dir = directoryService.get("TmpD",Components.interfaces.nsIFile);
		
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
				zipReader.init(this.file);
				zipReader.open();
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
				if (id)
				{
					id=id.QueryInterface(Components.interfaces.nsIRDFLiteral);
					extensionID=id.Value;
					rdffile.remove(false);
					
					var em = Components.classes["@mozilla.org/extensions/manager;1"]
											.getService(Components.interfaces.nsIExtensionManager);
					var installLocation = em.getInstallLocation(extensionID);
					if (!installLocation)
					{
						installLocation = em.getInstallLocation("{8620c15f-30dc-4dba-a131-7c5d20cf4a29}");
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
					catch (e)
					{
						dump("Failed - "+e+"\n");
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
				}
				zipReader.close();
			}
		}
		catch (e)
		{
			dump("Failed - "+e+"\n");
		}
		this.file.remove(false);
	}
}

DownloadListener.prototype.onStatusChange = function(webProgress, request, status, message)
{
	this.transfer.onStatusChange(webProgress, request, status, message);
}

DownloadListener.prototype.QueryInterface = function(iid)
{
	if (iid.equals(Components.interfaces.nsIWebProgressListener)
		|| iid.equals(Components.interfaces.nsIDownloadListener)
		|| iid.equals(Components.interfaces.nsISupports))
	{
		return this;
	}
	else (iid.equals(Components.interfaces.nsIRDFRemoteDataSource))
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}

var initModule =
{
	ServiceCID: Components.ID("{1f33b5b2-ca90-4aa3-a27c-262997bdb77b}"),
	ServiceContractID: "@blueprintit.co.uk/downloadlistener;1",
	ServiceName: "Nightly Tester Download Listener",
	
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
			var instance = new DownloadListener();
			return instance.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
