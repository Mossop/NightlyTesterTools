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
 * Portions created by the Initial Developer are Copyright (C) 2004
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

var handlers = {
  "DOMWINDOW": {
		count: 0,
		leaked: 0,
    windows: {},
    handle_line: function(addr,line,para) {
	    var match = line.match(/^(\S*)(.*)/);
	    if (match) {
        var verb = match[1];
        var rest = match[2];
        if (verb == "created") {
          var m = rest.match(/ outer=([0-9a-f]*)$/);
          if (!m)
            throw "outer expected";
          this.windows[addr] = { outer: m[1], paras: [], uris: [] };
          ++this.count;
          ++this.leaked;
			    this.windows[addr].paras.push(para);
        } else if (verb == "destroyed") {
        	para.className=para.className.replace(/ leaked/,"");
          for (var i=0; i<this.windows[addr].paras.length; i++) {
          	var para = this.windows[addr].paras[i];
          	para.className=para.className.replace(/ leaked/,"");
          }
          delete this.windows[addr];
          --this.leaked;
        } else if (verb == "SetNewDocument") {
          var m = rest.match(/^ (.*)$/);
          if (!m)
            throw "URI expected";
          this.windows[addr].uris[m[1]] = true;
			    this.windows[addr].paras.push(para);
        }
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
	  handle_line: function(addr,line,para) {
	    var match = line.match(/^(\S*)(.*)/);
	    if (match) {
        var verb = match[1];
        var rest = match[2];
        if (verb == "created") {
          this.docs[addr] = { paras: [], uris: [] };
          ++this.count;
          ++this.leaked;
			    this.docs[addr].paras.push(para);
        } else if (verb == "destroyed") {
        	para.className=para.className.replace(/ leaked/,"");
          for (var i=0; i<this.docs[addr].paras.length; i++) {
          	var para = this.docs[addr].paras[i];
          	para.className=para.className.replace(/ leaked/,"");
          }
          delete this.docs[addr];
          --this.leaked;
        } else if (verb == "ResetToURI" ||
                   verb == "StartDocumentLoad") {
          var m = rest.match(/^ (.*)$/);
          if (!m)
            throw "URI expected";
          this.docs[addr].uris[m[1]] = true;
			    this.docs[addr].paras.push(para);
        }
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
    handle_line: function(addr,line,para) {
	    var match = line.match(/^(\S*)(.*)/);
	    if (match) {
		    var verb = match[1];
		    var rest = match[2];
		    if (verb == "created") {
			    this.shells[addr] = { paras: [], uris: [] };
			    ++this.count;
			    ++this.leaked;
			    this.shells[addr].paras.push(para);
    		} else if (verb == "destroyed") {
        	para.className=para.className.replace(/ leaked/,"");
          for (var i=0; i<this.shells[addr].paras.length; i++) {
          	var para = this.shells[addr].paras[i];
          	para.className=para.className.replace(/ leaked/,"");
          }
    			delete this.shells[addr];
    			--this.leaked;
    		} else if (verb == "InternalLoad" ||
                   verb == "SetCurrentURI") {
    			var m = rest.match(/^ (.*)$/);
    			if (!m)
        		throw "URI expected";
    			this.shells[addr].uris[m[1]] = true;
			    this.shells[addr].paras.push(para);
    		}
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

function parseLog()
{
	handlers.clear();
	
	var fulllog = document.getElementById("logframe").contentDocument.body;
	var datelbl = document.getElementById("date");
	var date = new Date(nsprlog.lastModifiedTime);
	datelbl.value=date.toLocaleString();

	while (fulllog.firstChild)
	{
		fulllog.removeChild(fulllog.firstChild);
	}
	
	var is = Components.classes["@mozilla.org/network/file-input-stream;1"]
	                   .createInstance(Components.interfaces.nsIFileInputStream);
	const PR_RDONLY = 0x01;
	is.init(nsprlog, PR_RDONLY, 0, 0);
	if (!(is instanceof Components.interfaces.nsILineInputStream))
	  return;
	var line = { value: "" };
	do
	{
    var more = is.readLine(line); // yuck, returns false for last valid line

    var para = fulllog.ownerDocument.createElementNS("http://www.w3.org/1999/xhtml","p");
    fulllog.appendChild(para);
    para.appendChild(document.createTextNode(line.value));
    para.className+="logline";

    // strip off initial "-", thread id, and thread pointer; separate
    // first word and rest
    var matches = line.value.match(/^\-?[0-9]*\[[0-9a-f]*\]: (\S*) ([0-9a-f]*) (.*)$/);
    if (matches) {
	    var handler = matches[1];
	    var address = matches[2];
	    para.className+=" "+handler+" "+address+" leaked";
	    var data = matches[3];
	    if (typeof(handlers[handler]) != "undefined") {
	      handlers[handler].handle_line(address,data,para);
	    }
	    else
	    {
	    	para.className+=" ignored";
	    }
    }
    else
    {
    	para.className+=" ignored";
    }
	} while (more);
	
	var details = document.getElementById("details");
	while (details.firstChild)
	{
		details.removeChild(details.firstChild);
	}
	var leaked=false;
	
	var lbl = document.getElementById("windowLeaks");
	var handler = handlers["DOMWINDOW"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" DOM Windows";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	for (var addr in handler.windows)
	{
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

	lbl = document.getElementById("documentLeaks");
	handler = handlers["DOCUMENT"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" documents";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	for (var addr in handler.docs)
	{
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

	lbl = document.getElementById("docshellLeaks");
	handler = handlers["DOCSHELL"];
	lbl.value="Leaked "+handler.leaked+" out of "+handler.count+" docshells";
	if (handler.leaked>0)
	{
		lbl.className="leaked";
		leaked=true;
	}
	for (var addr in handler.shells)
	{
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
	
	document.getElementById("detailsbox").collapsed=!leaked;
}
// --------------------------------------------------------------------

var nsprlog = null;
var preferences = null;

var summaryText = "";
var detailsText = "";

function finalinit(event)
{
	var frame = document.getElementById("logframe");
	frame.removeEventListener("load", finalinit, true);

	changeFilter();
	
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

function init(event)
{
	window.removeEventListener("load", init, false);
	
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	preferences = prefservice.getBranch("nightly.");
	
	var buildid = document.getElementById("buildid");
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	buildid.value=navigator.userAgent+" ID:"+appinfo.appBuildID+nightlyplatform.eol+nightlyplatform.eol;

	var frame = document.getElementById("logframe");
	frame.addEventListener("load", finalinit, true);
	frame.setAttribute("src","leaks.html");
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
	var target = null;
	try
	{
		target = preferences.getComplexValue("leaksave", Components.interfaces.nsILocalFile);
	}
	catch (e) { }

	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "Select Log File", fp.modeSave);
	fp.appendFilter("Log Files (*.log)", "*.log");
	fp.appendFilter("All Files (*.*)", "*.*");
	if (target)
		fp.displayDirectory=target.parent;

	var date = new Date(nsprlog.lastModifiedTime);
	fp.defaultString=date.getFullYear()+pad(date.getMonth()+1)+pad(date.getDate())+"-"+pad(date.getHours())+pad(date.getMinutes())+"_leaklog.log";

	var result = fp.show();
	if (result==fp.returnOK || result==fp.returnReplace)
	{
		target=fp.file;
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
