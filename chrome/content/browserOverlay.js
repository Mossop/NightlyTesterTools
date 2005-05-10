function copyBuildID()
{
	var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].
										getService(Components.interfaces.nsIFileInputStream);
	var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
										getService(Components.interfaces.nsIProperties);

	var datafile = directoryService.get("ProfD",Components.interfaces.nsIFile);
	datafile.append("compatibility.ini");
	stream.init(datafile,1,384,Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);
	stream.QueryInterface(Components.interfaces.nsILineInputStream);
	var buildid = "";
	var line = { value: null };
	while (stream.readLine(line))
	{
		var bits = line.value.split("=");
		if (bits[0]=="LastVersion")
		{
			bits=bits[1].split("_");
			buildid=" ID:"+bits[bits.length-1];
		}
	}
	
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(navigator.userAgent+buildid);
}
