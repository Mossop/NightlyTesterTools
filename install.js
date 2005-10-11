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
const APP_PACKAGE = "nightly";
const APP_VERSION = "0.7.9.9";

const APP_PREFS_FILES = [
  "nightlytools.js",
  "variables.js"
  ];
const APP_LOCALES = [
  "en-US",
  "it-IT",
  "de-DE",
  "es-ES",
  "fr-FR",
  "hu-HU",
  "pt-BR",
  "ru-RU",
  "ja"
  ];

const INST_TO_PROFILE = "Do you wish to install "+APP_DISPLAY_NAME+" to your profile?\nThis will mean it does not need reinstalling when you update Seamonkey.\n(Click Cancel if you want "+APP_DISPLAY_NAME+" to be installed to the application directory.)";
const APP_SUCCESS_MESSAGE = "You must restart Seamonkey to activate "+APP_DISPLAY_NAME;

const APP_CHROME_FOLDER = "chrome/" + APP_PACKAGE;
const APP_CONTENT_FOLDER = "content/";
const APP_SKIN_FOLDER = "skin/";
const APP_LOCALE_FOLDER = "locale/";
const APP_PREF_FOLDER = "defaults/preferences/"

var err;
initInstall(APP_DISPLAY_NAME, APP_PACKAGE, APP_VERSION);

// profile installs only work since 2003-03-06
var instToProfile = (buildID>2003030600 && confirm(INST_TO_PROFILE));

const chromeFolder = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
const chromeFlag = instToProfile ? PROFILE_CHROME : DELAYED_CHROME;
const prefFolder = false ? getFolder(getFolder("Profile"),"pref")
                              : getFolder(getFolder(getFolder("Program"),"defaults"),"pref");

err = addDirectory(APP_PACKAGE, APP_VERSION, APP_CHROME_FOLDER, chromeFolder, APP_PACKAGE);

if (err == SUCCESS)
{
  if (!File.exists(prefFolder))
  {
    File.dirCreate(prefFolder);
  }
  for (var j=0; (j<APP_PREFS_FILES.length && err==SUCCESS); j++)
  {
    err = addFile(APP_PACKAGE, APP_VERSION,  APP_PREF_FOLDER + APP_PREFS_FILES[j], prefFolder, null, true);
    logComment("Adding "+APP_PREFS_FILES[j]+" in "+prefFolder+": exit code = "+err);
  }
}

if (err == SUCCESS)
{
	var base = getFolder(chromeFolder, APP_PACKAGE);
 
  registerChrome(CONTENT | chromeFlag, base, APP_CONTENT_FOLDER);
  registerChrome(SKIN | chromeFlag, base, APP_SKIN_FOLDER);
  for (var l=0; l<APP_LOCALES.length; l++)
  {
    registerChrome(LOCALE | chromeFlag, base, APP_LOCALE_FOLDER + APP_LOCALES[l] + "/");
  }
  
  err = performInstall();
  if (err == SUCCESS || err == 999)
  {
    alert(APP_DISPLAY_NAME+" "+APP_VERSION+" has been succesfully installed.\n"+APP_SUCCESS_MESSAGE);
  }
  else
  {
    alert("Installation failed for an unknown reason. Error code:" + err);
    cancelInstall(err);
  }
}
else
{
  alert("Failed to install " +APP_DISPLAY_NAME +"\n"
    +"You probably don't have appropriate permissions \n"
    +"(write access to your profile or chrome directory). \n"
    +"Error code: " + err);
  cancelInstall(err);
}
