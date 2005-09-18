/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Nightly Tester Tools.
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

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