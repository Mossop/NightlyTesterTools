var paneTitle = {

init: function()
{
	var checkbox = document.getElementById("enableTitleBar");
    checkbox.addEventListener("CheckboxStateChange",paneTitle.toggled,false);
    paneTitle.toggled();
},

toggled: function()
{
	var checkbox = document.getElementById("enableTitleBar");
	var text = document.getElementById("customTitle");
	text.disabled=!checkbox.checked;
}

}

window.addEventListener("load",paneTitle.init,false);
