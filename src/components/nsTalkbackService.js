// -*- js-var:dump,Components,XULTreeView,XULTreeViewRecord -*-
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

const Cc = Components.classes;
const Ci = Components.interfaces;

Cc["@mozilla.org/moz/jssubscript-loader;1"]
  .getService(Ci.mozIJSSubScriptLoader)
  .loadSubScript("chrome://nightly/content/includes/tree-utils.js", null);

function TB_CreateArray(source)
{
	var result = Cc["@mozilla.org/array;1"]
	               .createInstance(Ci.nsIMutableArray);
	
	for (var key in source)
	{
		result.appendElement(source[key], false);
	}
	
	return result;
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

function nsTalkbackIncident(bstream, build)
{
	this.build = build;
	
	this.type = bstream.read32();              // 1 = cached incident, 2 = sent incident
	this.date = bstream.read32()*1000;         // Epoch time
	bstream.read32();                          // ?
	bstream.read32();                          // 1
	bstream.read32();                          // ?
	bstream.read8();                           // ?
	this.id = readCString(bstream);            // ID
	this.comment = readCString(bstream);       // Comment
	this.filename = readCString(bstream);      // Cache filename
	readCString(bstream);                      // Repeat ID
}

nsTalkbackIncident.prototype = {
build: null,
	
date: null,
id: null,
comment: null,

type: null,
filename: null,

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackIncident)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

function nsTalkbackBuild(name, platform, dir)
{
	this.name=name;
	this.platform=platform;
	this.dbdir=dir;
	this.incidents=[];
}

nsTalkbackBuild.prototype = {

name: null,
platform: null,

dbdir: null,
incidents: null,

_addIncident: function(incident)
{
	this.incidents[incident.id]=incident;
},

_removeIncident: function(name)
{
	delete this.incidents[name];
},

_loadIncidents: function(db)
{
	var service = this.platform.product.vendor.service;
	var stream = Cc["@mozilla.org/network/file-input-stream;1"]
								 .createInstance(Ci.nsIFileInputStream);
	
	stream.init(db, 1, 384, Ci.nsIFileInputStream.CLOSE_ON_EOF);
	
	var bstream = Cc["@mozilla.org/binaryinputstream;1"]
	                .createInstance(Ci.nsIBinaryInputStream);
	bstream.setInputStream(stream);
	
	bstream.read32();                        // INFO
	bstream.read32();                        // File size
	bstream.read32();                        // Manifest version
	var count = bstream.read32();            // Incident count
	
	var pos=0;
	for (var i=0; i<count; i++)
	{
		var incident = new nsTalkbackIncident(bstream, this);
		if (service._isValidIncident(incident))
		{
			this._addIncident(incident);
			service._addIncident(incident);
			pos++;
		}
	}
	bstream.close();
},

getIncident: function(id)
{
	return this.incidents[id];
},

getIncidents: function()
{
	return TB_CreateArray(this.incidents);
},

remove: function()
{
	this.dbdir.remove(true);
	this.platform._removeBuild(this.name);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackBuild)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

function nsTalkbackPlatform(name, product)
{
	this.name=name;
	this.product=product;
	this.builds=[];
}

nsTalkbackPlatform.prototype = {

name: null,
product: null,

builds: null,

_addBuild: function(build)
{
	this.builds[build.name]=build;
},

_removeBuild: function(name)
{
	delete this.builds[name];
},

getBuild: function(name)
{
	return this.builds[name];
},

getBuilds: function()
{
	return TB_CreateArray(this.builds);
},

remove: function()
{
	for (var key in this.builds)
	{
		this.builds[key].remove();
	}
	this.product._removePlatform(this.name);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackBuild)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

function nsTalkbackProduct(name, vendor)
{
	this.name=name;
	this.vendor=vendor;
	this.platforms=[];
}

nsTalkbackProduct.prototype = {

name: null,
vendor: null,

platforms: null,

_addPlatform: function(platform)
{
	this.platforms[platform.name]=platform;
},

_removePlatform: function(name)
{
	delete this.platforms[name];
},

getPlatform: function(name)
{
	return this.platforms[name];
},

getPlatforms: function()
{
	return TB_CreateArray(this.platforms);
},

remove: function()
{
	for (var key in this.platforms)
	{
		this.platforms[key].remove();
	}
	this.vendor._removeProduct(this.name);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackProduct)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

function nsTalkbackVendor(name, service)
{
	this.name=name;
	this.service=service;
	this.products=[];
}

nsTalkbackVendor.prototype = {

name: null,

service: null,
products: null,

_addProduct: function(product)
{
	this.products[product.name]=product;
},

_removeProduct: function(name)
{
	delete this.products[name];
},

getProduct: function(name)
{
	return this.products[name];
},

getProducts: function()
{
	return TB_CreateArray(this.products);
},

remove: function()
{
	for (var key in this.products)
	{
		this.products[key].remove();
	}
	this.service._removeVendor(this.name);
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackVendor)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

var nsTalkbackService = {

currentBuild: null,

inited: false,
loaded: false,
loading: false,
vendors: [],
incidents: [],
orderedIncidents: [],
talkbackdir: null,
talkbackdbdir: null,
listeners: [],
proxy: null,
notifier: {
  listeners: [],
  
  run: function()
  {
  	for (var i=0; i<this.listeners.length; i++)
  	{
  		try
  		{
  			this.listeners[i].onDatabaseLoaded();
  		}
  		catch (e)
  		{
  			dump(e+"\n");
  		}
  	}
  	this.listeners = [];
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },
},

addProgressListener: function(listener)
{
	if (!this.loaded)
	{
		this.notifier.listeners.push(listener);
	}
	else
	{
		listener.onDatabaseLoaded();
	}
},

_init: function()
{
	if (this.inited)
		return;
	
	this.inited=true;

	this._findTalkback();
},

loadDatabase: function()
{
	if (this.loading)
		return;
		
	this.loading=true;

  if (Cc["@mozilla.org/thread-manager;1"])
  {
    var tm = Cc["@mozilla.org/thread-manager;1"]
               .getService(Ci.nsIThreadManager)
    var thread = tm.newThread(0);
    thread.dispatch(this, Ci.nsIEventTarget.DISPATCH_NORMAL);
  }
  else
  {
    var eQs = Cc["@mozilla.org/event-queue-service;1"]
                .getService(Ci.nsIEventQueueService);
    var eQueue = eQs.getSpecialEventQueue(Ci.nsIEventQueueService.UI_THREAD_EVENT_QUEUE);
    
    // Creates a proxy for this object that will make calls on the UI event queue.
    var proxyManager = Cc["@mozilla.org/xpcomproxy;1"]
                         .getService(Ci.nsIProxyObjectManager);
    this.proxy = proxyManager.getProxyForObject(eQueue, 
                                                Ci.nsIRunnable, 
                                                this.notifier, 
                                                Ci.nsIProxyObjectManager.INVOKE_SYNC
                                                 + Ci.nsIProxyObjectManager.FORCE_PROXY_CREATION);
                                                
  	var thread = Cc["@mozilla.org/thread;1"]
  	               .createInstance(Ci.nsIThread);
  	thread.init(this, 0, Ci.nsIThread.PRIORITY_NORMAL,
  	                     Ci.nsIThread.SCOPE_LOCAL,
  	                     Ci.nsIThread.STATE_UNJOINABLE);
  }
},

run: function()
{
	this.incidents = [];
	this.orderedIncidents = [];
	this.vendors = [];

	if (this.talkbackdbdir)
	{
	  var dir = Cc["@mozilla.org/file/local;1"]
	              .createInstance(Ci.nsILocalFile);
	  dir.initWithPath(this.talkbackdbdir);
		this._scanDir(dir);
  }
	
	this.loaded = true;
	if (this.proxy)
  	this.proxy.run();
  else
  {
    var tm = Cc["@mozilla.org/thread-manager;1"]
               .getService(Ci.nsIThreadManager)
    var thread = tm.mainThread;
    thread.dispatch(this.notifier, Ci.nsIEventTarget.DISPATCH_NORMAL);
  }
},

_scanDir: function(dir)
{
	var entries = dir.directoryEntries;
	while (entries.hasMoreElements())
	{
		var ndir = entries.getNext().QueryInterface(Ci.nsIFile);
		if (ndir.isDirectory())
			this._scanDir(ndir);
	}

	var db = dir.clone();
	db.append("info.db");
	var ini = dir.clone();
	ini.append("manifest.ini");
	if ((db.exists())&&(ini.exists()))
	{
		var build = this._loadDetails(dir, ini);
		if (build)
		{
			build._loadIncidents(db);
			if (build.incidents.length==0)
			{
				var platform = build.platform;
				platform._removeBuild(build);
				if (platform.builds.length==0)
				{
					var product = platform.product;
					if (product.platforms.length==0)
					{
						var vendor = product.vendor;
						vendor._removeProduct(product);
						if (vendor.products.length==0)
						{
							this._removeVendor(vendor);
						}
					}
				}
			}
		}
	}
},

_loadDetails: function(dir, ini)
{
	var stream = Cc["@mozilla.org/network/file-input-stream;1"]
						 .createInstance(Ci.nsIFileInputStream);
	
	stream.init(ini,1,384,Ci.nsIFileInputStream.CLOSE_ON_EOF);
	stream.QueryInterface(Ci.nsILineInputStream);

  var vendor = null;
  var product = null;
  var platform = null;
  var build = null;
  
	var fieldcount=0;
	var line = { value: null };
	while ((stream.readLine(line))&&(fieldcount<4))
	{
		var bits = line.value.split(" = ");
		if (bits[0]=="VendorID")
		{
			vendor=bits[1].substring(1,bits[1].length-1);
			fieldcount++;
		}
		else if (bits[0]=="ProductID")
		{
			product=bits[1].substring(1,bits[1].length-1);
			fieldcount++;
		}
		else if (bits[0]=="PlatformID")
		{
			platform=bits[1].substring(1,bits[1].length-1);
			fieldcount++;
		}
		else if (bits[0]=="BuildID")
		{
			build=bits[1].substring(1,bits[1].length-1);
			fieldcount++;
		}
	}
	stream.close();
	
	if (fieldcount==4)
	{
		var item = this;
		var next = item.getVendor(vendor);
		if (!next)
		{
			next = new nsTalkbackVendor(vendor, item);
			item._addVendor(next);
		}
		item=next;
		var next = item.getProduct(product);
		if (!next)
		{
			next = new nsTalkbackProduct(product, item);
			item._addProduct(next);
		}
		item=next;
		var next = item.getPlatform(platform);
		if (!next)
		{
			next = new nsTalkbackPlatform(platform, item);
			item._addPlatform(next);
		}
		item=next;
		var next = item.getBuild(build);
		if (!next)
		{
			next = new nsTalkbackBuild(build, item, dir);
			item._addBuild(next);
		}
		return next;
	}
	return null;
},

_findTalkbackInDir: function(dir)
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
},

_findTalkback: function()
{
	// Firefox 1.5 location
	if (Cc["@mozilla.org/extensions/manager;1"])
	{
		var extensionManager = Cc["@mozilla.org/extensions/manager;1"]
											       .getService(Ci.nsIExtensionManager);
	
		if (extensionManager.getInstallLocation)
		{
			var installloc = extensionManager.getInstallLocation("talkback@mozilla.org");
			if (installloc)
			{
				var dir = installloc.getItemLocation("talkback@mozilla.org");
				if (dir)
				{
					this._findTalkbackInDir(dir)
				}
			}
		}
	}

	if (!this.talkbackdir)
	{
		// Firefox 1.0 location
		// (before the fix for https://bugzilla.mozilla.org/show_bug.cgi?id=299040)
		var directoryService = Cc["@mozilla.org/file/directory_service;1"]
											       .getService(Ci.nsIProperties);
		var dir = directoryService.get("CurProcD",Ci.nsIFile);
		this._findTalkbackInDir(dir);
	}

	var directoryService = Cc["@mozilla.org/file/directory_service;1"]
										       .getService(Ci.nsIProperties);
	try
	{
		var dir = directoryService.get("AppData",Ci.nsIFile);
		dir.append("Talkback");

		if (dir.exists())
		{
			this.talkbackdbdir=dir.path;
		}
	}
	catch (e)
	{
	}
	
	if (!this.talkbackdbdir)
	{
		var dir = directoryService.get("Home",Ci.nsIFile);
		var check = dir.clone();
		check.append(".fullcircle");

		if (check.exists())
		{
			this.talkbackdbdir=check.path;
		}
		else
		{
			dir.append("Library");
			dir.append("Application Support");
			dir.append("FullCircle");
			if (dir.exists())
			{
				this.talkbackdbdir=dir.path;
			}
		}
	}			
},

_addVendor: function(vendor)
{
	this.vendors[vendor.name]=vendor;
},

_removeVendor: function(name)
{
	delete this.vendors[name];
},

_isValidIncident: function(incident)
{
	if (incident.type!=2)
		return false;
	
	if (!incident.id)
		return false;
		
	if (incident.id=="")
		return false;
		
	return true;
},

_addIncident: function(incident)
{
	if (incident.id=="")
	{
		dump(incident.build.dbdir.path+"\n");
	}
	
	var pos = 0;
	while ((pos<this.orderedIncidents.length)&&(this.orderedIncidents[pos].date>incident.date))
		pos++;
	
	this.orderedIncidents.splice(pos, 0, incident);
	this.incidents[incident.id]=incident;
},

getRecentIncidents: function(date)
{
	var result = Cc["@mozilla.org/array;1"]
	               .createInstance(Ci.nsIMutableArray);
	
	for (var i=0; i<this.orderedIncidents.length; i++)
	{
		if (this.orderedIncidents[i].date<date)
			break;
			
		result.appendElement(this.orderedIncidents[i], false);
	}
	
	return result;
},

getPreviousIncidents: function(count)
{
	var result = Cc["@mozilla.org/array;1"]
	               .createInstance(Ci.nsIMutableArray);
	
	count=Math.min(count, this.orderedIncidents.length);
	
	for (var i=0; i<count; i++)
	{
		result.appendElement(this.orderedIncidents[i], false);
	}
	
	return result;
},

getBuildRecentIncidents: function(build, date)
{
	var result = Cc["@mozilla.org/array;1"]
	               .createInstance(Ci.nsIMutableArray);
	
	for (var i=0; i<this.orderedIncidents.length; i++)
	{
		if (this.orderedIncidents[i].date<date)
			break;
			
		if (this.orderedIncidents[i].build!=build)
			continue;
			
		result.appendElement(this.orderedIncidents[i], false);
	}
	
	return result;
},

getBuildPreviousIncidents: function(build, count)
{
	var result = Cc["@mozilla.org/array;1"]
	               .createInstance(Ci.nsIMutableArray);
	
	if (count==0)
		return result;
	
	for (var i=0; i<this.orderedIncidents.length; i++)
	{
		if (this.orderedIncidents[i].build!=build)
			continue;
		
		result.appendElement(this.orderedIncidents[i], false);
		count--;
		if (count==0)
			break;
	}
	
	return result;
},

getIncident: function(id)
{
	return this.incidents[id];
},

getVendor: function(name)
{
	return this.vendors[name];
},

getIncidents: function()
{
	return TB_CreateArray(this.orderedIncidents);
},

getVendors: function()
{
	return TB_CreateArray(this.vendors);
},

getTreeView: function()
{
	var showVendors = false;
	var showPlatforms = false;
	
	var share = {};
	var tv = new XULTreeView(share);
	tv.childData.reserveChildren(true);
	
	var vparent = tv.childData;
	
	for (var vkey in this.vendors)
	{
		var vendor = this.vendors[vkey];
		var pparent;
		
		if (showVendors)
		{
			var record = new XULTreeViewRecord(share);
			record.setColumnPropertyName("incidentID", "id");
			record.setColumnPropertyName("type", "type");
			record.setColumnProperties("incidentID", "name vendor");
			record.id=vkey;
			record.type="vendor";
			record.reserveChildren(true);
			vparent.appendChild(record);
			pparent = record;
		}
		else
		{
			pparent = vparent;
		}
		
		for (var pkey in vendor.products)
		{
			var product = vendor.products[pkey];
			record = new XULTreeViewRecord(share);
			record.setColumnPropertyName("incidentID", "id");
			record.setColumnPropertyName("type", "type");
			record.setColumnProperties("incidentID", "name product");
			record.id=pkey;
			record.type="product";
			record.reserveChildren(true);
			pparent.appendChild(record);
			var lparent=record;

			for (var lkey in product.platforms)
			{
				var platform = product.platforms[lkey];
				var bparent;
				
				if (showPlatforms)
				{
					record = new XULTreeViewRecord(share);
					record.setColumnPropertyName("incidentID", "id");
					record.setColumnPropertyName("type", "type");
					record.setColumnProperties("incidentID", "name platform");
					record.id=lkey;
					record.type="platform";
					record.reserveChildren(true);
					lparent.appendChild(record);
					bparent=record;
				}
				else
				{
					bparent = lparent;
				}

				for (var bkey in platform.builds)
				{
					var build = platform.builds[bkey];
					record = new XULTreeViewRecord(share);
					record.setColumnPropertyName("incidentID", "id");
					record.setColumnPropertyName("type", "type");
					record.setColumnProperties("incidentID", "name build");
					record.id=bkey;
					record.type="build";
					record.reserveChildren(true);
					bparent.appendChild(record);
					var iparent=record;

					for (var ikey in build.incidents)
					{
						var incident = build.incidents[ikey];
						record = new XULTreeViewRecord(share);
						record.setColumnPropertyName("incidentID", "id");
						record.setColumnPropertyName("incidentDate", "date");
						record.setColumnPropertyName("incidentComment", "comment");
						record.setColumnPropertyName("type", "type");
						record.setColumnProperties("incidentID", "name incident");
						record.id=ikey;
						record.type="incident";
						record.date=(new Date(incident.date)).toLocaleString();
						record.comment=incident.comment;
						iparent.appendChild(record);
					}
				}
			}
		}
	}
	
	return tv;
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsITalkbackService)
		|| iid.equals(Ci.nsIRunnable)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

var initModule =
{
	ServiceCID: Components.ID("{9ad0c590-2206-4869-95e2-702bc8c8df9d}"),
	ServiceContractID: "@blueprintit.co.uk/talkback;1",
	ServiceName: "Nightly Tester Talkback Service",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
	},

	getClassObject: function (compMgr, cid, iid)
	{
		if (!cid.equals(this.ServiceCID))
			throw Components.results.NS_ERROR_NO_INTERFACE
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return this.instanceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	instanceFactory:
	{
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			nsTalkbackService._init();
			return nsTalkbackService.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
