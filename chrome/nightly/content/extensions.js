/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var extensionAppEnabler = {

addInArray: function(menus,item,before,after)
{
	var temp = [];
	var shift=0;
	var added=false;
	for (var i = 0; i < menus.length; i++)
	{
		if (menus[i]==before)
		{
			temp[i+shift]=item;
			added=true;
			shift++;
		}
		temp[i+shift]=menus[i];
		if (menus[i]==after)
		{
			shift++;
			temp[i+shift]=item;
			added=true;
		}
	}
	if (!added)
	{
		temp[i+shift]=item;
	}
	return temp;
},

init: function()
{
	gExtensionContextMenus=extensionAppEnabler.addInArray(gExtensionContextMenus,"menuitem_appenable","menuseparator_2",null);
	gThemeContextMenus=extensionAppEnabler.addInArray(gThemeContextMenus,"menuitem_appenable",null,"menuitem_enable");
},

load: function()
{
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	var prefs = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);
	  
	document.getElementById("enableallButton").setAttribute("hidden",!prefs.getBoolPref("showEnableAll"));
	
	document.getElementById("extensionContextMenu").addEventListener("popupshowing",extensionAppEnabler.popupShowing,false);
},

isCompatible: function(id)
{
	var em = Components.classes["@mozilla.org/extensions/manager;1"]
							.getService(Components.interfaces.nsIExtensionManager);
  var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
  											.getService(Components.interfaces.nsIRDFService);
	var vc = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
  
  var ds = em.datasource;
  var extension = rdfService.GetResource(id);
  var compatprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#compatible");
  var compatible = ds.GetTarget(extension,compatprop,true);
  if (compatible)
  {
    compatible=compatible.QueryInterface(Components.interfaces.nsIRDFLiteral)
	  return (compatible.Value=="true");
  }
  return true;
},

makeCompatible: function(id,app,version)
{
	var em = Components.classes["@mozilla.org/extensions/manager;1"]
							.getService(Components.interfaces.nsIExtensionManager);
  var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
  											.getService(Components.interfaces.nsIRDFService);
	var changed=false;
	var idprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#id");
	var targappprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#targetApplication");
	var minprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#minVersion");
	var maxprop = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#maxVersion");

	var vc = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
	var ds = em.datasource;
	var extension = rdfService.GetResource(id);
	var targets = ds.GetTargets(extension,targappprop,true);
	while (targets.hasMoreElements())
	{
		var targapp = targets.getNext();
		var targid = ds.GetTarget(targapp,idprop,true).QueryInterface(Components.interfaces.nsIRDFLiteral);
		if (targid.Value==app)
		{
  		var targmin = ds.GetTarget(targapp,minprop,true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  		if (vc.compare(version,targmin.Value)<0)
  		{
	  		var newtargmin = rdfService.GetLiteral(version);
	  		ds.Change(targapp,minprop,targmin,newtargmin);
	  		changed=true;
	  	}
  		var targmax = ds.GetTarget(targapp,maxprop,true).QueryInterface(Components.interfaces.nsIRDFLiteral);
  		if (vc.compare(version,targmax.Value)>0)
  		{
	  		var newtargmax = rdfService.GetLiteral(version);
	  		ds.Change(targapp,maxprop,targmax,newtargmax);
	  		changed=true;
	  	}
  	}
	}
	if (changed)
	{
    ds.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
    ds.Flush();
		em.enableItem(getIDFromResourceURI(id));
	}
	return changed;
},

popupShowing: function(event)
{
	var item = document.getElementById("extensionsView").selectedItem;
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
    var ev = document.getElementById("extensionsView");
		var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
		var item = ev.selectedItem;
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
			ev.selectedItem = document.getElementById(item.id);
		}
	}
},

enableAll: function()
{
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
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
	
	var confirmed=false;
	
  var ev = document.getElementById("extensionsView");
  var count = ev.getRowCount();
  for (var i=0; i<count; i++)
  {
    var item = ev.getItemAtIndex(i);
    dump(item.id+"\n");
    if (!extensionAppEnabler.isCompatible(item.id))
    {
      if (!confirmed)
      {
        confirmed=extensionAppEnabler.confirmChange();
        if (!confirmed)
          return;
      }
      extensionAppEnabler.makeCompatible(item.id,appinfo.ID,version);
    }
  }
 	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
									.getService(Components.interfaces.nsIStringBundleService);
	var bundle = sbs.createBundle("chrome://nightly/locale/nightly.properties");
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
  var text;
  if (!confirmed)
  {
    text=bundle.GetStringFromName("nightly.noincompatible.message");
  }
  else
  {
    text=bundle.GetStringFromName("nightly.madecompatible.message");
  }
  promptService.alert(null,"Nightly Tester Tools",text);
}

}

extensionAppEnabler.init();

window.addEventListener("load",extensionAppEnabler.load,false);
