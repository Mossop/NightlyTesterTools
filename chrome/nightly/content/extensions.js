/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var gRDF = null;
const PREFIX_NS_EM                    = "http://www.mozilla.org/2004/em-rdf#";
const PREFIX_NS_CHROME                = "http://www.mozilla.org/rdf/chrome#";

function EM_NS(property)
{
  return PREFIX_NS_EM + property;
}

function CHROME_NS(property)
{
  return PREFIX_NS_CHROME + property;
}

function EM_R(property)
{
  return gRDF.GetResource(EM_NS(property));
}

var extensionAppEnabler = {

init: function()
{
	gRDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                   .getService(Components.interfaces.nsIRDFService);
	var temp = [];
	var shift=0;
	var menus = gExtensionContextMenus;
	for (var i = 0; i < menus.length; i++)
	{
		if (menus[i]=="menuseparator_2")
		{
			temp[i+shift]="menuitem_appenable";
			shift++;
		}
		temp[i+shift]=menus[i];
	}
	gExtensionContextMenus=temp;
},

makeMaxVersion: function(id,app,version)
{
	if (gExtensionManager)
	{
	  	var ds = gExtensionManager.datasource;
	  	var extension = gRDF.GetResource(id);
	  	var targets = ds.GetTargets(extension,EM_R("targetApplication"),true);
	  	while (targets.hasMoreElements())
	  	{
	  		var targapp = targets.getNext();
	  		var targid = ds.GetTarget(targapp,EM_R("id"),true);
	  		var targmax = ds.GetTarget(targapp,EM_R("maxVersion"),true);
	  		dump("Maxversion for "+targapp.Value+" is "+targmax.Value+"\n");
	  	}
	}
	else
	{
		dump("No extension manager\n");
	}
},

appEnable: function()
{
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	var item = gExtensionsView.selectedItem;
	extensionAppEnabler.makeMaxVersion(item.id,appinfo.ID,appinfo.version);
	gExtensionManager.enableItem(getIDFromResourceURI(item.id));
	gExtensionsView.selectedItem = document.getElementById(item.id);
}

}

extensionAppEnabler.init();
