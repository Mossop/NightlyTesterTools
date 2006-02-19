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

init: function(event)
{
	var service = Components.classes["@blueprintit.co.uk/talkback;1"]
	                        .getService(Components.interfaces.nsITalkbackService);
	
	service.addProgressListener(talkback);
},

copy: function(event)
{
	var node = document.popupNode;
	if (node.id.substring(0,12)=="talkback-id-")
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
	var service = Components.classes["@blueprintit.co.uk/talkback;1"]
	                        .getService(Components.interfaces.nsITalkbackService);
	
	var incidents = service.getPreviousIncidents(10);
	if ((incidents)&&(incidents.length>0))
	{
		var parent = document.getElementById("nightly-incidents");
		while (parent.firstChild)
			parent.removeChild(parent.firstChild);
		
		var en = incidents.enumerate();
		while (en.hasMoreElements())
		{
			var incident = en.getNext().QueryInterface(Components.interfaces.nsITalkbackIncident);
			
			var item = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
			item.setAttribute("id", "talkback-id-"+incident.id);
			item.setAttribute("tooltip", "tb-incident-tooltip");
			item.setAttribute("context", "tb-incident-context");
			item.setAttribute("label", incident.id);
			parent.appendChild(item);
		}
		document.getElementById("nightly-incidents").parentNode.hidden=false;
	}
	else
	{
		document.getElementById("nightly-incidents").parentNode.hidden=true;
	}
},

popupTooltip: function(event)
{
	var node = document.tooltipNode;
	if (node.id.substring(0,12)=="talkback-id-")
	{
		var id = node.id.substring(12);
		var service = Components.classes["@blueprintit.co.uk/talkback;1"]
		                        .getService(Components.interfaces.nsITalkbackService);
		var incident = service.getIncident(id);
		document.getElementById("tb-tooltip-product").value=incident.build.platform.product.name+" ("+incident.build.name+")";
		document.getElementById("tb-tooltip-date").value=(new Date(incident.date)).toLocaleString();
		var comment = document.getElementById("tb-tooltip-comment");
		if (incident.comment && incident.comment!="")
		{
			comment.value=incident.comment;
			comment.hidden=false;
		}
		else
		{
			comment.value="";
			comment.hidden=true;
		}
		
		return true;
	}
	return false;
},

viewIncident: function(event)
{
	if (event.target.id.substring(0,12)=="talkback-id-")
	{
		var prefservice = Components.classes['@mozilla.org/preferences-service;1']
								                .getService(Components.interfaces.nsIPrefBranch);
		var url = prefservice.getCharPref("nightly.talkback.searchurl");
		var id = event.target.id.substring(12);
		nightlyApp.openURL(url+id, event);
	}
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

window.addEventListener("load", talkback.init, false);
