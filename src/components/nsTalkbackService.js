# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Nightly Tester Tools.
#
# The Initial Developer of the Original Code is
#      Dave Townsend <dtownsend@oxymoronical.com>.
#
# Portions created by the Initial Developer are Copyright (C) 2007
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
#
# $HeadURL$
# $LastChangedBy$
# $Date$
# $Revision$
#
const Cc = Components.classes;
const Ci = Components.interfaces;
const LOAD_DELAY = 50;

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
  this.wrappedJSObject = this;
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
talkbackdir: null,

_inited: false,
loaded: false,
_loading: false,
_dirs: [],
_databases: [],
_loadTimer: null,
_listeners: [],

talkbackdbdir: null,
vendors: [],
incidents: [],
orderedIncidents: [],

addProgressListener: function(listener)
{
  if (!this.loaded)
  {
    this._listeners.push(listener);
  }
  else
  {
    listener.onDatabaseLoaded();
  }
},

_init: function()
{
  if (this._inited)
    return;
  
  this._inited=true;

  var obs = Cc["@mozilla.org/observer-service;1"]
             .getService(Ci.nsIObserverService);
  obs.addObserver(this, "quit-application", false);
  
  this._findTalkback();
  if (this.talkbackdbdir)
    this._dirs.push(this.talkbackdbdir);
  else
  {
    this.loaded = true;
    this._loading = true;
  }
},

loadDatabase: function()
{
  if (this._loading)
    return;
    
  this._loading = true;

  if (this.talkbackdbdir)
  {
    this.incidents = [];
    this.orderedIncidents = [];
    this.vendors = [];
  
    this._loadTimer = Cc["@mozilla.org/timer;1"]
                       .createInstance(Ci.nsITimer);
    this._loadTimer.init(this, LOAD_DELAY, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  }
  else
    this.loaded = true;
},

observe: function(subject, topic, data)
{
  switch (topic)
  {
    case "quit-application":
      if (this._loadTimer)
      {
        // Shutdown during load, clear references
        this._loadTimer.cancel();
        this._loadTimer = null;
        this._databases = [];
        this._dirs = [];
        this._listeners = [];
      }
      var obs = Cc["@mozilla.org/observer-service;1"]
                 .getService(Ci.nsIObserverService);
      obs.removeObserver(this, "quit-application");
      break;
    case "timer-callback":
      this.run();
      break;
  }
},

run: function()
{
  if (this._dirs.length>0)
    this._scanDir(this._dirs.pop());
  else if (this._databases.length>0)
    this._loadDatabase(this._databases.pop());
  else if (!this.loaded)
  {
    this.loaded = true;
    if (this.talkbackdir)
    {
       var ini = this.talkbackdir.clone();
       ini.append("master.ini");
       if (ini.exists())
       {
         var results = this._readINI(ini);
         if (results)
         {
           var build = this.getVendor(results.vendor);
           if (build)
           {
             build = build.getProduct(results.product);
             if (build)
             {
               build = build.getPlatform(results.platform);
               if (build)
               {
                 build = build.getBuild(results.build);
                 if (build)
                   this.currentBuild = build;
               }
             }
           }
         }
       }
    }
  }
  else
  {
    if (this._listeners.length == 0) {
      this._loadTimer.callback = null;
      this._loadTimer = null;
      return;
    }
    var listener = this._listeners.pop();
    listener.onDatabaseLoaded();
    if (this._listeners.length == 0) {
      this._loadTimer.callback = null;
      this._loadTimer = null;
      return;
    }
  }
  this._loadTimer.init(this, LOAD_DELAY, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
},

_scanDir: function(dir)
{
  var entries = dir.directoryEntries;
  while (entries.hasMoreElements())
  {
    var ndir = entries.getNext().QueryInterface(Ci.nsIFile);
    if (ndir.isDirectory())
      this._dirs.push(ndir);
  }

  var db = dir.clone();
  db.append("info.db");
  var ini = dir.clone();
  ini.append("manifest.ini");
  if ((db.exists())&&(ini.exists()))
  {
    this._databases.push({dir: dir, db: db, ini: ini});
  }
},

_loadDatabase: function(database)
{
  var dir = database.dir;
  var db = database.db;
  var ini = database.ini;
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
},

_readINI: function(ini)
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
  results = {};
  var line = { value: null };
  while ((stream.readLine(line))&&(fieldcount<4))
  {
    var bits = line.value.split(" = ");
    if (bits[0]=="VendorID")
    {
      results.vendor=bits[1].substring(1,bits[1].length-1);
      fieldcount++;
    }
    else if (bits[0]=="ProductID")
    {
      results.product=bits[1].substring(1,bits[1].length-1);
      fieldcount++;
    }
    else if (bits[0]=="PlatformID")
    {
      results.platform=bits[1].substring(1,bits[1].length-1);
      fieldcount++;
    }
    else if (bits[0]=="BuildID")
    {
      results.build=bits[1].substring(1,bits[1].length-1);
      fieldcount++;
    }
  }
  stream.close();
  
  if (fieldcount==4)
    return results;
  else
    return null;
},

_loadDetails: function(dir, ini)
{
  var results = this._readINI(ini);
  
  if (results)
  {
    var item = this;
    var next = item.getVendor(results.vendor);
    if (!next)
    {
      next = new nsTalkbackVendor(results.vendor, item);
      item._addVendor(next);
    }
    item=next;
    var next = item.getProduct(results.product);
    if (!next)
    {
      next = new nsTalkbackProduct(results.product, item);
      item._addProduct(next);
    }
    item=next;
    var next = item.getPlatform(results.platform);
    if (!next)
    {
      next = new nsTalkbackPlatform(results.platform, item);
      item._addPlatform(next);
    }
    item=next;
    var next = item.getBuild(results.build);
    if (!next)
    {
      next = new nsTalkbackBuild(results.build, item, dir);
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
      this.talkbackdbdir=dir;
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
      this.talkbackdbdir=check;
    }
    else
    {
      dir.append("Library");
      dir.append("Application Support");
      dir.append("FullCircle");
      if (dir.exists())
      {
        this.talkbackdbdir=dir;
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
  
  build = build.wrappedJSObject;
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
  
  build = build.wrappedJSObject;
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
    || iid.equals(Ci.nsIObserver)
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
