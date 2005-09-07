/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var NightlyXPInstall = {

startDownload: function(name,url)
{
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
	} while (i<100);
	if (i<1000)
	{
	  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
	                            .getService(Components.interfaces.nsIIOService);
	  fileuri=ioService.newFileURI(file);
	  xpiuri=ioService.newURI(url,null,null);
		
		var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
											.createInstance(Components.interfaces.nsIWebBrowserPersist);
		const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
		const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
		persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
		persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	
		// Create download and initiate it (below)
		var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
	  tr.init(xpiuri, fileuri, name, null, null, null, persist);
	  var listener = Components.classes["@blueprintit.co.uk/downloadlistener;1"]
	  											.createInstance(Components.interfaces.nsIDownloadListener);
	  listener.init(file,tr);
	  persist.progressListener = listener;
	  persist.saveURI(xpiuri, null, null, null, null, fileuri);
	}
	else
	{
	}
},

accept: function()
{
	var check = document.getElementById("nightlyoverride");
	if (check.checked)
	{
		var itemList = document.getElementById("itemList");
		var items = itemList.getElementsByTagName("installitem");
		var urls = [];
		for (var i=0; i<items.length; i++)
		{
			NightlyXPInstall.startDownload(items[i].name,items[i].url);
		}

		return XPInstallConfirm.onCancel();
	}
	else
	{
		return XPInstallConfirm.onOK();
	}
}
}
