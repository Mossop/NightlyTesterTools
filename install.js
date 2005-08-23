const APP_DISPLAY_NAME = "Nightly Tester Tools";
const APP_NAME = "nightly";
const APP_PACKAGE = "nightly";
const APP_VERSION = "0.6.5";

const APP_PREFS_FILES = [
  "defaults/preferences/nightlytools.js",
  "defaults/preferences/variables.js"
  ];
const APP_JAR_FILE = "nightly.jar";
const APP_CONTENT_FOLDER = "content/";
const APP_LOCALES = [
  "en-US",
  "it-IT"
  ];

const APP_SUCCESS_MESSAGE = "";

const INST_TO_PROFILE = "Do you wish to install "+APP_DISPLAY_NAME+" to your profile?\nThis will mean it does not need reinstalling when you update Mozilla.\n(Click Cancel if you want "+APP_DISPLAY_NAME+" installing to the Mozilla directory.)";


var err;
initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

// profile installs only work since 2003-03-06
var instToProfile = (buildID>2003030600 && confirm(INST_TO_PROFILE));

var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
err = addFile(APP_PACKAGE, APP_VERSION, "chrome/" + APP_JAR_FILE, chromef, null);

if(err == SUCCESS) {
  const prefDirs=[
    getFolder(getFolder("Profile"),"pref"),
    getFolder(getFolder(getFolder("Program"),"defaults"),"pref")
    ];
  for(var j=prefDirs.length; j-->0;) {
    var prefDir=prefDirs[j];
    if(!File.exists(prefDir)) {
      File.dirCreate(prefDir);
    }
    for(var j=APP_PREFS_FILES.length; (j-->0)&&(err==SUCCESS);) {
      err = addFile(APP_PACKAGE, APP_VERSION,  APP_PREFS_FILES[j], prefDir, null, true);
      logComment("Adding "+APP_PREFS_FILES[j]+" in "+prefDir+": exit code = "+err);
    }
  }
}

if(err == SUCCESS) {
	var jar = getFolder(chromef, APP_JAR_FILE);
	const chromeFlag=instToProfile?PROFILE_CHROME:DELAYED_CHROME;
 
  registerChrome(CONTENT | chromeFlag, jar, APP_CONTENT_FOLDER);
  var localesCount=APP_LOCALES.length;
  while(localesCount-- >0) {
    registerChrome(LOCALE  | chromeFlag, jar, "locale/"+APP_LOCALES[localesCount]+"/");
  }
  registerChrome(SKIN | chromeFlag, jar, "skin/");
  
  err = performInstall();
  if(err == SUCCESS || err == 999) {
    alert(APP_DISPLAY_NAME+" "+APP_VERSION+" has been succesfully installed.\n"+APP_SUCCESS_MESSAGE);
  } else {
    alert("Install failed!!! Error code:" + err);
    cancelInstall(err);
  }
} else {
  alert("Failed to create " +APP_JAR_FILE +"\n"
    +"You probably don't have appropriate permissions \n"
    +"(write access to your profile or chrome directory). \n"
    +"_____________________________\nError code:" + err);
  cancelInstall(err);
}