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

customSetTitleFromFolder: function(msgfolder, subject)
{
	var end = " - "+gBrandBundle.getString("brandShortName");
	nightlyApp.savedSetTitleFromFolder(msgfolder,subject);
	var title = document.title;
	if (title.substring(title.length-end.length)==end)
	{
		document.title=title.substring(0,title.length-end.length)+' - '+nightlyApp.customTitle;
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
