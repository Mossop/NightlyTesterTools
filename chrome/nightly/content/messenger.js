/*
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

var nightlyApp = {

savedSetTitleFromFolder: window.setTitleFromFolder,
customTitle: '',

init: function()
{
	var brandbundle = document.getElementById("bundle_brand");
	if (nightly.variables.name==null)
	{
  	nightly.variables.name=brandbundle.getString("brandShortName");
	}
  nightly.variables.brandname=brandbundle.getString("brandFullName");
},

customSetTitleFromFolder: function(msgfolder, subject)
{
	var brandbundle = document.getElementById("bundle_brand");
	var end = " - "+brandbundle.getString("brandShortName");
	nightlyApp.savedSetTitleFromFolder(msgfolder,subject);

	var title;
	if ((document.title)&&(document.title.length>0))
	{
		title = document.title;
	}
	else
	{
		title = window.title;
	}

	if (title.substring(title.length-end.length)==end)
	{
		title=title.substring(0,title.length-end.length)+' - '+nightlyApp.customTitle;
	}

	if ((document.title)&&(document.title.length>0))
	{
		document.title=title;
	}
	else
	{
		window.title=title;
	}
},

updateTitle: function()
{
	if (gDBView)
		window.setTitleFromFolder(gDBView.msgFolder,null);
},

setCustomTitle: function(title)
{
	nightlyApp.customTitle=title;
	window.setTitleFromFolder=nightlyApp.customSetTitleFromFolder;
	nightlyApp.updateTitle();
},

setStandardTitle: function()
{
	window.setTitleFromFolder=nightlyApp.savedSetTitleFromFolder;
	nightlyApp.updateTitle();
}

}
