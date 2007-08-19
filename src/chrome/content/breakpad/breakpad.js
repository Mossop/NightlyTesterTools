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
var breakpad = {

init: function(event)
{
  window.removeEventListener("load", breakpad.init, false);
  if (Components.interfaces.nsICrashReporter)
  {
    var service = Components.classes["@blueprintit.co.uk/breakpad;1"]
                            .getService(Components.interfaces.nsIBreakpadService);
    
    if (nightly.preferences.getBoolPref("breakpad.recentlist.display"))
    {
      service.loadDatabase();
      service.addProgressListener(breakpad);
    }
    else
    {
      document.getElementById("nightly-breakpad-incidents").parentNode.hidden=true;
    }
  }
  else
  {
    document.getElementById("nightly-breakpad-separator").hidden = true;
    document.getElementById("nightly-breakpad-recent").hidden = true;
    document.getElementById("nightly-breakpad-sidebar").hidden = true;
  }
},

copy: function(event)
{
  var node = document.popupNode;
  if (node.id.substring(0,12)=="breakpad-id-")
  {
    var id = node.id.substring(12);
    var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                              .getService(Components.interfaces.nsIClipboardHelper);
    clipboard.copyString(id);
    closeMenus(node);
  }
},

onDatabaseLoaded: function()
{
  var service = Components.classes["@blueprintit.co.uk/breakpad;1"]
                          .getService(Components.interfaces.nsIBreakpadService);
  
  var incidents = null;
  
  incidents = service.getPreviousIncidents(10);
  
  var parent = document.getElementById("nightly-breakpad-incidents");
  if ((incidents) && (incidents.length > 0))
  {
    while (parent.firstChild)
      parent.removeChild(parent.firstChild);
    
    var en = incidents.enumerate();
    while (en.hasMoreElements())
    {
      var incident = en.getNext().QueryInterface(Components.interfaces.nsIBreakpadIncident);
      
      var item = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
      item.setAttribute("id", "breakpad-id-"+incident.id);
      item.setAttribute("tooltip", "bp-incident-tooltip");
      item.setAttribute("context", "bp-incident-context");
      item.setAttribute("label", incident.id+" ("+(new Date(incident.date)).toLocaleDateString()+")");
      parent.appendChild(item);
    }
    parent.parentNode.hidden=false;
  }
  else
  {
    parent.parentNode.hidden=true;
  }
},

popupTooltip: function(event)
{
  var node = document.tooltipNode;
  if (node.id.substring(0,12)=="breakpad-id-")
  {
    var id = node.id.substring(12);
    var service = Components.classes["@blueprintit.co.uk/breakpad;1"]
                            .getService(Components.interfaces.nsIBreakpadService);
    var incident = service.getIncident(id);
    document.getElementById("bp-tooltip-date").value=(new Date(incident.date)).toLocaleString();
    return true;
  }
  return false;
},

viewIncident: function(event)
{
  if (event.target.id.substring(0,12)=="breakpad-id-")
  {
    var url = nightly.preferences.getCharPref("breakpad.searchurl");
    var id = event.target.id.substring(15);
    nightlyApp.openURL(url+id, event);
  }
},

  
QueryInterface: function(iid)
{
  if (iid.equals(Components.interfaces.nsIBreakpadProgressListener)
    || iid.equals(Components.interfaces.nsISupports))
    return this;
  else
    throw Components.results.NS_ERROR_NO_INTERFACE;
}
}

window.addEventListener("load", breakpad.init, false);
