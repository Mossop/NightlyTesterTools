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

var prefs = {

boolPrefs: {
},

charPrefs: {
},

preferences: null,

instantApply: false,

nightly: null,

init: function()
{
	var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
							.getService(Components.interfaces.nsIWindowMediator);
							
	var window = mediator.getMostRecentWindow("navigator:browser");
	if (!window)
	{
		window=mediator.getMostRecentWindow("mail:3pane");
	}
	if (window)
	{
		prefs.nightly=window.nightly;
	}
	
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	prefs.preferences = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);

	try
	{
		prefservice=prefservice.QueryInterface(Components.interfaces.nsIPrefBranch);
		prefs.instantApply=prefservice.getBoolPref("browser.preferences.instantApply");
	} catch (e) { }
	
	if (prefs.instantApply)
	{
		var btn = document.getElementById("btnOK");
		btn.hidden=true;
		btn = document.getElementById("btnCancel");
		btn.hidden=true;
		btn = document.getElementById("btnClose");
		btn.hidden=false;
 	}
},

getBoolPref: function(pref)
{
	if (prefs.boolPrefs[pref]==null)
	{
 		prefs.boolPrefs[pref]=prefs.preferences.getBoolPref(pref);
	}
	return prefs.boolPrefs[pref];
},

setBoolPref: function(pref,value)
{
	prefs.boolPrefs[pref]=value;
	if (prefs.instantApply)
	{
		prefs.preferences.setBoolPref(pref,value);
	}
},

getCharPref: function(pref)
{
	if (prefs.charPrefs[pref]==null)
	{
		prefs.charPrefs[pref]=prefs.preferences.getCharPref(pref);
	}
	return prefs.charPrefs[pref];
},

setCharPref: function(pref,value)
{
	prefs.charPrefs[pref]=value;
	if (prefs.instantApply)
	{
		prefs.preferences.setCharPref(pref,value);
	}
},

apply: function()
{
	for (var pref in prefs.charPrefs)
	{
		prefs.preferences.setCharPref(pref,prefs.charPrefs[pref]);
	}
	for (var pref in prefs.boolPrefs)
	{
		prefs.preferences.setBoolPref(pref,prefs.boolPrefs[pref]);
	}
	prefs.close();
},

cancel: function()
{
	prefs.close();
},

close: function()
{
	window.close();
}

}

window.addEventListener("load",prefs.init,false);
