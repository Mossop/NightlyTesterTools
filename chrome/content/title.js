var paneTitle = {

prefs: {
},

preferences: null,

instantApply: false,

init: function()
{
	var prefservice = Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefService);
	paneTitle.preferences = prefservice.getBranch("nightly.").QueryInterface(Components.interfaces.nsIPrefBranchInternal);

	try
	{
		prefservice=prefservice.QueryInterface(Components.interfaces.nsIPrefBranch);
		paneTitle.instantApply=prefservice.getBoolPref("browser.preferences.instantApply");
	} catch (e) { }
	
	if (paneTitle.instantApply)
	{
		var btn = document.getElementById("btnOK");
		btn.hidden=true;
		btn = document.getElementById("btnCancel");
		btn.label="Close";
 	}
	
	paneTitle.prefs['templates.title']=paneTitle.preferences.getCharPref('templates.title');
	paneTitle.prefs['idtitle']=paneTitle.preferences.getBoolPref('idtitle');
	
	var checkbox = document.getElementById("enableTitleBar");
    checkbox.addEventListener("CheckboxStateChange",paneTitle.toggled,false);
    checkbox.checked=paneTitle.prefs['idtitle'];
    
	var text = document.getElementById("customTitle");
	text.addEventListener("change",paneTitle.textEntered,false);
	text.addEventListener("input",paneTitle.textEntered,false);
	text.disabled=!paneTitle.prefs['idtitle'];
	text.value=paneTitle.prefs['templates.title'];
},

setBoolPref: function(pref,value)
{
	paneTitle.prefs[pref]=value;
	if (paneTitle.instantApply)
	{
		paneTitle.preferences.setBoolPref(pref,value);
	}
},

setCharPref: function(pref,value)
{
	paneTitle.prefs[pref]=value;
	if (paneTitle.instantApply)
	{
		paneTitle.preferences.setCharPref(pref,value);
	}
},

textEntered: function()
{
	var text = document.getElementById("customTitle");
	paneTitle.setCharPref('templates.title',text.value);
},

toggled: function()
{
	var checkbox = document.getElementById("enableTitleBar");
	var text = document.getElementById("customTitle");
	text.disabled=!checkbox.checked;
	paneTitle.setBoolPref('idtitle',checkbox.checked);
},

ok: function()
{
	paneTitle.preferences.setCharPref('templates.title',paneTitle.prefs['templates.title']);
	paneTitle.preferences.setBoolPref('idtitle',paneTitle.prefs['idtitle']);
	window.close();
},

cancel: function()
{
	window.close();
}

}

window.addEventListener("load",paneTitle.init,false);
