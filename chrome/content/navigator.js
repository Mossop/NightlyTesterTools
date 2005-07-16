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
		nightly.variables.name="Application Suite";
	}
	nightly.variables.appid="{86c18b42-e466-45a9-ae7a-9b95ba6f5640}";
	nightly.variables.version=nightly.variables.geckoversion;
	var modifier=document.documentElement.getAttribute("titlemodifier")
	var pos = modifier.indexOf(" {Build ID: ");
	if (pos>=0)
	{
		modifier=modifier.substring(0,pos);
	}
	nightly.variables.brandname=modifier;
	var build = document.getElementById("nightlyBuildID").getAttribute("label");
	dump('"'+build+'"'+"\n");
	build=build.substring(10);
	nightly.variables.platformbuildid=build;
	nightly.variables.geckobuildid=build;
	nightly.variables.appbuildid=build;
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
