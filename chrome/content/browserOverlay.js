nightly = {

preferences: Components.classes["@mozilla.org/preferences-service;1"].
                   	getService(Components.interfaces.nsIPrefService).getBranch("extensions.nightlytools."),

variables: {
},

getVariable: function(name)
{
	name=name.toUpperCase();
	var varvalue = nightly.preferences.getCharPref("variables."+name);
	if (!varvalue)
	{
		varvalue = eval("nightly.variables."+name);
	}
	else
	{
		varvalue=eval(varvalue);
	}
	return varvalue;
},

generateText: function(template)
{
	var start=0;
	var pos = template.indexOf("${",start);
	while (pos>=0)
	{
		if ((pos==0)||(template.charAt(pos-1)!="$"))
		{
			var endpos = template.indexOf("}",pos+2);
			if (endpos>=0)
			{
				var varname = template.substring(pos+2,endpos);
				var varvalue = nightly.getVariable(varname);
				if (varvalue)
				{
					template=template.substring(0,pos)+varvalue+template.substring(endpos+1,template.length);
					start=pos+varvalue.length;
				}
				else
				{
					start=endpos+1;
				}
			}
		}
		else
		{
			start=pos+2;
		}
		pos=template.indexOf("${",start);
	}
	return template;
},

copyText: function(template)
{
  var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
                                         getService(Components.interfaces.nsIClipboardHelper);
  clipboard.copyString(nightly.generateText(template));
},

copyTemplate: function(name)
{
	nightly.copyText(nightly.preferences.getCharPref("templates."+name));
}

}
