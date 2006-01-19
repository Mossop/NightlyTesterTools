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

function run(summary, leaklog, fulllog) {
		var result = "";
		
		// A hash of objects (keyed by the first word of the line in the log)
		// that have two public methods, handle_line and dump (to be called using
		// call, above), along with any private data they need.
		var handlers = {
		    "DOMWINDOW": {
		        count: 0,
		        windows: {},
		        handle_line: function(line) {
		            var match = line.match(/^([0-9a-f]*) (\S*)(.*)/);
		            if (match) {
		                var addr = match[1];
		                var verb = match[2];
		                var rest = match[3];
		                if (verb == "created") {
		                    var m = rest.match(/ outer=([0-9a-f]*)$/);
		                    if (!m)
		                        throw "outer expected";
		                    this.windows[addr] = { outer: m[1] };
		                    ++this.count;
		                } else if (verb == "destroyed") {
		                    delete this.windows[addr];
		                } else if (verb == "SetNewDocument") {
		                    var m = rest.match(/^ (.*)$/);
		                    if (!m)
		                        throw "URI expected";
		                    this.windows[addr][m[1]] = true;
		                }
		            }
		        },
		        dump: function() {
		            for (var addr in this.windows) {
		                var winobj = this.windows[addr];
		                var outer = winobj.outer;
		                delete winobj.outer;
		                result += "Leaked " + (outer == "0" ? "outer" : "inner") +
		                          " window " + addr + " " +
		                          (outer == "0" ? "" : "(outer " + outer + ") ") +
		                          "at address " + addr + ".\n";
		                for (var uri in winobj) {
		                    result += " ... with URI \"" + uri + "\".\n";
		                }
		            }
		        },
		        summary: function() {
		            var len = 0;
		            for (var w in this.windows)
		                ++len;
		            result += 'Leaked ' + len + ' out of ' +
		                      this.count + " DOM Windows\n";
		        }
		    },
		    "DOCUMENT": {
		        count: 0,
		        docs: {},
		        handle_line: function(line) {
		            var match = line.match(/^([0-9a-f]*) (\S*)(.*)/);
		            if (match) {
		                var addr = match[1];
		                var verb = match[2];
		                var rest = match[3];
		                if (verb == "created") {
		                    this.docs[addr] = {};
		                    ++this.count;
		                } else if (verb == "destroyed") {
		                    delete this.docs[addr];
		                } else if (verb == "ResetToURI" ||
		                           verb == "StartDocumentLoad") {
		                    var m = rest.match(/^ (.*)$/);
		                    if (!m)
		                        throw "URI expected";
		                    this.docs[addr][m[1]] = true;
		                }
		            }
		        },
		        dump: function() {
		            for (var addr in this.docs) {
		                var doc = this.docs[addr];
		                result += "Leaked document at address " + addr + ".\n";
		                for (var uri in doc) {
		                    result += " ... with URI \"" + uri + "\".\n";
		                }
		            }
		        },
		        summary: function() {
		            var len = 0;
		            for (var w in this.docs)
		                ++len;
		            result += 'Leaked ' + len + ' out of ' +
		                      this.count + " documents\n";
		        }
		    },
		    "DOCSHELL": {
		        count: 0,
		        shells: {},
		        handle_line: function(line) {
		            var match = line.match(/^([0-9a-f]*) (\S*)(.*)/);
		            if (match) {
		                var addr = match[1];
		                var verb = match[2];
		                var rest = match[3];
		                if (verb == "created") {
		                    this.shells[addr] = {};
		                    ++this.count;
		                } else if (verb == "destroyed") {
		                    delete this.shells[addr];
		                } else if (verb == "InternalLoad" ||
		                           verb == "SetCurrentURI") {
		                    var m = rest.match(/^ (.*)$/);
		                    if (!m)
		                        throw "URI expected";
		                    this.shells[addr][m[1]] = true;
		                }
		            }
		        },
		        dump: function() {
		            for (var addr in this.shells) {
		                var doc = this.shells[addr];
		                result += "Leaked docshell at address " + addr + ".\n";
		                for (var uri in doc) {
		                    result += " ... which loaded URI \"" + uri + "\".\n";
		                }
		            }
		        },
		        summary: function() {
		            var len = 0;
		            for (var w in this.shells)
		                ++len;
		            result += 'Leaked ' + len + ' out of ' +
		                      this.count + " docshells\n";
		        }
		    }
		};
		
		const cs = Components.classes;
		const ifs = Components.interfaces;
		
		var is = cs["@mozilla.org/network/file-input-stream;1"].
		             createInstance(ifs.nsIFileInputStream);
		const PR_RDONLY = 0x01;
		is.init(nsprlog, PR_RDONLY, 0, 0);
		if (!(is instanceof ifs.nsILineInputStream))
		    return;
		var line = { value: "" };
		do {
		    var more = is.readLine(line);// yuck, returns false for last valid line
				
				fulllog.appendChild(fulllog.ownerDocument.createTextNode(line.value+"\n"));
		
		    // strip off initial "-", thread id, and thread pointer; separate
		    // first word and rest
		    var matches = line.value.match(/^\-?[0-9]*\[[0-9a-f]*\]: (\S*) (.*)$/);
		    if (matches) {
		        var handler = matches[1];
		        var data = matches[2];
		        if (typeof(handlers[handler]) != "undefined") {
		            handlers[handler].handle_line(data);
		        }
		    }
		} while (more);
		
		for (var handler in handlers)
		    handlers[handler].dump();
		
		detailsText=result;
		result=result.replace(/\n/g,"<br>");
		result=result.replace(/URI \"(.*?)\"/g,"URI \"<a href=\"$1\">$1</a>\"");
		leaklog.innerHTML=result;

		result = "";
		for (var handler in handlers)
		    handlers[handler].summary();
		
		summaryText=result;
		result=result.replace(/\n/g,"<br>");
		result=result.replace(/URI \"(.*?)\"/g,"URI \"<a href=\"$1\">$1</a>\"");
		
		summary.innerHTML=result;
}
// --------------------------------------------------------------------

var nsprlog = null;
var browser = null;
var preferences = null;

var summaryText = "";
var detailsText = "";

function init(event)
{
	window.removeEventListener("load", init, false);
	
	browser = document.getElementById("leakbrowser");
	browser.addEventListener("load", browserLoad, true);
	
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	preferences = prefservice.getBranch("nightly.");
	
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

function pad(value)
{
	if (value<10)
		return "0"+value;
	return ""+value;
}

function getTextOverview()
{
	var text="Summary\n\n";
	var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].getService(Components.interfaces.nsIXULAppInfo);
	text+=navigator.userAgent+" ID:"+appinfo.appBuildID+"\n\n";
	var date = new Date(nsprlog.lastModifiedTime);
	text+="Session ended "+date.toLocaleString()+"\n\n";
	text+=summaryText;
	if (detailsText.length>0)
	{
		text+="\nDetails\n\n";
		text+=detailsText;
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

function parseLog()
{
	browser.loadURI("chrome://nightly/content/leaks.html");
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
