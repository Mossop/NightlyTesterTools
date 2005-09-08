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

DownloadListener.prototype.init = function(name,file,transfer)
{
  this.name=name;
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
    var nightlyService = Components.classes["@blueprintit.co.uk/nightlytools;1"]
                              .getService(Components.interfaces.nsINightlyToolsService);
    nightlyService.installLocalExtension(this.name,this.file);
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
