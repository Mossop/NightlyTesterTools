/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var paneTitle = {

bundle: null,

init: function()
{
	var checkbox = document.getElementById("enableTitleBar");
    checkbox.addEventListener("CheckboxStateChange",paneTitle.toggled,false);
    checkbox.checked=prefs.getBoolPref('idtitle');
    
	var text = document.getElementById("customTitle");
	text.addEventListener("change",paneTitle.textEntered,false);
	text.addEventListener("input",paneTitle.textEntered,false);
	text.disabled=!checkbox.checked;
	text.value=prefs.getCharPref('templates.title');
	
	paneTitle.bundle=document.getElementById("variablesBundle");
	
	paneTitle.addVariable("AppID");
	paneTitle.addVariable("Vendor");
	paneTitle.addVariable("Name");
	paneTitle.addVariable("Version");
	paneTitle.addVariable("AppBuildID");
	paneTitle.addVariable("PlatformBuildID");
	paneTitle.addVariable("PlatformVersion");
	paneTitle.addVariable("GeckoVersion");
	paneTitle.addVariable("BrandName");
	paneTitle.addVariable("UserAgent");
	paneTitle.addVariable("Locale");
	paneTitle.addVariable("OS");
	paneTitle.addVariable("Processor");
	paneTitle.addVariable("Compiler");
},

addVariable: function(name)
{
	var list = document.getElementById("varList");
	var item = list.appendItem("${"+name+"}");
	var text = null;
	try
	{
		var text = paneTitle.bundle.getString("variable."+name+".description");
	} catch (e) { }
	if (text==null)
	{
		text="";
	}
	item.appendChild(document.createElement("listcell")).setAttribute('label',text);
	var value = prefs.nightly.getVariable(name);
	if (value==null)
	{
		value="Undefined";
	}
	item.appendChild(document.createElement("listcell")).setAttribute('label',value);
},

textEntered: function()
{
	var text = document.getElementById("customTitle");
	prefs.setCharPref('templates.title',text.value);
},

toggled: function()
{
	var checkbox = document.getElementById("enableTitleBar");
	var text = document.getElementById("customTitle");
	text.disabled=!checkbox.checked;
	prefs.setBoolPref('idtitle',checkbox.checked);
}

}

window.addEventListener("load",paneTitle.init,false);
