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
},

setCustomTitle: function(title)
{
	document.documentElement.setAttribute("titlemodifier",title);
	document.getElementById("content").updateTitlebar();
},

setStandardTitle: function()
{
	document.documentElement.setAttribute("titlemodifier",nightlyApp.storedTitle);
	document.getElementById("content").updateTitlebar();
}

}
