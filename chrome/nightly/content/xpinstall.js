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
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
  xpiuri=ioService.newURI(url,null,null);
  
  var nightlyService = Components.classes["@blueprintit.co.uk/nightlytools;1"]
                            .getService(Components.interfaces.nsINightlyToolsService);
  nightlyService.installExtension(name,xpiuri);
},

accept: function()
{
	var check = document.getElementById("nightlyoverride");
	if ((check)&&(check.checked))
	{
		var itemList = document.getElementById("itemList");
		var items = itemList.getElementsByTagName("installitem");
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
