/*
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
		btn.label="Close";
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
	window.close();
},

cancel: function()
{
	window.close();
}

}

window.addEventListener("load",prefs.init,false);
