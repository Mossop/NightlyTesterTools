function getBuildID()
{
	var appinfo = Components.classes["@mozilla.org/xre/app-info;1"].
										getService(Components.interfaces.nsIXULAppInfo);
	return appinfo.geckoBuildID;
}

function getUserAgent()
{
	return navigator.userAgent;
}

function copyBuildID()
{
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(getUserAgent()+" ID:"+getBuildID());
}
