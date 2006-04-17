const Ci = Components.interfaces;
const Cc = Components.classes;

var shotWindow = window.opener;

var zoom = 1;

var canvas = null;

var cropX = 0;
var cropY = 0;
var cropWidth = 0;
var cropHeight = 0;

var areax = 0;
var areay = 0;

var windows = [];

function init(event)
{
	canvas = document.getElementById("canvas");
	resetScreenshot();
	canvas.parentNode.addEventListener("mousedown", startAreaSelect, true);
	
	var zoomlist = document.getElementById("zoomlist");
	zoomlist.value = zoom;
	zoomlist.addEventListener("ValueChange", zoomChange, false);
	
	buildWinPopup()
		
	var winlist = document.getElementById("winlist");
	winlist.addEventListener("ValueChange", winChange, false);
	
	var winpopup = document.getElementById("winpopup");
	winpopup.addEventListener("popupshowing", buildWinPopup, false);
	
	bundle = document.getElementById("bundle");
}

function getTopWin()
{
  var windowManager = Cc['@mozilla.org/appshell/window-mediator;1']
                        .getService(Ci.nsIWindowMediator);
  return windowManager.getMostRecentWindow("navigator:browser");
}

function submitScreenshot()
{
	var data = canvas.toDataURLAs("image/png", "");
	var pos = data.indexOf(";",5);
	var contenttype = data.substring(5,pos);
	var npos = data.indexOf(",",pos+1);
	var encoding = data.substring(pos+1,npos);
	data = data.substring(npos+1);
	
	var fd = Cc["@blueprintit.co.uk/multipartformdata;1"]
	           .createInstance(Ci.nttIMultipartFormData);
	fd.addControl("uploadtype", "on");
	fd.addControl("url", "paste image url here");
	fd.addControl("MAX_FILE_SIZE", "3145728");
	fd.addControl("refer", "");
	fd.addControl("brand", "");
	fd.addControl("optsize", "320x320");
	fd.addFileData("fileupload", "screenshot.png", contenttype, encoding, data);
	
  var ioService = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);
  
  var referer = ioService.newURI("http://www.imageshack.us/", "UTF8", null);
  
  var win = getTopWin();
  var webnav = win.content.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIWebNavigation);
  webnav.loadURI("http://www.imageshack.us/", Ci.nsIWebNavigation.LOAD_FLAGS_NONE
                , referer, fd.getPostDataStream(), fd.getHeaderStream());
}

function saveScreenshot()
{
	var fp = Cc["@mozilla.org/filepicker;1"]
	           .createInstance(Ci.nsIFilePicker);
	fp.init(window, bundle.getString("screenshot.filepicker.title"), fp.modeSave);
	//Mookfp.appendFilter(bundle.getString("screenshot.filepicker.filterJPG"), "*.jpg");
	fp.appendFilter(bundle.getString("screenshot.filepicker.filterPNG"), "*.png");
	fp.defaultString="screenshot.png";

	var result = fp.show();
	if (result==fp.returnOK || result==fp.returnReplace)
	{
		var mimetype = "image/png";
		var options = "";
		/*if (fp.filterIndex == 0)
		{
			mimetype = "image/jpg";
		}
		else if (fp.filterIndex == 1)
		{
			mimetype = "image/png";
		}*/
		
	  var ioService = Cc["@mozilla.org/network/io-service;1"]
	                    .getService(Ci.nsIIOService);
	  
	  var source = ioService.newURI(canvas.toDataURLAs(mimetype, options), "UTF8", null);
	  var target = ioService.newFileURI(fp.file)
	  
	  var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
	                  .createInstance(Ci.nsIWebBrowserPersist);
	
	  persist.persistFlags = Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
	  persist.persistFlags |= Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
	
	  var tr = Cc["@mozilla.org/transfer;1"]
	             .createInstance(Ci.nsITransfer);
	
	  tr.init(source, target, "", null, null, null, persist);
	  persist.progressListener = tr;
	  persist.saveURI(source, null, null, null, null, fp.file);
	}
}

function resetScreenshot()
{
	cropX = 0;
	cropY = 0;
	cropWidth = shotWindow.innerWidth;
	cropHeight = shotWindow.innerHeight;
	drawScreenshot();
}

function buildWinPopup(event)
{
	var winlist = document.getElementById("winlist");
	var winpopup = document.getElementById("winpopup");
	
	windows = [];
	while (winpopup.firstChild)
		winpopup.removeChild(winpopup.firstChild);

	var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
	          .getService(Ci.nsIWindowMediator);
	var wins = wm.getEnumerator(null);
	var pos = 0;
	while (wins.hasMoreElements())
	{
		var win = wins.getNext().QueryInterface(Ci.nsIDOMWindow);
		windows[pos] = win;
		var item = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem");
		if (win.document.title)
			item.setAttribute("label", win.document.title);
		else
			item.setAttribute("label", win.document.location.href);
		item.setAttribute("value", pos);
		winpopup.appendChild(item);
		
		if (!event && win==shotWindow)
			winlist.value=pos;
			
		pos++;
	}
}

function winChange(event)
{
	var winlist = document.getElementById("winlist");
	shotWindow = windows[winlist.value];
	resetScreenshot();
}

function zoomChange(event)
{
	var menulist = document.getElementById("zoomlist");
	zoom = menulist.value;

	canvas.style.width = (cropWidth*zoom)+"px";
	canvas.style.minWidth = (cropWidth*zoom)+"px";
	canvas.style.maxWidth = (cropWidth*zoom)+"px";
	canvas.style.height = (cropHeight*zoom)+"px";
	canvas.style.minHeight = (cropHeight*zoom)+"px";
	canvas.style.maxHeight = (cropHeight*zoom)+"px";
}

function startAreaSelect(event)
{
	var box = document.getElementById("areaselect");
	box.hidden=false;

	areax = Math.round(event.layerX/zoom)*zoom;
	areay = Math.round(event.layerY/zoom)*zoom;
	
	box.parentNode.addEventListener("mousemove", updateAreaSelect, true);
	box.parentNode.addEventListener("mouseup", completeAreaSelect, true);
	updateAreaSelect(event);
}

function updateAreaSelect(event)
{
	var box = document.getElementById("areaselect");

	var newx = Math.round(event.layerX/zoom)*zoom;
	var newy = Math.round(event.layerY/zoom)*zoom;
	
	box.top = Math.min(newy, areay);
	box.left = Math.min(newx, areax);
	
	box.style.width = (Math.abs(newx-areax))+"px";
	box.style.height = (Math.abs(newy-areay))+"px";
}

function completeAreaSelect(event)
{
	var box = document.getElementById("areaselect");
	box.hidden=true;
	box.top=0;
	box.left=0;
	box.style.width="0px";
	box.style.height="0px";
	box.parentNode.removeEventListener("mousemove", updateAreaSelect, true);
	box.parentNode.removeEventListener("mouseup", completeAreaSelect, true);

	var newx = Math.round(event.layerX/zoom)*zoom;
	var newy = Math.round(event.layerY/zoom)*zoom;

	cropY += Math.min(newy, areay)/zoom;
	cropX += Math.min(newx, areax)/zoom;
	
	cropWidth = Math.abs(newx-areax)/zoom;
	cropHeight = Math.abs(newy-areay)/zoom;

	drawScreenshot();
}

function drawScreenshot()
{
	canvas.width = cropWidth;
	canvas.height = cropHeight;
	canvas.style.width = (cropWidth*zoom)+"px";
	canvas.style.minWidth = (cropWidth*zoom)+"px";
	canvas.style.maxWidth = (cropWidth*zoom)+"px";
	canvas.style.height = (cropHeight*zoom)+"px";
	canvas.style.minHeight = (cropHeight*zoom)+"px";
	canvas.style.maxHeight = (cropHeight*zoom)+"px";

	var ctx = canvas.getContext("2d");
	ctx.translate(-cropX, -cropY);
	
  var winbo = shotWindow.document.getBoxObjectFor(shotWindow.document.documentElement);
  var winx = winbo.screenX;
  var winy = winbo.screenY;

	ctx.drawWindow(shotWindow, shotWindow.scrollX, shotWindow.scrollY, shotWindow.innerWidth, shotWindow.innerHeight, "rgba(255,255,255,255)");
	
	var docshell = shotWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShell);
	var shells = docshell.getDocShellEnumerator(Ci.nsIDocShellTreeItem.typeAll, Ci.nsIDocShell.ENUMERATE_FORWARDS);
	while (shells.hasMoreElements())
	{
		var shell = shells.getNext().QueryInterface(Ci.nsIDocShell);
		if (shell == docshell)
			continue;

		shell.QueryInterface(Ci.nsIBaseWindow);
		if (!shell.visibility)
			continue;

		var shellwin = shell.QueryInterface(Ci.nsIInterfaceRequestor)
		                    .getInterface(Ci.nsIDOMWindow);
	  var shellbo = shellwin.document.getBoxObjectFor(shellwin.document.documentElement);
	  
	  ctx.save();
	  ctx.translate(shellbo.screenX-winx+shellwin.scrollX, shellbo.screenY-winy+shellwin.scrollY);
	  ctx.drawWindow(shellwin, shellwin.scrollX, shellwin.scrollY, shellwin.innerWidth, shellwin.innerHeight, "rgba(255,255,255,255)");
	  ctx.restore();
	}
}

window.addEventListener("load", init, false);
