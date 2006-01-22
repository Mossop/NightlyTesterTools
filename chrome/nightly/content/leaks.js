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
 * The Original Code is leak-gauge.pl
 *
 * The Initial Developer of the Original Code is the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   L. David Baron <dbaron@dbaron.org>, Mozilla Corporation (original author)
 *   Dave Townsend <dave.townsend@blueprintit.co.uk>.
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

var handlers = {
  "DOMWINDOW": {
		count: 0,
		leaked: 0,
    windows: {},
    handle_line: function(addr,verb,rest,para) {
	    if (verb == "created") {
	    	if (rest.substring(1,6)!="outer")
	        throw "outer expected";
	      var out = rest.substring(7);
	      this.windows[addr] = { outer: out, paras: [], uris: [] };
	      ++this.count;
	      ++this.leaked;
	      if (para)
			    this.windows[addr].paras.push(para);
	    } else if (verb == "destroyed") {
	      delete this.windows[addr];
	      --this.leaked;
	    } else if (verb == "SetNewDocument") {
	    	var uri = rest.substring(1);
	      this.windows[addr].uris[uri] = true;
	      if (para)
				  this.windows[addr].paras.push(para);
	    }
		},
	  mark_leaks: function(addr)
	  {
      for (var i=0; i<this.windows[addr].paras.length; i++) {
      	this.windows[addr].paras[i].className+=" leaked";
      }
	  },
		clear: function()
		{
			this.count=0;
			this.leaked=0;
			this.windows={};
		}
	},
	"DOCUMENT": {
	  count: 0,
	  leaked: 0,
	  docs: {},
	  handle_line: function(addr,verb,rest,para) {
	    if (verb == "created") {
	      this.docs[addr] = { paras: [], uris: [] };
	      ++this.count;
	      ++this.leaked;
	      if (para)
			    this.docs[addr].paras.push(para);
	    } else if (verb == "destroyed") {
	      delete this.docs[addr];
	      --this.leaked;
	    } else if (verb == "ResetToURI" ||
	               verb == "StartDocumentLoad") {
	      var uri = rest.substring(1);
	      this.docs[addr].uris[uri] = true;
	      if (para)
				  this.docs[addr].paras.push(para);
	    }
	  },
	  mark_leaks: function(addr)
	  {
      for (var i=0; i<this.docs[addr].paras.length; i++) {
      	var para = this.docs[addr].paras[i].className+=" leaked";
      }
	  },
		clear: function()
		{
			this.count=0;
			this.leaked=0;
			this.docs={};
		}
	},
	"DOCSHELL": {
    count: 0,
    leaked: 0,
    shells: {},
    handle_line: function(addr,verb,rest,para) {
		  if (verb == "created") {
				this.shells[addr] = { paras: [], uris: [] };
			  ++this.count;
			  ++this.leaked;
			  if (para)
				  this.shells[addr].paras.push(para);
			} else if (verb == "destroyed") {
				delete this.shells[addr];
				--this.leaked;
			} else if (verb == "InternalLoad" ||
	               verb == "SetCurrentURI") {
	      var uri = rest.substring(1);
				this.shells[addr].uris[uri] = true;
				if (para)
			  	this.shells[addr].paras.push(para);
			}
	  },
	  mark_leaks: function(addr)
	  {
      for (var i=0; i<this.shells[addr].paras.length; i++) {
      	var para = this.shells[addr].paras[i].className+=" leaked";
      }
	  },
		clear: function()
		{
			this.count=0;
			this.leaked=0;
			this.shells={};
		}
	},
	clear: function()
	{
		this["DOMWINDOW"].clear();
		this["DOCUMENT"].clear();
		this["DOCSHELL"].clear();
	}
};

function doParse(storelog)
{
	var start = Date.now();
	handlers.clear();
	
	var fulllog = document.getElementById("logframe").contentDocument.body;
	var datelbl = document.getElementById("date");
	var date = new Date(nsprlog.lastModifiedTime);
	datelbl.value=date.toLocaleString();

	var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
	                   .createInstance(Components.interfaces.nsIFileInputStream);
	const PR_RDONLY = 0x01;
	is.init(nsprlog, PR_RDONLY, 0, 0);
	if (!(is instanceof Components.interfaces.nsILineInputStream))
	  return;
	var line = { value: "" };
	var lines=0;
	var start = Date.now();
	var paratimes = 0;
	var para = null;
	do
	{
		lines++;
    var more = is.readLine(line); // yuck, returns false for last valid line

		var time = Date.now();
		var className="";
    if (storelog)
    {
	    para = fulllog.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","p");
	    fulllog.appendChild(para);
	    para.appendChild(document.createTextNode(line.value));
	    className="logline";
	  }
		paratimes+=Date.now()-time;
		
    // strip off initial "-", thread id, and thread pointer; separate
    // first word and rest
    var matches = line.value.match(/^\-?[0-9]*\[[0-9a-f]*\]: (\S*) ([0-9a-f]*) (\S*)(.*)$/);
    if (matches) {
	    var handler = matches[1];
	    var address = matches[2];
	    var verb = matches[3];
	    className+=" "+handler+" "+address;
	    var data = matches[4];
	    if (typeof(handlers[handler]) != "undefined") {
	      handlers[handler].handle_line(address,verb,data,para);
	    }
	    else
	    {
	    	
	    	className+=" ignored";
	    }
    }
    else
    {
    	className+=" ignored";
    }
    if (storelog)
    	para.className=className;
	} while (more);
	var time = Date.now()-start;
	dump(time+" "+(time/lines)+"\n");
	dump("Document: "+paratimes+"\n");
	
	var details = document.getElementById("details");
	var leaked=false;
	
	var lbl = document.getElementById("windowLeaks");
	var handler = handlers["DOMWINDOW"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" DOM Windows";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	else
	{
		lbl.className="";
	}
	for (var addr in handler.windows)
	{
		handler.mark_leaks(addr);
		var winobj = handler.windows[addr];
		lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
		details.appendChild(lbl);
		lbl.value="Leaked " + (winobj.outer=="0" ? "outer" : "inner") +
					    " window "+addr+" "+
					    (winobj.outer=="0" ? "" : "(outer " + winobj.outer + ") ") +
        	    "at address " + addr + ".";
	  for (var uri in winobj.uris)
	  {
			lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
			details.appendChild(lbl);
	  	lbl.value="with URI \"" + uri + "\".";
	  	lbl.className="uri";
	  }
	}
	dump(Date.now()-start+"\n");

	lbl = document.getElementById("documentLeaks");
	handler = handlers["DOCUMENT"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" documents";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	else
	{
		lbl.className="";
	}
	for (var addr in handler.docs)
	{
		handler.mark_leaks(addr);
		var doc = handler.docs[addr];
		lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
		details.appendChild(lbl);
	  lbl.value="Leaked document at address " + addr + ".";
	  for (var uri in doc.uris)
	  {
			lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
			details.appendChild(lbl);
	    lbl.value="with URI \"" + uri + "\".";
	  	lbl.className="uri";
	  }
	}
	dump(Date.now()-start+"\n");

	lbl = document.getElementById("docshellLeaks");
	handler = handlers["DOCSHELL"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" docshells";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	else
	{
		lbl.className="";
	}
	for (var addr in handler.shells)
	{
		handler.mark_leaks(addr);
		var doc = handler.shells[addr];
		lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
		details.appendChild(lbl);
	  lbl.value="Leaked docshell at address " + addr + ".";
	  for (var uri in doc.uris)
	  {
			lbl = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","label");
			details.appendChild(lbl);
	    lbl.value="with URI \"" + uri + "\".";
	  	lbl.className="uri";
	  }
	}
	dump(Date.now()-start+"\n");
	
	document.getElementById("detailsbox").collapsed=!leaked;
}
// --------------------------------------------------------------------

var nsprlog = null;
var preferences = null;

var summaryText = "";
var detailsText = "";
var logValid = false;

function frameLoaded(event)
{
	var chk = document.getElementById("showlog");

	var frame = document.getElementById("logframe");
	if (frame.getAttribute("src")=="")
		return;

	changeFilter();
	
	var details = document.getElementById("details");
	while (details.firstChild)
	{
		details.removeChild(details.firstChild);
	}

	doParse(chk.checked);
	
	logValid=chk.checked;
	
	document.getElementById("summary").collapsed=false;
	document.getElementById("btnSave").disabled=false;
	document.getElementById("btnCopy").disabled=false;
	document.getElementById("nsprlog").disabled=false;
	document.getElementById("filebrowse").disabled=false;
	document.getElementById("showlog").disabled=false;
	document.getElementById("tabbox").collapsed=false;
}

function parseLog()
{
	document.getElementById("nsprlog").disabled=true;
	document.getElementById("filebrowse").disabled=true;
	document.getElementById("showlog").disabled=false;
	document.getElementById("tabbox").collapsed=true;
	var frame = document.getElementById("logframe");
	frame.setAttribute("src", "")
	setTimeout(function() { frame.setAttribute("src", "leaks.html") }, 100);
}

function init(event)
{
	window.removeEventListener("load", init, false);
	
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	preferences = prefservice.getBranch("nightly.");
	
	var buildid = document.getElementById("buildid");
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	buildid.value=navigator.userAgent+" ID:"+appinfo.appBuildID;

	var frame = document.getElementById("logframe");
	frame.addEventListener("load", frameLoaded, true);

	var chk = document.getElementById("showlog");
	chk.checked = preferences.getBoolPref("showleaklog");
	document.getElementById("tabbox").firstChild.style.display=(chk.checked ? null : 'none');
	
	try
	{
		nsprlog = preferences.getComplexValue("nsprlog", Components.interfaces.nsILocalFile);
	}
	catch (e) { }

	if (nsprlog && nsprlog.exists())
	{
		var logtext = document.getElementById("nsprlog");
		logtext.value=nsprlog.path;
		parseLog();
	}
}

function flipLog()
{
	var chk = document.getElementById("showlog");
	preferences.setBoolPref("showleaklog", chk.checked);
	document.getElementById("tabbox").firstChild.style.display=(chk.checked ? null : 'none');
	
	if (!chk.checked)
	{
		document.getElementById("tabbox").selectedIndex=0;
	}

	if (chk.checked && !logValid && nsprlog && nsprlog.exists())
	{
		parseLog();
	}
}

function changeFilter()
{
	var style = document.getElementById("logframe").contentDocument.getElementById("filters");
	var filter = "";

	var chk = document.getElementById("filterDocshell");
	if (!chk.checked)
		filter+=".logline.DOCSHELL { display: none }\n";

	chk = document.getElementById("filterWindow");
	if (!chk.checked)
		filter+=".logline.DOMWINDOW { display: none }\n";

	chk = document.getElementById("filterDocument");
	if (!chk.checked)
		filter+=".logline.DOCUMENT { display: none }\n";
		
	chk = document.getElementById("filterLeaked");
	if (!chk.checked)
		filter+=".leaked { display: none }\n";
		
	chk = document.getElementById("filterCollected");
	if (!chk.checked)
		filter+=".logline:not(.leaked) { display: none }\n";
		
	chk = document.getElementById("filterIgnored");
	if (!chk.checked)
		filter+=".logline.ignored { display: none }\n";
		
	style.innerHTML=filter;
}

function pad(value)
{
	if (value<10)
		return "0"+value;
	return ""+value;
}

function getTextOverview()
{
	var text="Summary"+nightlyplatform.eol+nightlyplatform.eol;
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	text+=navigator.userAgent+" ID:"+appinfo.appBuildID+nightlyplatform.eol+nightlyplatform.eol;
	var date = new Date(nsprlog.lastModifiedTime);
	text+="Session ended "+date.toLocaleString()+nightlyplatform.eol+nightlyplatform.eol;
	
	var leaked = false;
	var handler = handlers["DOMWINDOW"];
	if (handler.leaked>0)
		leaked=true;
	text+="Leaked "+handler.leaked+" out of "+handler.count+" DOM Windows"+nightlyplatform.eol;
	handler = handlers["DOCUMENT"];
	if (handler.leaked>0)
		leaked=true;
	text+="Leaked "+handler.leaked+" out of "+handler.count+" documents"+nightlyplatform.eol;
	handler = handlers["DOCSHELL"];
	if (handler.leaked>0)
		leaked=true;
	text+="Leaked "+handler.leaked+" out of "+handler.count+" docshells"+nightlyplatform.eol;
	
	if (leaked)
	{
		text+=nightlyplatform.eol+"Details"+nightlyplatform.eol+nightlyplatform.eol;
		handler = handlers["DOMWINDOW"];
		for (var addr in handler.windows)
		{
			var winobj = handler.windows[addr];
			text+="Leaked " + (winobj.outer=="0" ? "outer" : "inner") +
						" window "+addr+" "+
						(winobj.outer=="0" ? "" : "(outer " + winobj.outer + ") ") +
            "at address " + addr + "."+nightlyplatform.eol;
      for (var uri in winobj.uris)
      {
      	text+=" ... with URI \"" + uri + "\"."+nightlyplatform.eol;
      }
		}

		handler = handlers["DOCUMENT"];
    for (var addr in handler.docs)
    {
    	var doc = handler.docs[addr];
      text += "Leaked document at address " + addr + "."+nightlyplatform.eol;
      for (var uri in doc.uris)
      {
        text += " ... with URI \"" + uri + "\"."+nightlyplatform.eol;
      }
    }

		handler = handlers["DOCSHELL"];
    for (var addr in handler.shells)
    {
    	var doc = handler.shells[addr];
      text += "Leaked docshell at address " + addr + "."+nightlyplatform.eol;
      for (var uri in doc.uris)
      {
        text += " ... with URI \"" + uri + "\"."+nightlyplatform.eol;
      }
    }
	}
	return text;
}

function save()
{
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "Select Log File", fp.modeSave);
	fp.appendFilter("Log Files (*.log)", "*.log");
	fp.appendFilter("All Files (*.*)", "*.*");
	fp.displayDirectory=nsprlog.parent;

	var date = new Date(nsprlog.lastModifiedTime);
	fp.defaultString=date.getFullYear()+pad(date.getMonth()+1)+pad(date.getDate())+"-"+pad(date.getHours())+pad(date.getMinutes())+"_leaklog.log";

	var result = fp.show();
	if (result==fp.returnOK || result==fp.returnReplace)
	{
		var target=fp.file;
		preferences.setComplexValue("leaksave", Components.interfaces.nsILocalFile, target);

		var text = getTextOverview();
		
		// file is nsIFile, data is a string
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		                         .createInstance(Components.interfaces.nsIFileOutputStream);
		
		// use 0x02 | 0x10 to open file for appending.
		foStream.init(target, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
		var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
    		               .createInstance(Components.interfaces.nsIConverterOutputStream);

		os.init(foStream, "UTF-8", 0, 0x0000);
		os.writeString(text);
		os.close();
		foStream.close();
	}
}

function clipboardCopy()
{
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(getTextOverview());
}

function browserLoad(event)
{
	var fulllog=browser.contentDocument.getElementById("fulllog");
	var leaklog=browser.contentDocument.getElementById("leaks");
	var summary=browser.contentDocument.getElementById("summary");
	
	var p = browser.contentDocument.getElementById("build");
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	p.innerHTML=navigator.userAgent+" ID:"+appinfo.appBuildID;
	p = browser.contentDocument.getElementById("date");
	var date = new Date(nsprlog.lastModifiedTime);
	p.innerHTML="Session ended "+date.toLocaleString();
	run(summary,leaklog,fulllog);
}

function textEnter()
{
	var logtext = document.getElementById("nsprlog");
	var target = Components.classes["@mozilla.org/file/local;1"]
                         .createInstance(Components.interfaces.nsILocalFile);
  target.initWithPath(logtext.value);
  if (target.exists())
  {
  	nsprlog=target;
		preferences.setComplexValue("nsprlog", Components.interfaces.nsILocalFile, nsprlog);
		parseLog();
  }
  else
  {
  	var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
  	                       .getService(Components.interfaces.nsIPromptService);
  	prompt.alert(window, "File Not Found", logtext.value+" does not exist.");
  }
}

function selectLog()
{
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "Select Log File", fp.modeOpen);
	fp.appendFilter("Log Files (*.log)", "*.log");
	fp.appendFilter("All Files (*.*)", "*.*");
	if (nsprlog)
		fp.displayDirectory=nsprlog.parent;
		
	if (fp.show() == fp.returnOK)
	{
		nsprlog=fp.file;
		preferences.setComplexValue("nsprlog", Components.interfaces.nsILocalFile, nsprlog);
		var logtext = document.getElementById("nsprlog");
		logtext.value=nsprlog.path;
		parseLog();
	}
}

window.addEventListener("load", init, false);
