// -*- js-var:Components,dump,document,window -*-
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
 * $HeadURL: svn://svn.blueprintit.co.uk/dave/mozilla/firefox/buildid/trunk/src/chrome/content/talkback/sidebar.js $
 * $LastChangedBy: dave $
 * $Date: 2006-05-01 14:58:48 +0100 (Mon, 01 May 2006) $
 * $Revision: 660 $
 *
 */

var xulns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var sidebar = {

db: null,

init: function()
{
  var service = Components.classes["@blueprintit.co.uk/breakpad;1"]
                          .getService(Components.interfaces.nsIBreakpadService);
  
  service.loadDatabase();
  service.addProgressListener(sidebar);
},

onDatabaseLoaded: function()
{
  var service = Components.classes["@blueprintit.co.uk/breakpad;1"]
                          .getService(Components.interfaces.nsIBreakpadService);

  var tree = document.getElementById("tree");
  tree.view = service.getTreeView();
  
  document.getElementById("loading").hidden=true;
  tree.hidden=false;
},

copy: function(event)
{
  var tree = document.getElementById("tree");
  var id = tree.view.getCellText(tree.currentIndex, tree.columns.getNamedColumn("incidentID"));
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                            .getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(id);
},

command: function(tree, event, row)
{
  var type = tree.view.getCellText(row, tree.columns.getNamedColumn("type"));
  if (type=="incident")
  {
    var prefservice = Components.classes['@mozilla.org/preferences-service;1']
                                .getService(Components.interfaces.nsIPrefBranch);
    var url = prefservice.getCharPref("nightly.breakpad.searchurl");
    var id = tree.view.getCellText(row, tree.columns.getNamedColumn("incidentID"));
    window.parent.openUILink(url+id, event, false, true);
  }
},

selectedCommand: function(event)
{
  var tree = document.getElementById("tree");
  sidebar.command(tree, event, tree.currentIndex);
},

clickCommand: function(event)
{
  var tree = document.getElementById("tree");
  var row = {}, col = {};
  tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, {});
  sidebar.command(tree, event, row.value);
},

checkPopup: function(event)
{
  var tree = document.getElementById("tree");
  var type = tree.view.getCellText(tree.currentIndex, tree.columns.getNamedColumn("type"));
  return type=="incident";
},

QueryInterface: function(iid)
{
  if (iid.equals(Components.interfaces.nsITalkbackProgressListener)
    || iid.equals(Components.interfaces.nsISupports))
  {
    return this;
  }
  else
  {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
}
}
