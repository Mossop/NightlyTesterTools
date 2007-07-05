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
#      Dave Townsend <dave.townsend@blueprintit.co.uk>.
#
# Portions created by the Initial Developer are Copyright (C) 2006
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

function BP_CreateArray(source)
{
  var result = Cc["@mozilla.org/array;1"]
                 .createInstance(Ci.nsIMutableArray);
  
  for (var key in source)
    result.appendElement(source[key], false);
  
  return result;
}

function nsBreakpadIncident(file)
{
  this.id = file.leafName;
  this.id = this.id.substring(0, this.id.length - 4);
  this.date = file.lastModifiedTime;
  this.file = file;
}

nsBreakpadIncident.prototype = {
date: null,
id: null,
file: null,

QueryInterface: function(iid)
{
  if (iid.equals(Ci.nsIBreakpadIncident)
    || iid.equals(Ci.nsISupports))
    return this;
  else
    throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var nsBreakpadService = {

reportdir: null,

_inited: false,
loaded: false,
_loading: false,
_dirs: [],
_databases: [],
_loadTimer: null,
_listeners: [],

incidents: [],
orderedIncidents: [],

addProgressListener: function(listener)
{
  if (!this.loaded)
    this._listeners.push(listener);
  else
    listener.onDatabaseLoaded();
},

_init: function()
{
  if (this._inited)
    return;
  
  this._inited=true;

  var obs = Cc["@mozilla.org/observer-service;1"]
             .getService(Ci.nsIObserverService);
  obs.addObserver(this, "quit-application", false);
  
  this._findBreakpad();
  if (this.reportdir)
    this._dirs.push(this.reportdir);
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

  if (this.reportdir && this.reportdir.exists())
  {
    this.incidents = [];
    this.orderedIncidents = [];

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
  else
  {
    this.loaded = true;
    if (this._listeners.length == 0) {
      this._loadTimer = null;
      return;
    }
    var listener = this._listeners.pop();
    listener.onDatabaseLoaded();
    if (this._listeners.length == 0) {
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
    else
    {
      var ext = ndir.leafName;
      ext = ext.substring(ext.length - 4);
      if (ext == ".txt")
        this._databases.push(ndir);
    }
  }
},

_loadDatabase: function(database)
{
  var incident = new nsBreakpadIncident(database);
  this._addIncident(incident);
},

_findBreakpad: function()
{
  var appinfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
  var vendor = appinfo.vendor;
  var product = appinfo.name;
  
  var appinfo = appinfo.QueryInterface(Ci.nsIXULRuntime);

  var directoryService = Cc["@mozilla.org/file/directory_service;1"]
                           .getService(Ci.nsIProperties);
  switch (appinfo.OS)
  {
    case "Darwin":
      var dir = directoryService.get("Home", Ci.nsIFile);
      dir.append("Library");
      dir.append("Application Support");
      dir.append(product);
      dir.append("Crash Reports");
      break;
    case "WINNT":
      var dir = directoryService.get("AppData", Ci.nsIFile);
      dir.append(vendor);
      dir.append(product);
      dir.append("Crash Reports");
      break;
    default:
      var dir = directoryService.get("Home", Ci.nsIFile);
      dir.append("." + vendor);
      dir.append(product);
      dir.append("Crash Reports");
      break;
  }
  if (dir.exists() && dir.isDirectory())
    this.reportdir = dir;
},

_addIncident: function(incident)
{
  var pos = 0;
  while ((pos < this.orderedIncidents.length) && (this.orderedIncidents[pos].date > incident.date))
    pos++;
  
  this.orderedIncidents.splice(pos, 0, incident);
  this.incidents[incident.id]=incident;
},

getRecentIncidents: function(date)
{
  var result = Cc["@mozilla.org/array;1"]
                 .createInstance(Ci.nsIMutableArray);
  
  for (var i = 0; i < this.orderedIncidents.length; i++)
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
  
  for (var i = 0; i < count; i++)
    result.appendElement(this.orderedIncidents[i], false);
  
  return result;
},

getIncident: function(id)
{
  return this.incidents[id];
},

getIncidents: function()
{
  return TB_CreateArray(this.orderedIncidents);
},

getTreeView: function()
{
  var share = {};
  var tv = new XULTreeView(share);
  tv.childData.reserveChildren(true);
  
  var vparent = tv.childData;
  
  for (var id in this.incidents)
  {
    var incident = this.incidents[id];
    record = new XULTreeViewRecord(share);
    record.setColumnPropertyName("incidentID", "id");
    record.setColumnPropertyName("incidentDate", "date");
    record.setColumnPropertyName("type", "type");
    record.setColumnProperties("incidentID", "name incident");
    record.id = id;
    record.type = "incident";
    record.date = (new Date(incident.date)).toLocaleString();
    record.comment = incident.comment;
    tv.childData.appendChild(record);
  }
  
  return tv;
},

QueryInterface: function(iid)
{
  if (iid.equals(Ci.nsIBreakpadService)
    || iid.equals(Ci.nsIObserver)
    || iid.equals(Ci.nsISupports))
    return this;
  else
    throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

var initModule =
{
  ServiceCID: Components.ID("{b33388ca-71b4-4194-b822-2cbd0e89ffc0}"),
  ServiceContractID: "@blueprintit.co.uk/breakpad;1",
  ServiceName: "Nightly Tester Breakpad Service",
  
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
      nsBreakpadService._init();
      return nsBreakpadService.QueryInterface(iid);
    }
  }
}; //Module

function NSGetModule(compMgr, fileSpec)
{
  return initModule;
}
