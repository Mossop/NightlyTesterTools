const Ci = Components.interfaces;
const Cc = Components.classes;

var shotWindow = window.opener;

var zoom = 1;

var canvas = null;

var cropX = 0;
var cropY = 0;
var cropWidth = shotWindow.innerWidth;
var cropHeight = shotWindow.innerHeight;

var areax = 0;
var areay = 0;

function init()
{
	canvas = document.getElementById("canvas");
	drawScreenshot();
	canvas.parentNode.addEventListener("mousedown", startAreaSelect, true);
}

function startAreaSelect(event)
{
	var box = document.getElementById("areaselect");
	box.hidden=false;

	areax = event.clientX;
	areay = event.clientY;
	
	box.parentNode.addEventListener("mousemove", updateAreaSelect, true);
	box.parentNode.addEventListener("mouseup", completeAreaSelect, true);
	updateAreaSelect(event);
}

function updateAreaSelect(event)
{
	var box = document.getElementById("areaselect");

	var newx = event.clientX;
	var newy = event.clientY
	
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

	var newx = event.clientX;
	var newy = event.clientY

	cropY += zoom*Math.min(newy, areay);
	cropX += zoom*Math.min(newx, areax);
	
	cropWidth = zoom*(Math.abs(newx-areax));
	cropHeight = zoom*(Math.abs(newy-areay));

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
