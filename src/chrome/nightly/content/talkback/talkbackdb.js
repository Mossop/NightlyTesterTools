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

function TalkbackDatabase()
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
					this.findTalkbackInDir(dir)
				}
			}
		}
	}

	if (!this.talkbackdir)
	{
		// Firefox 1.0 location
		// (before the fix for https://bugzilla.mozilla.org/show_bug.cgi?id=299040)
		var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
											               .getService(Components.interfaces.nsIProperties);
		var dir = directoryService.get("CurProcD",Components.interfaces.nsIFile);
		this.findTalkbackInDir(dir);
	}

	if (this.talkbackdir)
	{
		var ini = this.talkbackdir.clone();
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
					this.vendor=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="ProductID")
				{
					this.product=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="PlatformID")
				{
					this.platform=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="BuildID")
				{
					this.build=bits[1].substring(1,bits[1].length-1);
				}
			}
		}
	}

	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"]
										               .getService(Components.interfaces.nsIProperties);
	try
	{
		var dir = directoryService.get("AppData",Components.interfaces.nsIFile);
		dir.append("Talkback");

		if (dir.exists())
		{
			this.talkbackdbdir=dir;
		}
	}
	catch (e)
	{
	}
	
	if (!this.talkbackdir)
	{
		var dir = directoryService.get("Home",Components.interfaces.nsIFile);
		var check = dir.clone();
		check.append(".fullcircle");

		if (check.exists())
		{
			this.talkbackdbdir=check;
		}
		else
		{
			dir.append("Library");
			dir.append("Application Support");
			dir.append("Talkback");
			if (dir.exists())
			{
				this.talkbackdir=dir;
			}
		}
	}			

	if (this.talkbackdbdir)
		this.scanDir(this.talkbackdbdir);
}

TalkbackDatabase.prototype = {
	incidents: [],
	talkbackdbdir: null,
	talkbackdir: null,
	
	vendor: null,
	product: null,
	platform: null,
	build: null,
	
	scanDir: function(dir)
	{
		var entries = dir.directoryEntries;
		while (entries.hasMoreElements())
		{
			var ndir = entries.getNext().QueryInterface(Components.interfaces.nsIFile);
			if (ndir.isDirectory())
				this.scanDir(ndir);
		}
		
		var db = new TalkbackBuildDatabase(dir);
		if (db.incidents.length>0)
		{
			if (!this.incidents[db.vendor])
				this.incidents[db.vendor]=[];

			if (!this.incidents[db.vendor][db.product])
				this.incidents[db.vendor][db.product]=[];

			if (!this.incidents[db.vendor][db.product][db.platform])
				this.incidents[db.vendor][db.product][db.platform]=[];

			this.incidents[db.vendor][db.product][db.platform][db.build]=db;
		}
	},
	
	getCurrentBuildDatabase: function()
	{
		return this.getBuildDatabase(this.vendor, this.product, this.platform, this.build);
	},
	
	getBuildDatabase: function(vendor, product, platform, build)
	{
		if (this.incidents[vendor])
			if (this.incidents[vendor][product])
				if (this.incidents[vendor][product][platform])
					return this.incidents[vendor][product][platform][build];
		return null;
	},

	findTalkbackInDir: function(dir)
	{
		dir.append("components");
		
		if (dir.exists())
		{
			this.talkbackdir=dir.clone();
			
			dir.append("talkback");
			if (dir.exists())
			{
				this.talkbackdir=dir.clone();
			}
		}
	}
}

function TalkbackBuildDatabase(dir)
{
	this.incidents = [];
	this.basedir = dir.clone();
	var db = dir.clone();
	db.append("info.db");
	var ini = dir.clone();
	ini.append("manifest.ini");
	if ((db.exists())&&(ini.exists()))
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

		if (this.incidents.length>0)
		{
			stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
											       .createInstance(Components.interfaces.nsIFileInputStream);
			
			stream.init(ini,1,384,Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
			stream.QueryInterface(Components.interfaces.nsILineInputStream);
		
			var line = { value: null };
			while (stream.readLine(line))
			{
				var bits = line.value.split(" = ");
				if (bits[0]=="VendorID")
				{
					this.vendor=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="ProductID")
				{
					this.product=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="PlatformID")
				{
					this.platform=bits[1].substring(1,bits[1].length-1);
				}
				else if (bits[0]=="BuildID")
				{
					this.build=bits[1].substring(1,bits[1].length-1);
				}
			}
			stream.close();
		}
	}
}

TalkbackBuildDatabase.prototype = {
	vendor: null,
	product: null,
	platform: null,
	build: null,
	basedir: null,
	incidents: null
}

function TalkbackIncident(bstream)
{
	this.type = bstream.read32();              // 1 = cached incident, 2 = sent incident
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
