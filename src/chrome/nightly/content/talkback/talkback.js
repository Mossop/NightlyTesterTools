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

var talkback = {

talkbackdb: null,
talkbackdir: null,
vendor: null,
product: null,
platform: null,
build: null,

init: function(event)
{
	// Firefox 1.5 location
	if (Components.classes["@mozilla.org/extensions/manager;1"])
	{
		var extensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
											               .getService(Components.interfaces.nsIExtensionManager);
	
		if (extensionManager.getInstallLocation)
		{
			var installloc = extensionManager.getInstallLocation("talkback@mozilla.org");
			if (installloc)
			{
				var dir = installloc.getItemLocation("talkback@mozilla.org");
				if (dir)
				{
					talkback.findTalkbackInDir(dir)
				}
			}
		}
	}

	if (!talkback.talkbackdir)
	{
		// Firefox 1.0 location
		// (before the fix for https://bugzilla.mozilla.org/show_bug.cgi?id=299040)
		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
											               .getService(Components.interfaces.nsIProperties);
		var dir = directoryService.get("CurProcD",Components.interfaces.nsIFile);
		talkback.findTalkbackInDir(dir);
	}
	
	if (talkback.talkbackdir)
	{
		var ini = talkback.talkbackdir.clone();
		ini.append("master.ini");
		if (ini.exists())
		{
			var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
											       .createInstance(Components.interfaces.nsIFileInputStream);
			
			stream.init(ini,1,384,Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
			stream.QueryInterface(Components.interfaces.nsILineInputStream);
		
			var line = { value: null };
			while (stream.readLine(line))
			{
				var bits = line.value.split(" = ");
				if (bits[0]=="VendorID")
				{
					talkback.vendor=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="ProductID")
				{
					talkback.product=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="PlatformID")
				{
					talkback.platform=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="BuildID")
				{
					talkback.build=bits[1].substring(1,bits[1].length-1);
				}
			}

			var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
												               .getService(Components.interfaces.nsIProperties);
			var dir = directoryService.get("AppData",Components.interfaces.nsIFile);
			dir.append("Talkback");
			dir.append(talkback.vendor);
			dir.append(talkback.product);
			dir.append(talkback.platform);
			dir.append(talkback.build);

			if (dir.exists())
			{
				var db = new TalkbackDatabase(dir);
				if (db.incidents.length>0)
				{
					var sep = document.getElementById("nightly-talkback-separator");
					sep.hidden=false;
					var parent = sep.parentNode;
					for (var i=0; i<db.incidents.length; i++)
					{
						var menuitem = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul","menuitem");
						menuitem.setAttribute("id", "talkback-id-"+db.incidents[i].id);
						menuitem.setAttribute("label", db.incidents[i].id);
						parent.insertBefore(menuitem,sep);
					}
				}
			}
		}
	}
	else
	{
		document.getElementById("nightly-talkback-menu").disabled=true;
	}
},

findTalkbackInDir: function(dir)
{
	dir.append("components");
	
	if (dir.exists())
	{
		talkback.talkbackdir=dir.clone();
		
		dir.append("talkback");
		if (dir.exists())
		{
			talkback.talkbackdir=dir.clone();
		}
	}
},

launchTalkback: function()
{
	if (talkback.talkbackdir)
	{
		// Test for windows
		var exe = talkback.talkbackdir.clone();
		exe.append("talkback.exe");
		if ((exe.exists()) && (exe.isExecutable()))
		{
			nightly.launch(exe, null);
			return;
		}

		// Test for Mac
		exe = talkback.talkbackdir.clone();
		exe.append("Talkback.app");
		exe.append("Contents");
		exe.append("MacOS");
		exe.append("Talkback");

		if (exe.exists())
		{
			nightly.launch(exe, null);
			return;
		}

		// Test for *nix
		exe = talkback.talkbackdir.clone();
		exe.append("talkback");

		if ((exe.exists()) && (exe.isExecutable()))
		{
			nightly.launch(exe, null);
			return;
		}
	}
	nightly.showAlert("nightly.notalkback.message",[]);
},

viewIncident: function(event)
{
	if (event.target.id.substring(0,12)=="talkback-id-")
	{
		var id = event.target.id.substring(12);
		openUILink("http://talkback-public.mozilla.org/talkback/fastfind.jsp?search=2&type=iid&id="+id, event, false, true);
	}
}

}

function TalkbackDatabase(dir)
{
	var db = dir.clone();
	db.append("info.db");
	if (db.exists())
	{
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
										       .createInstance(Components.interfaces.nsIFileInputStream);
		
		stream.init(db, 1, 384, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
		
		var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
		                        .createInstance(Components.interfaces.nsIBinaryInputStream);
		bstream.setInputStream(stream);
		
		bstream.read32();                        // INFO
		bstream.read32();                        // File size
		bstream.read32();                        // Manifest version
		var count = bstream.read32();            // Incident count
		
		var pos=0;
		for (var i=0; i<count; i++)
		{
			var incident = new TalkbackIncident(bstream);
			if (incident.type==2)
			{
				this.incidents[pos]=incident;
				pos++;
			}
		}
		bstream.close();
	}
}

TalkbackDatabase.prototype = {
	incidents: []
}

function TalkbackIncident(bstream)
{
	this.type = bstream.read32();			         // 1 = cached incident, 2 = sent incident
	this.date = bstream.read32();              // Epoch time
	bstream.read32();                          // ?
	bstream.read32();                          // 1
	bstream.read32();                          // ?
	bstream.read8();                           // ?
	this.id = readCString(bstream);            // ID
	this.comment = readCString(bstream);       // Comment
	this.filename = readCString(bstream);      // Cache filename
	readCString(bstream);                      // Repeat ID
}

TalkbackIncident.prototype = {
	type: null,
	date: 0,
	id: "",
	comment: ""
}

function readCString(bstream)
{
	var result = "";
	var b = bstream.read8();
	while (b!=0)
	{
		result+=String.fromCharCode(b);
		b = bstream.read8();
	}
	return result;
}

window.addEventListener("load", talkback.init, false);
