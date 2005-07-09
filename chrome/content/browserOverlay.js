/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var nightly = {

variables: {
	vendor: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).vendor,
	name: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).name,
	version: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).version,
	appbuildid: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).appBuildID,
	geckobuildid: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).geckoBuildID,
	brandname: document.documentElement.getAttribute("titlemodifier"),
	useragent: navigator.userAgent
},

templates: {
},

preferences: null,

init: function()
{
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	nightly.preferences = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);
	nightly.preferences.addObserver("",nightly,false);
	nightly.prefChange("idtitle");
},

prefChange: function(pref)
{
	if ((pref=="idtitle")||(pref=="templates.title"))
	{
		if (nightly.preferences.getBoolPref("idtitle"))
		{
			nightlyApp.setCustomTitle(nightly.generateText(nightly.getTemplate("title")));
		}
		else
		{
			nightlyApp.setStandardTitle();
		}
	}
},

observe: function(prefBranch, subject, pref)
{
	nightly.prefChange(pref);
},

getStoredItem: function(type,name)
{
	name=name.toLowerCase();
	var varvalue = null;
	try
	{
		varvalue = nightly.preferences.getCharPref(type+"."+name);
	}
	catch (e) {}
	if (!varvalue)
	{
		varvalue = nightly[type][name];
	}
	/*else
	{
		try
		{
			varvalue = eval(varvalue);
		}
		catch () { }
	}*/
	return varvalue;
},

getVariable: function(name)
{
	return nightly.getStoredItem("variables",name);
},

getTemplate: function(name)
{
	return nightly.getStoredItem("templates",name);
},

generateText: function(template)
{
	var start=0;
	var pos = template.indexOf("${",start);
	while (pos>=0)
	{
		if ((pos==0)||(template.charAt(pos-1)!="$"))
		{
			var endpos = template.indexOf("}",pos+2);
			if (endpos>=0)
			{
				var varname = template.substring(pos+2,endpos);
				var varvalue = nightly.getVariable(varname);
				if (varvalue)
				{
					template=template.substring(0,pos)+varvalue+template.substring(endpos+1,template.length);
					start=pos+varvalue.length;
				}
				else
				{
					start=endpos+1;
				}
			}
			else
			{
				start=pos+2;
			}
		}
		else
		{
			start=pos+2;
		}
		pos=template.indexOf("${",start);
	}
	return template;
},

copyText: function(text)
{
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(text);
},

copyTemplate: function(template)
{
	nightly.copyText(nightly.generateText(nightly.getTemplate(template)));
},

insertTemplate: function(template)
{
	var element = document.commandDispatcher.focusedElement;
	var type = element.localName.toLowerCase();
	if ((type=="input")||(type=="textarea"))
	{
		var text = nightly.generateText(nightly.getTemplate(template));
		var newpos = element.selectionStart+text.length;
		var value = element.value;
		element.value=value.substring(0,element.selectionStart)+text+value.substring(element.selectionEnd);
		element.selectionStart=newpos;
		element.selectionEnd=newpos;
	}
	else
	{
		alert("You must select a text box before using this function.");
	}
},

launch: function(file, args)
{
	var process = Components.classes["@mozilla.org/process/util;1"].
										createInstance(Components.interfaces.nsIProcess);
	process.init(file);
	if (args)
	{
		process.run(false,args,args.length);
	}
	else
	{
		process.run(false,null,0);
	}
},

alertType: function(type)
{
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);

	var dir = directoryService.get(type,Components.interfaces.nsIFile);
	alert(dir.path);
},

findTalkbackInDir: function(dir)
{
	dir.append("components");
	
	if (dir.exists())
	{
		var winCheck = dir.clone();
		winCheck.append("talkback.exe");
		
		if ((winCheck.exists()) && (winCheck.isExecutable()))
		{
			return winCheck;
		}
		else
		{
			dir.append("talkback");
			if (dir.exists())
			{
				dir.append("talkback");
				if ((dir.exists()) && (dir.isExecutable()))
				{
					return dir;
				}
			}
		}
	}
	return null;
},

findTalkback: function()
{	
	var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"].
										getService(Components.interfaces.nsIExtensionManager);
	var installloc = extensionManager.getInstallLocation("talkback@mozilla.org");
	if (installloc)
	{
		var dir = installloc.getItemLocation("talkback@mozilla.org");
		if (dir)
		{
			var talkback=nightly.findTalkbackInDir(dir);
			if (talkback)
			{
				return talkback;
			}
		}
	}

	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);
	var dir = directoryService.get("CurProcD",Components.interfaces.nsIFile);
	return nightly.findTalkbackInDir(dir);
},

launchTalkback: function()
{
	var talkback = nightly.findTalkback();
	if (talkback)
	{
		nightly.launch(talkback,null);
	}
	else
	{
		alert("Could not find talkback. Perhaps it isn't installed.");
	}
}

}

window.addEventListener("load",nightly.init,false);
