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

db: null,

init: function(event)
{
	talkback.db = new TalkbackDatabase();
	
	if (!talkback.db.talkbackdir)
	{
		document.getElementById("nightly-talkback-sidebar").disabled=true;
		document.getElementById("nightly-talkback-launch").disabled=true;
	}
	
	var db = talkback.db.getCurrentBuildDatabase();
	if (db)
	{
		var parent = document.getElementById("nightly-incidents");
		
		for (var i=0; i<db.incidents.length; i++)
		{
			var item = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
			item.setAttribute("id", "talkback-id-"+db.incidents[i].id);
			item.setAttribute("label", db.incidents[i].id);
			parent.appendChild(item);
		}
		document.getElementById("nightly-incidents").parentNode.hidden=false;
	}
},

launchTalkback: function()
{
	if (talkback.db.talkbackdir)
	{
		// Test for windows
		var exe = talkback.db.talkbackdir.clone();
		exe.append("talkback.exe");
		if ((exe.exists()) && (exe.isExecutable()))
		{
			nightly.launch(exe, null);
			return;
		}

		// Test for Mac
		exe = talkback.db.talkbackdir.clone();
		exe.append("Talkback.app");
		exe.append("Contents");
		exe.append("MacOS");
		exe.append("Talkback");

		if (exe.exists())
		{
			nightly.launch(exe, null);
			return;
		}

		// Test for *nix
		exe = talkback.db.talkbackdir.clone();
		exe.append("talkback");

		if ((exe.exists()) && (exe.isExecutable()))
		{
			nightly.launch(exe, null);
			return;
		}
	}
	nightly.showAlert("nightly.notalkback.message",[]);
},

viewIncident: function(event)
{
	if (event.target.id.substring(0,12)=="talkback-id-")
	{
		var id = event.target.id.substring(12);
		openUILink("http://talkback-public.mozilla.org/talkback/fastfind.jsp?search=2&type=iid&id="+id, event, false, true);
	}
}

}

window.addEventListener("load", talkback.init, false);
