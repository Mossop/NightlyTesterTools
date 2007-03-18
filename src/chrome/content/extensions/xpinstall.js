// -*- js-var:Components,dump,document,window,navigator,NightlyXPInstall,XPInstallConfirm -*-
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

var NightlyXPInstall = {

savedAccept: null,

init: function(event)
{
  var checkCompatibility = true;
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							                .getService(Components.interfaces.nsIPrefBranch);
	try
	{
	  checkCompatibility = prefservice.getBoolPref("extensions.checkCompatibility");
	}
	catch (e)
	{
	}
	if (checkCompatibility && Components.classes["@blueprintit.co.uk/zipwriter;1"])
	{
  	NightlyXPInstall.savedAccept=XPInstallConfirm.onOK;
  	XPInstallConfirm.onOK=NightlyXPInstall.dialogAccept;
  	document.getElementById("nightlyoverride").hidden=false;
  }
},

dialogAccept: function()
{
	var check = document.getElementById("nightlyoverride");
	if (check.checked)
	{
		var nightlyService = Components.classes["@blueprintit.co.uk/addonmonitor;1"]
	                                 .getService(Components.interfaces.nttIAddonMonitorService);

		var itemList = document.getElementById("itemList");
		var items = itemList.getElementsByTagName("installitem");
		for (var i=0; i<items.length; i++)
			nightlyService.monitorInstall(items[i].url);
	}
	XPInstallConfirm.onOK = NightlyXPInstall.savedAccept;
	return XPInstallConfirm.onOK();
}
}

window.addEventListener("load",NightlyXPInstall.init,true);
