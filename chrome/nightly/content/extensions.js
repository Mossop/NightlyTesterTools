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

addInArray: function(menus,item,before)
{
	var temp = [];
	var shift=0;
	for (var i = 0; i < menus.length; i++)
	{
		if (menus[i]==before)
		{
			temp[i+shift]=item;
			shift++;
		}
		temp[i+shift]=menus[i];
	}
	return temp;
},

init: function()
{
	gRDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                   .getService(Components.interfaces.nsIRDFService);

	gExtensionContextMenus=extensionAppEnabler.addInArray(gExtensionContextMenus,"menuitem_appenable","menuseparator_2");
	gThemeContextMenus=extensionAppEnabler.addInArray(gThemeContextMenus,"menuitem_appenable","menuseparator_3");
	
	document.getElementById("extensionContextMenu").addEventListener("popupshowing",extensionAppEnabler.popupShowing,false);
},

isCompatible: function(id)
{
	if (gExtensionManager)
	{
		var vc = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
	  	var ds = gExtensionManager.datasource;
	  	var extension = gRDF.GetResource(id);
	  	var compatible = ds.GetTarget(extension,EM_R("compatible"),true).QueryInterface(Components.interfaces.nsIRDFLiteral);
	  	return (compatible.Value=="true");
	}
	else
	{
		return true;
	}
},

makeCompatible: function(id,app,version)
{
	var result=false;
	if (gExtensionManager)
	{
		var vc = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
	  	var ds = gExtensionManager.datasource;
	  	var extension = gRDF.GetResource(id);
	  	var targets = ds.GetTargets(extension,EM_R("targetApplication"),true);
	  	while (targets.hasMoreElements())
	  	{
	  		var targapp = targets.getNext();
	  		var targid = ds.GetTarget(targapp,EM_R("id"),true).QueryInterface(Components.interfaces.nsIRDFLiteral);
	  		if (targid.Value==app)
	  		{
		  		var targmin = ds.GetTarget(targapp,EM_R("minVersion"),true).QueryInterface(Components.interfaces.nsIRDFLiteral);
		  		if (vc.compare(version,targmin.Value)<0)
		  		{
			  		var newtargmin = gRDF.GetLiteral(version);
			  		ds.Change(targapp,EM_R("minVersion"),targmin,newtargmin);
			  		result=true;
			  	}
		  		var targmax = ds.GetTarget(targapp,EM_R("maxVersion"),true).QueryInterface(Components.interfaces.nsIRDFLiteral);
		  		if (vc.compare(version,targmax.Value)>0)
		  		{
			  		var newtargmax = gRDF.GetLiteral(version);
			  		ds.Change(targapp,EM_R("maxVersion"),targmax,newtargmax);
			  		result=true;
			  	}
		  	}
	  	}
	  	if (result)
	  	{
            ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
            ds.Flush();
			gExtensionManager.enableItem(getIDFromResourceURI(id));
	  	}
	}
	else
	{
		dump("No extension manager\n");
		return false;
	}
	return result;
},

popupShowing: function(event)
{
	var item = gExtensionsView.selectedItem;
	var menu = document.getElementById("menuitem_appenable");
	var menuclone = document.getElementById("menuitem_appenable_clone");
	menu.hidden=extensionAppEnabler.isCompatible(item.id);
	if (menuclone)
		menuclone.hidden=menu.hidden;		
},

confirmChange: function()
{
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
						.getService(Components.interfaces.nsIPrefBranch);

	if (prefservice.getBoolPref("nightly.showExtensionConfirm"))
	{
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
	                    .getService(Components.interfaces.nsIPromptService);
	    
	    var checkResult = { };
	    
	    var bundle = document.getElementById("nightlylocale");
	    
	    if (promptService.confirmCheck(window,bundle.getString("nightly.confirm.title"),
	    	bundle.getString("nightly.confirm.description"),
	    	bundle.getString("nightly.confirm.checkbox"),
	  		checkResult))
		{
		  	prefservice.setBoolPref("nightly.showExtensionConfirm",!checkResult.value);
			return true;
		}
		else
		{
			return false;
		}	  	
  	}
  	else
  	{
  		return true;
  	}
},

appEnable: function()
{
	if (extensionAppEnabler.confirmChange())
	{
		var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
		var item = gExtensionsView.selectedItem;
		var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefBranch);
		
		var version = appinfo.version;
		try
		{
			version=prefservice.getCharPref("app.extensions.version");
			if (!version)
				version=appinfo.version;
		}
		catch (e) { }
		
		if (extensionAppEnabler.makeCompatible(item.id,appinfo.ID,version))
		{
			gExtensionsView.selectedItem = document.getElementById(item.id);
		}
	}
}

}

extensionAppEnabler.init();
