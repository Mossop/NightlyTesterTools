/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var NightlyXPInstall = {

accept: function()
{
	var check = document.getElementById("nightlyoverride");
	if ((check)&&(check.checked))
	{
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);
    var nightlyService = Components.classes["@blueprintit.co.uk/nightlytools;1"]
                              .getService(Components.interfaces.nsINightlyToolsService);

		var itemList = document.getElementById("itemList");
		var items = itemList.getElementsByTagName("installitem");
		for (var i=0; i<items.length; i++)
		{
      var xpiuri=ioService.newURI(items[i].url,null,null);
		  nightlyService.queueInstall(items[i].name,xpiuri);
		}
		nightlyService.performInstalls();

		return XPInstallConfirm.onCancel();
	}
	else
	{
		return XPInstallConfirm.onOK();
	}
}
}
