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

var gPrefs = null;
var gCheckCompatibility = null;
var gCheckUpdateSecurity = null;

function init() {
  gPrefs = Cc["@mozilla.org/preferences-service;1"].
           getService(Ci.nsIPrefBranch);
  if (gPrefs.prefHasUserValue("extensions.checkCompatibility"))
    gCheckCompatibility = gPrefs.getBoolPref("extensions.checkCompatibility");
  if (gPrefs.prefHasUserValue("extensions.checkUpdateSecurity"))
    gCheckUpdateSecurity = gPrefs.getBoolPref("extensions.checkUpdateSecurity");

  document.getElementById("changeConfig").hidden = !((gCheckCompatibility === false) ||
                                                     (gCheckUpdateSecurity === false));
  
}

function resetToggled() {
  document.getElementById("enable").disabled = !document.getElementById("reset").checked
}

function accept() {
  if (document.getElementById("reset").checked && !document.getElementById("changeConfig").hidden) {
    var cs = Components.classes["@oxymoronical.com/nightly/addoncompatibility;1"]
                       .createInstance(Components.interfaces.nttIAddonCompatibilityService);

    if (document.getElementById("enable").checked) {
      var em = Cc["@mozilla.org/extensions/manager;1"].
               getService(Ci.nsIExtensionManager);
      var items = em.getItemList(Ci.nsIUpdateItem.TYPE_ADDON, {});
      for (var i = 0; i < items.length; i++) {
        var addon = cs.getAddonForID(items[i].id);
        if (!addon.isValid())
          continue;
        if (!addon.needsOverride(false) && addon.needsOverride(true))
          addon.overrideCompatibility(true);
      }
    }
    
    if (gCheckCompatibility === false)
      gPrefs.clearUserPref("extensions.checkCompatibility");
    if (gCheckUpdateSecurity === false)
      gPrefs.clearUserPref("extensions.checkUpdateSecurity");
  }
  if (document.getElementById("open").checked) {
    const EMTYPE = "Extension:Manager";
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var theEM = wm.getMostRecentWindow(EMTYPE);
    if (theEM) {
      theEM.focus();
      return;
    }

    const EMURL = "chrome://mozapps/content/extensions/extensions.xul";
    const EMFEATURES = "chrome,menubar,extra-chrome,toolbar,dialog=no,resizable";
    window.openDialog(EMURL, "", EMFEATURES);
  }
}
