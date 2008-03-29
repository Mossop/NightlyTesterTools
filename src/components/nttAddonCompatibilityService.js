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
# Portions created by the Initial Developer are Copyright (C) 2008
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
const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const PREFIX_NS_EM                    = "http://www.mozilla.org/2004/em-rdf#";
const PREFIX_ITEM_URI                 = "urn:mozilla:item:";
const RDFURI_INSTALL_MANIFEST_ROOT    = "urn:mozilla:install-manifest";
const FILE_INSTALL_MANIFEST           = "install.rdf";
const TOOLKIT_ID                      = "toolkit@mozilla.org"

var gEM = null;
var gRDF = null;
var gApp = null;

function LOG(string) {
  if (true) {
    dump("*** " + string + "\n");
    var console = Cc["@mozilla.org/consoleservice;1"].
                  getService(Ci.nsIConsoleService);
    console.logStringMessage(string);
  }
}

function EM_NS(property) {
  return PREFIX_NS_EM + property;
}

function EM_R(property) {
  return gRDF.GetResource(EM_NS(property));
}

function getRDFProperty(ds, source, property) {
  var value = ds.GetTarget(source, EM_R(property), true);
  if (value && value instanceof Ci.nsIRDFLiteral)
    return value.Value;
  return null;
}

function removeRDFProperty(ds, source, property) {
  var arc = EM_R(property);
  var targets = ds.GetTargets(source, arc, true);
  while (targets.hasMoreElements())
    ds.Unassert(source, arc, targets.getNext());
}

function extractXPI(xpi) {
  var zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].
                  createInstance(Ci.nsIZipReader);
  zipReader.open(xpi);
  if (!zipReader.hasEntry(FILE_INSTALL_MANIFEST)) {
    zipReader.close();
    return null;
  }
  var dirs = Cc["@mozilla.org/file/directory_service;1"].
             getService(Ci.nsIProperties);
  var file = dirs.get("TmpD", Ci.nsILocalFile);
  file.append("tmpxpi");
  file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0755);
  var entries = zipReader.findEntries("*");
  while (entries.hasMore()) {
    var path = entries.getNext();
    var entry = zipReader.getEntry(path);
    if (path.substring(path.length - 1) == "/")
      path = path.substring(0, entry.length - 1);
    var parts = path.split("/");
    var target = file.clone();
    for (var i = 0; i < parts.length; i++)
      target.append(parts[i]);
    if (entry.isDirectory) {
      if (!target.exists())
        target.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    }
    else {
      var parent = target.parent;
      if (!parent.exists())
        parent.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
      zipReader.extract(path, target);
    }
  }
  zipReader.close();
  return file;
}

function loadManifest(file) {
  var ioServ = Cc["@mozilla.org/network/io-service;1"].
               getService(Ci.nsIIOService);
  var fph = ioServ.getProtocolHandler("file")
                  .QueryInterface(Ci.nsIFileProtocolHandler);
  return gRDF.GetDataSourceBlocking(fph.getURLSpecFromFile(file));
}

function recursiveUpdate(zipWriter, path, dir) {
  var entries = dir.directoryEntries;
  while (entries.hasMoreElements()) {
    var entry = entries.getNext().QueryInterface(Ci.nsIFile);
    if (entry.isDirectory()) {
      var newPath = path + entry.leafName + "/";
      zipWriter.addEntryDirectory(newPath, entry.lastModifiedTime, false);
      recursiveUpdate(zipWriter, newPath, entry);
    }
    else {
      zipWriter.addEntryFile(path + entry.leafName, Ci.nsIZipWriter.COMPRESSION_NONE,
                             entry, false);
    }
  }
}

function updateXPI(xpi, file) {
  var zipWriter = Cc["@mozilla.org/zipwriter;1"].
                  createInstance(Ci.nsIZipWriter);
  zipWriter.open(xpi, 0x04 | 0x08 | 0x20);
  recursiveUpdate(zipWriter, "", file);
  zipWriter.close();
}

function nttAddonDetail() {
}

nttAddonDetail.prototype = {
  datasource: null,
  root: null,

  xpi: null,
  file: null,

  id: null,
  name: null,
  version: null,
  updateURL: null,
  updateKey: null,

  app: null,

  init: function() {
    if (!this.id)
      this.id = getRDFProperty(this.datasource, this.root, "id");
    this.name = getRDFProperty(this.datasource, this.root, "name");
    this.version = getRDFProperty(this.datasource, this.root, "version");
    this.updateURL = getRDFProperty(this.datasource, this.root, "updateURL");
    this.updateKey = getRDFProperty(this.datasource, this.root, "updateKey");

    var apps = this.datasource.GetTargets(this.root, EM_R("targetApplication"), true);
    while (apps.hasMoreElements()) {
      var app = apps.getNext().QueryInterface(Ci.nsIRDFResource);
      var id = getRDFProperty(this.datasource, app, "id");
      LOG("Seen app " + id);
      if (id == gApp.ID || id == TOOLKIT_ID) {
        this.app = {
          resource: app,
          id: id,
          minVersion: getRDFProperty(this.datasource, app, "minVersion"),
          maxVersion: getRDFProperty(this.datasource, app, "maxVersion")
        };
        if (id == gApp.ID)
          break;
      }
    }
  },

  initWithXPI: function(xpi) {
    this.xpi = xpi;
    this.file = extractXPI(xpi);
    var rdf = this.file.clone();
    rdf.append(FILE_INSTALL_MANIFEST);
    this.datasource = loadManifest(rdf);
    this.root = gRDF.GetResource(RDFURI_INSTALL_MANIFEST_ROOT);
    this.init();
  },

  initWithDataSource: function(ds, root, id) {
    this.datasource = ds;
    this.root = root;
    this.id = id;
    this.init();
  },

  cleanup: function() {
    if (this.file && this.file.exists)
      this.file.remove(true);
  },

  makeCompatible: function() {
    if (!this.needsUpdate())
      return;

    if (!this.isUpdateSecure()) {
      LOG("Addon is insecure, removing update URL");
      removeRDFProperty(this.datasource, this.root, "updateURL");
    }

    var version = (gApp.ID == this.app.id) ? gApp.version : gApp.platformVersion;
    var vc = Cc["@mozilla.org/xpcom/version-comparator;1"].
             getService(Ci.nsIVersionComparator);
    if (vc.compare(version, this.app.minVersion) < 0) {
      LOG("minVersion is too high, reducing to " + version);
      removeRDFProperty(this.datasource, this.app.resource, "minVersion");
      this.datasource.Assert(this.app.resource, EM_R("minVersion"), gRDF.GetLiteral(version), true);
    }
    else if (vc.compare(version, this.app.maxVersion) > 0) {
      LOG("maxVersion is too low, increasing to " + version);
      removeRDFProperty(this.datasource, this.app.resource, "maxVersion");
      this.datasource.Assert(this.app.resource, EM_R("maxVersion"), gRDF.GetLiteral(version), true);
    }

    this.datasource.QueryInterface(Ci.nsIRDFRemoteDataSource).Flush();
    if (this.xpi && this.file) {
      updateXPI(this.xpi, this.file);
    }
    else {
     var compatprop = EM_R("compatible");
     var truth = gRDF.GetLiteral("true");
     this.datasource.Assert(this.root, compatprop, truth, true);
     this.datasource.Unassert(this.root, compatprop, truth);
    }
  },

  isValid: function() {
    if (!this.app.id || !this.app.minVersion || !this.app.maxVersion)
      return false;
    return true;
  },

  needsUpdate: function() {
    return (this.isValid() && (!this.isCompatible() || !this.isUpdateSecure()));
  },

  isCompatible: function() {
    var version = (gApp.ID == this.app.id) ? gApp.version : gApp.platformVersion;
    LOG("Comparing " + version + " " + this.app.minVersion + " " + this.app.maxVersion);
    var vc = Cc["@mozilla.org/xpcom/version-comparator;1"].
             getService(Ci.nsIVersionComparator);
    if (vc.compare(version, this.app.minVersion) < 0) {
      LOG(this.id + " has a minVersion that is too high");
      return false;
    }
    if (vc.compare(version, this.app.maxVersion) > 0) {
      LOG(this.id + " has a maxVersion that is too low");
      return false;
    }
    LOG(this.id + " is compatible");
    return true;
  },

  isUpdateSecure: function() {
    if (!this.updateURL)
      return true;
    if (this.updateKey)
      return true;
    return (this.updateURL.substring(0, 6) == "https:");
  }
};

function nttAddonCompatibilityService() {
}

nttAddonCompatibilityService.prototype = {
  id: null,

  ensureServices: function() {
    if (gRDF)
      return;
    gRDF = Cc["@mozilla.org/rdf/rdf-service;1"].
           getService(Ci.nsIRDFService);
    gApp = Cc["@mozilla.org/xre/app-info;1"].
           getService(Ci.nsIXULAppInfo).QueryInterface(Ci.nsIXULRuntime);
  },

  displayUI: function(items) {
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
    win = wm.getMostRecentWindow("Extension:Manager");

    win.openDialog("chrome://nightly/content/extensions/incompatible.xul",
                   "", "chrome,centerscreen,modal,dialog,titlebar", {items: items});
  },

  // nsIAddonCompatibilityService implementation
  isCompatible: function(id) {
    LOG("Is Compatible " + id);
    this.ensureServices();
    var addon = new nttAddonDetail();
    addon.initWithDataSource(gEM.datasource, gRDF.GetResource(PREFIX_ITEM_URI + id), id);
    return !addon.needsUpdate();
  },

  makeCompatible: function(ids, count) {
    this.ensureServices();
    var items = [];
    for (var i = 0; i < ids.length; i++) {
      LOG("Make Compatible " + ids[i]);
      var addon = new nttAddonDetail();
      addon.initWithDataSource(gEM.datasource, gRDF.GetResource(PREFIX_ITEM_URI + ids[i]), ids[i]);
      if (addon.needsUpdate())
        items.push(addon);
    }
    if (items.length > 0) {
      this.displayUI(items);
      for (var i = 0; i < items.length; i++)
        items[i].cleanup();
    }
  },

  // nsIAddonInstallListener implementation
  onDownloadStarted: function(addon) {
  },

  onDownloadProgress: function(addon, value, maxValue) {
  },

  onDownloadEnded: function(addon) {
  },

  onInstallStarted: function(addon) {
    LOG("Install Started for " + addon.xpiURL);
    this.ensureServices();
    var ioServ = Cc["@mozilla.org/network/io-service;1"].
                 getService(Ci.nsIIOService);
    var fph = ioServ.getProtocolHandler("file")
                    .QueryInterface(Ci.nsIFileProtocolHandler);
    var file = fph.getFileFromURLSpec(addon.xpiURL);
    if (file.exists()) {
      try {
        var addon = new nttAddonDetail();
        addon.initWithXPI(file);
        if (addon.needsUpdate())
          this.displayUI([addon]);
        else
          LOG("Add-on is already compatible: '" + addon.updateURL + "' " + addon.app.minVersion + "-" + addon.app.maxVersion);
        addon.cleanup();
      }
      catch (e) {
        LOG("Exception during compatibility check " + e);
      }
    }
  },

  onCompatibilityCheckStarted: function(addon) {
  },

  onCompatibilityCheckEnded: function(addon, status) {
  },

  onInstallEnded: function(addon, status) {
  },

  onInstallsCompleted: function() {
  },

  // nsIObserver implementation
  observe: function(subject, topic, data) {
    switch (topic) {
      case "app-startup":
        var os = Cc["@mozilla.org/observer-service;1"].
                 getService(Ci.nsIObserverService);
        os.addObserver(this, "profile-after-change", false);
        os.addObserver(this, "quit-application", false);
        break;
      case "profile-after-change":
        gEM = Cc["@mozilla.org/extensions/manager;1"].
              getService(Ci.nsIExtensionManager);
        this.id = gEM.addInstallListener(this);
        break;
      case "quit-application":
        gEM.removeInstallListenerAt(this.id);
        gEM = null;
        gRDF = null;
        gApp = null;
        break;
    }
  },

  classDescription: "Nightly Tester Install Monitor",
  contractID: "@oxymoronical.com/nightly/addoncompatibility;1",
  classID: Components.ID("{801207d5-037c-4565-80ed-ede8f7a7c100}"),
  QueryInterface: XPCOMUtils.generateQI([Ci.nttIAddonCompatibilityService, Ci.nsIAddonInstallListener, Ci.nsIObserver]),
  _xpcom_categories: [{
    category: "app-startup",
    service: true
  }]
}

function NSGetModule(compMgr, fileSpec)
  XPCOMUtils.generateModule([nttAddonCompatibilityService]);
