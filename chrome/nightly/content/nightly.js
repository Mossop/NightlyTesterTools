/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var nightly = {

variables: {
	appid: null,
	vendor: null,
	name: null,
	version: null,
	appbuildid: null,
	platformbuildid: null,
	platformversion: null,
	geckobuildid: null,
	geckoversion: null,
	brandname: null,
	useragent: navigator.userAgent,
	locale: null,
	os: null,
	processor: null,
	compiler: null
},

templates: {
},

preferences: null,

loadBuildIDFromFile: function()
{
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].
										getService(Components.interfaces.nsIFileInputStream);
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);

	var datafile = directoryService.get("ProfD",Components.interfaces.nsIFile);
	datafile.append("compatibility.ini");
	if (datafile.exists())
	{
		stream.init(datafile,1,384,Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
		stream.QueryInterface(Components.interfaces.nsILineInputStream);
	
		var line = { value: null };
		while (stream.readLine(line))
		{
			var bits = line.value.split("=");
			if (bits[0]=="Build ID")
			{
				return bits[1];
			}
			else if (bits[0]=="LastVersion")
			{
				bits=bits[1].split("_");
				return bits[bits.length-1];
			}
		}
	}
	return null;
},

versionCheck: function(version)
{
	nightly.preferences.setCharPref('lastversion',version);
},

init: function()
{	
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	nightly.preferences = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);
	prefservice=prefservice.QueryInterface(Components.interfaces.nsIPrefBranch);
	
	nightly.versionCheck('0.6.5');
	
	if (Components.classes['@mozilla.org/xre/app-info;1'])
	{
		var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
		nightly.variables.appid=appinfo.ID;
		nightly.variables.vendor=appinfo.vendor;
		nightly.variables.name=appinfo.name;
		nightly.variables.version=appinfo.version;
		nightly.variables.appbuildid=appinfo.appBuildID;
		
		if (appinfo.platformBuildID)
		{
			nightly.variables.platformbuildid=appinfo.platformBuildID;
			nightly.variables.platformversion=appinfo.platformVersion;
			nightly.variables.geckobuildid=appinfo.platformBuildID;
		}
		else
		{
			nightly.variables.geckobuildid=appinfo.geckoBuildID;
		}
		
		appinfo=appinfo.QueryInterface(Components.interfaces.nsIXULRuntime);
		nightly.variables.os=appinfo.OS;
		var bits=appinfo.XPCOMABI.split("-");
		nightly.variables.processor=bits[0];
		nightly.variables.compiler=bits[1];
	}
	else
	{
		try
		{
			nightly.variables.appid=prefservice.getCharPref('app.id');
			nightly.variables.version=prefservice.getCharPref('app.version');
		} catch (e) { }
		nightly.variables.vendor='Mozilla';
		nightly.variables.name=null;
		nightly.variables.appbuildid=nightly.loadBuildIDFromFile();
		nightly.variables.platformbuildid=nightly.variables.appbuildid;
		nightly.variables.geckobuildid=nightly.variables.appbuildid;
	}
	nightly.variables.locale=prefservice.getCharPref("general.useragent.locale");
	ua=nightly.variables.useragent;
	ua=ua.substring(ua.indexOf("rv:")+3,ua.indexOf(")"));
	nightly.variables.geckoversion=ua;

	if (!nightly.variables.platformversion)
	{
		nightly.variables.platformversion=nightly.variables.geckoversion;
	}

	nightlyApp.init();
	
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
					start=pos+2;
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
	if (element)
	{
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
				var macCheck = dir.clone();
				macCheck.append("Talkback.app");

				// nsProcess.init() doesn't know what to do with Mac OS X
				// application bundles, so dig down to the executable.
				// https://bugzilla.mozilla.org/show_bug.cgi?id=307463
				macCheck.append("Contents");
				macCheck.append("MacOS");
				macCheck.append("Talkback");
				
				// Don't check isExecutable() for Mac.
				// For some reason, it's false, but running it works anyway.
				if ((macCheck.exists()))
				{
					return macCheck;
				}

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
	var dir = null;
	
	// Firefox 1.5 location
	if (Components.classes["@mozilla.org/extensions/manager;1"])
	{
		var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"].
											getService(Components.interfaces.nsIExtensionManager);
	
		if (extensionManager.getInstallLocation)
		{
			var installloc = extensionManager.getInstallLocation("talkback@mozilla.org");
			if (installloc)
			{
				dir = installloc.getItemLocation("talkback@mozilla.org");
				if (dir)
				{
					var talkback=nightly.findTalkbackInDir(dir);
					if (talkback)
					{
						return talkback;
					}
				}
			}
		}
	}

	// Firefox 1.0 location
	// (before the fix for https://bugzilla.mozilla.org/show_bug.cgi?id=299040)
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);
	dir = directoryService.get("CurProcD",Components.interfaces.nsIFile);
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
},

launchOptions: function()
{
	openDialog("chrome://nightly/content/options.xul", "", "chrome,titlebar,toolbar,centerscreen,modal");
}

}

window.addEventListener("load",nightly.init,false);
