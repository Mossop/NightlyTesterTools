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
	if (nightly.variables.name==null)
	{
		nightly.variables.name="Firefox";
	}
	nightly.variables.brandname=document.documentElement.getAttribute("titlemodifier");
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
