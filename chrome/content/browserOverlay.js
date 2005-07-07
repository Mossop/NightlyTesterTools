var nightly = {

preferences: Components.classes["@mozilla.org/preferences-service;1"].
                   	getService(Components.interfaces.nsIPrefService).getBranch("extensions.nightlytools."),

variables: {
	BUILDID: Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo).geckoBuildID,
	USERAGENT: navigator.userAgent
},

templates: {
	BUILD: "${UserAgent} ID:${BuildID}"
},

getStoredItem: function(type,name)
{
	name=name.toUpperCase();
	var varvalue = null;
	try
	{
		varvalue = nightly.preferences.getCharPref(type+"."+name);
	}
	catch (e) {}
	if (!varvalue)
	{
		varvalue = eval("nightly."+type+"."+name);
	}
	else
	{
		varvalue = eval(varvalue);
	}
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
		}
		else
		{
			start=pos+2;
		}
		pos=template.indexOf("${",start);
	}
	return template;
},

copyText: function(template)
{
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(nightly.generateText(template));
},

copyTemplate: function(name)
{
	nightly.copyText(nightly.getTemplate(name));
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
	/*var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"].
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
	}*/

	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);
	var dir = directoryService.get("CurProcD",Components.interfaces.nsIFile);
	
	var extensions = dir.clone();
	extensions.append("extensions");
	extensions.append("talkback@mozilla.org");
	var talkback=nightly.findTalkbackInDir(extensions);
	if (talkback)
	{
		return talkback;
	}

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
