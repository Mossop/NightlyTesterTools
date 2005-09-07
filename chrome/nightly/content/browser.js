/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var nightlyApp = {

storedTitle: document.documentElement.getAttribute("titlemodifier"),

init: function()
{
	var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
									.getService(Components.interfaces.nsIStringBundleService);
	var bundle = sbs.createBundle("chrome://branding/locale/brand.properties");
	if (nightly.variables.name==null)
	{
		nightly.variables.name=bundle.GetStringFromName("brandShortName");
	}
	nightly.variables.brandname=bundle.GetStringFromName("brandFullName");
	document.getElementById("content").addEventListener("DOMTitleChanged",nightlyApp.titleUpdated,false);
},

titleUpdated: function()
{
	if (!gBrowser.mTabbedMode)
	{
		gBrowser.updateTitlebar();
	}
},

updateTitlebar: function()
{
	setTimeout("gBrowser.updateTitlebar();", 50);
},

setCustomTitle: function(title)
{
	document.documentElement.setAttribute("titlemodifier",title);
	nightlyApp.updateTitlebar();
},

setStandardTitle: function()
{
	document.documentElement.setAttribute("titlemodifier",nightlyApp.storedTitle);
	nightlyApp.updateTitlebar();
}

}
