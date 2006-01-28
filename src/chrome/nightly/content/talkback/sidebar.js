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

var xulns = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var sidebar = {

db: null,

init: function()
{
	this.db = window.parent.talkback.db;
	
	var root = document.getElementById("treeroot");
	
	sidebar.addProducts(root, this.db.incidents[this.db.vendor]);
},

command: function(event)
{
	var tree = document.getElementById("tree");
	var node = tree.contentView.getItemAtIndex(tree.currentIndex);
	if (node.id.substring(0,12)=="talkback-id-")
	{
		var id = node.id.substring(12);
		window.parent.openUILink("http://talkback-public.mozilla.org/talkback/fastfind.jsp?search=2&type=iid&id="+id, event, false, true);
	}
},

click: function(event)
{
	if (event.button<2)
		sidebar.command(event);
},

addProducts: function(children, source)
{
	for (var key in source)
	{
		var item = document.createElementNS(xulns, "treeitem");
		item.setAttribute("container", "true");
		children.appendChild(item);
		var row = document.createElementNS(xulns, "treerow");
		item.appendChild(row);
		var cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", key);
		row.appendChild(cell);
		
		var nchildren = document.createElementNS(xulns, "treechildren");
		item.appendChild(nchildren);
		
		sidebar.addPlatforms(nchildren, source[key]);
	}
},

addPlatforms: function(children, source)
{
	for (var key in source)
	{
		var item = document.createElementNS(xulns, "treeitem");
		item.setAttribute("container", "true");
		children.appendChild(item);
		var row = document.createElementNS(xulns, "treerow");
		item.appendChild(row);
		var cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", key);
		row.appendChild(cell);
		
		var nchildren = document.createElementNS(xulns, "treechildren");
		item.appendChild(nchildren);
		
		sidebar.addBuilds(nchildren, source[key]);
	}
},

addBuilds: function(children, source)
{
	for (var key in source)
	{
		var item = document.createElementNS(xulns, "treeitem");
		item.setAttribute("container", "true");
		children.appendChild(item);
		var row = document.createElementNS(xulns, "treerow");
		item.appendChild(row);
		var cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", key);
		row.appendChild(cell);
		
		var nchildren = document.createElementNS(xulns, "treechildren");
		item.appendChild(nchildren);
		
		sidebar.addIncidents(nchildren, source[key]);
	}
},

addIncidents: function(children, source)
{
	for (var i=0; i<source.incidents.length; i++)
	{
		var item = document.createElementNS(xulns, "treeitem");
		item.setAttribute("id", "talkback-id-"+source.incidents[i].id);
		children.appendChild(item);
		var row = document.createElementNS(xulns, "treerow");
		item.appendChild(row);
		var cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", source.incidents[i].id);
		row.appendChild(cell);
		cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", source.incidents[i].date);
		row.appendChild(cell);
		cell = document.createElementNS(xulns, "treecell");
		cell.setAttribute("label", source.incidents[i].comment);
		row.appendChild(cell);
	}
}

}
