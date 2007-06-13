// -*- js-var:Components,document,window,navigator,Cc,Ci,nightlyApp,talkback,gBrowser -*-
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Nightly Tester Tools.
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
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
	compiler: null,
	defaulttitle: null,
	profile: null,
	toolkit: "Unknown",
	flags: null
},

templates: {
},

preferences: null,

showAlert: function(id,args)
{
 	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
									    .getService(Components.interfaces.nsIStringBundleService);
	var bundle = sbs.createBundle("chrome://nightly/locale/nightly.properties");
	var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
  var text=bundle.formatStringFromName(id,args,args.length);
  promptService.alert(null,"Nightly Tester Tools",text);
},

getProfileRegistry: function()
{
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										               .getService(Components.interfaces.nsIProperties);

	var dir = directoryService.get("DefProfRt",Components.interfaces.nsIFile);
	while (dir)
	{
		var file = dir.clone();
		file.append("profiles.ini");
		if (file.exists())
			return file;
		dir = dir.parent;
	}
	return null;
},

getProfileName: function()
{
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										               .getService(Components.interfaces.nsIProperties);
	var profd = directoryService.get("ProfD",Components.interfaces.nsIFile);
	
	var name = profd.leafName;

	var reg = nightly.getProfileRegistry();
	if (!reg)
		return name;
	
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
	                       .createInstance(Components.interfaces.nsIFileInputStream);
	stream.init(reg, 1, 0, 0);
	stream.QueryInterface(Components.interfaces.nsILineInputStream);
	
	var dir = Components.classes["@mozilla.org/file/local;1"]
	                    .createInstance(Components.interfaces.nsILocalFile);
	var current = "";
	var relative = "d";
	var line = {};
	while (stream.readLine(line))
	{
		if (line.value.substring(0,5)=="Name=")
			current = line.value.substring(5);
		if (line.value.substring(0,11)=="IsRelative=")
			relative = line.value.substring(11);
		if (line.value.substring(0,5)=="Path=")
		{
			var path = line.value.substring(5);
			if (relative=="1")
				dir.setRelativeDescriptor(reg.parent, path);
			else
				dir.persistentDescriptor = path;
			if (dir.path==profd.path)
			{
				name=current;
				break;
			}
		}
	}
	
	stream.close();
	return name;
},

defineFlags: function()
{
	var flags = "";
	/*if (nightly.variables.toolkit && nightly.variables.toolkit == "cairo")
	{
		flags+=" [cairo]";
	}*/
	
	nightly.variables.flags = flags;
},

loadGfxToolkit: function()
{
	if (Components.classes["@mozilla.org/gfx/region/nsThebes;1"])
	{
		nightly.variables.toolkit = "cairo";
	}
	else
	{
		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
											               .getService(Components.interfaces.nsIProperties);
	
		var datafile = directoryService.get("AChrom",Components.interfaces.nsIFile);
		datafile.append("toolkit.jar");
		var reader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
		                       .createInstance(Components.interfaces.nsIZipReader);
		if (reader.init)
		{
	  	reader.init(datafile);
	  	reader.open();
	  }
	  else
	    reader.open(datafile);
		var stream = reader.getInputStream("content/global/buildconfig.html");
		var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
		                        .createInstance(Components.interfaces.nsIScriptableInputStream);
		sstream.init(stream);
		var content = "";
		var text = sstream.read(1024);
		while (text.length>0)
		{
			content+=text;
			text = sstream.read(1024);
		}
		var result = content.match(/--enable-default-toolkit=(\S+)/);
		if (result)
		{
			nightly.variables.toolkit = result[1];
		}
		sstream.close();
		stream.close();
		reader.close();
	}
},

loadBuildIDFromFile: function()
{
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
										     .createInstance(Components.interfaces.nsIFileInputStream);
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										               .getService(Components.interfaces.nsIProperties);

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

init: function()
{	
  window.removeEventListener("load",nightly.init,false);
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							                .getService(Components.interfaces.nsIPrefService);
	nightly.preferences = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);
	prefservice=prefservice.QueryInterface(Components.interfaces.nsIPrefBranch);
	
	if ((Components.classes['@mozilla.org/xre/app-info;1'])&&(Components.interfaces.nsIXULAppInfo))
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
		
		if (Components.interfaces.nsIXULRuntime)
		{
  		appinfo=appinfo.QueryInterface(Components.interfaces.nsIXULRuntime);
  		nightly.variables.os=appinfo.OS;
  		var bits=appinfo.XPCOMABI.split("-");
  		nightly.variables.processor=bits[0];
  		nightly.variables.compiler=bits[1];
		}
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

  try {
    nightly.variables.locale = prefservice.getComplexValue("general.useragent.locale",
                        Components.interfaces.nsIPrefLocalizedString).data;
  }
  catch (e)
  {
    nightly.variables.locale = prefservice.getCharPref("general.useragent.locale");
  }
	var ua=nightly.variables.useragent;
	ua=ua.substring(ua.indexOf("rv:")+3,ua.indexOf(")"));
	nightly.variables.geckoversion=ua;

	if (!nightly.variables.platformversion)
	{
		nightly.variables.platformversion=nightly.variables.geckoversion;
	}

	if (nightly.preferences.getBoolPref("disablecompatibility"))
	{
		if (prefservice.prefHasUserValue("extensions.lastAppVersion"))
			prefservice.clearUserPref("extensions.lastAppVersion");
	}
	else
	{
		prefservice.setCharPref("extensions.lastAppVersion", nightly.variables.version);
	}
	
	nightly.variables.profile = nightly.getProfileName();
		
	nightly.loadGfxToolkit();
	
	nightly.defineFlags();
	
	nightlyApp.init();
	
	nightly.preferences.addObserver("",nightly,false);
	nightly.prefChange("idtitle");
},

unload: function(pref)
{
  window.removeEventListener("unload",nightly.unload,false);
  nightly.preferences.removeObserver("",nightly);
},

prefChange: function(pref)
{
	if ((pref=="idtitle")||(pref=="templates.title"))
	{
		if (nightly.preferences.getBoolPref("idtitle"))
		{
		  var title = nightly.getTemplate("title");
		  if (title && title.length>0)
  			nightlyApp.setCustomTitle(nightly.generateText(title));
  	  else
  	    nightlyApp.setBlankTitle();
		}
		else
		{
			nightlyApp.setStandardTitle();
		}
	}
	else if (pref=="disablecompatibility")
	{
		var prefservice = Components.classes['@mozilla.org/preferences-service;1']
								                .getService(Components.interfaces.nsIPrefBranch);

		if (nightly.preferences.getBoolPref(pref))
		{
			if (prefservice.prefHasUserValue("extensions.lastAppVersion"))
				prefservice.clearUserPref("extensions.lastAppVersion");
		}
		else
		{
			prefservice.setCharPref("extensions.lastAppVersion", nightly.variables.version);
		}
	}
	else if (pref.substring(0,20)=="talkback.recentlist.")
	{
		talkback.init();
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
				if (varvalue!==null)
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

menuPopup: function(event, menupopup)
{
	if (menupopup==event.target)
	{
		var attext = false;
		
		var element = document.commandDispatcher.focusedElement;
		if (element)
		{
			var type = element.localName.toLowerCase();
			attext= ((type=="input")||(type=="textarea"))
		}
			
		var node=menupopup.firstChild;
		while (node && node.localName!='menuseparator')
		{
			if (node.id.substring(node.id.length-7)=="-insert")
				node.hidden=!attext;
			if (node.id.substring(node.id.length-5)=="-copy")
				node.hidden=attext;
			node=node.nextSibling;
		}
	}
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
			return;
		}
	}
	nightly.showAlert("nightly.notextbox.message",[]);
},

insensitiveSort: function(a, b)
{
	a = a.toLowerCase();
	b = b.toLowerCase();
	if (a < b)
		return -1
	if (a > b)
		return 1
	// a must be equal to b
	return 0
},

getExtensionList: function()
{
	var em = Components.classes["@mozilla.org/extensions/manager;1"]
										 .getService(Components.interfaces.nsIExtensionManager);
										 
	var items = em.getItemList(Components.interfaces.nsIUpdateItem.TYPE_EXTENSION, {});

	if (items.length==0)
	{
		window.alert("No extensions were found.");
		return null;
	}
	else
	{
		var rdfS = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
		var ds = em.datasource;
		var disabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#disabled");
		var isDisabledResource = rdfS.GetResource("http://www.mozilla.org/2004/em-rdf#isDisabled");
		var text = [];
		for (var i=0; i<items.length; i++)
		{
			text[i] = items[i].name+" "+items[i].version;
			var source = rdfS.GetResource("urn:mozilla:item:"+items[i].id);
			var disabled = ds.GetTarget(source, disabledResource, true);
			if (!disabled)
			  disabled = ds.GetTarget(source, isDisabledResource, true);
			try
			{
				disabled=disabled.QueryInterface(Components.interfaces.nsIRDFLiteral);
				if (disabled.Value=="true")
				{
					text[i]+=" [DISABLED]";
				}
			}
			catch (e) { }
		}
		text.sort(nightly.insensitiveSort);
		return text.join("\n");
	}
},

insertExtensions: function()
{
	var element = document.commandDispatcher.focusedElement;
	if (element)
	{
		var type = element.localName.toLowerCase();
		if ((type=="input")||(type=="textarea"))
		{
			var text = nightly.getExtensionList();
			var newpos = element.selectionStart+text.length;
			var value = element.value;
			element.value=value.substring(0,element.selectionStart)+text+value.substring(element.selectionEnd);
			element.selectionStart=newpos;
			element.selectionEnd=newpos;
			return;
		}
	}
	nightly.showAlert("nightly.notextbox.message",[]);
},

copyExtensions: function()
{
	var text = nightly.getExtensionList();
	if (text)
		nightly.copyText(text);
},

openProfileDir: function()
{
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
										     .createInstance(Components.interfaces.nsIFileInputStream);
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										               .getService(Components.interfaces.nsIProperties);

	var profile = directoryService.get("ProfD",Components.interfaces.nsILocalFile);
  try
  {
    profile.reveal();
  }
  catch (ex)
  {
	  var uri = Components.classes["@mozilla.org/network/io-service;1"]
	                      .getService(Components.interfaces.nsIIOService)
	                      .newFileURI(profile);
	  var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
	                              .getService(Components.interfaces.nsIExternalProtocolService);
	  protocolSvc.loadUrl(uri);
  }
},

launch: function(file, args)
{
	var process = Components.classes["@mozilla.org/process/util;1"]
										.createInstance(Components.interfaces.nsIProcess);
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
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										       .getService(Components.interfaces.nsIProperties);

	var dir = directoryService.get(type,Components.interfaces.nsIFile);
	window.alert(dir.path);
},

getScreenshot: function()
{
	window.openDialog("chrome://nightly/content/screenshot/screenshot.xul", "_blank", "chrome,all,dialog=no");
},

launchOptions: function()
{
	window.openDialog("chrome://nightly/content/options.xul", "", "chrome,titlebar,toolbar,centerscreen,modal");
}

}

window.addEventListener("load",nightly.init,false);
window.addEventListener("unload",nightly.unload,false);
