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
 * The Original Code is Nightly Tester Tools
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Mook <mook.moz+random.code@gmail.com>
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

#ifndef _nttZipWriter_h_
#define _nttZipWriter_h_

#include "nttIZipWriter.h"
#include "nsIFileStreams.h"
#include "nsIBufferedStreams.h"
#include "nttZipHeader.h"
#include "nsCOMPtr.h"
#include "nsCOMArray.h"
#include "nsTArray.h"

#define ZIPWRITER_CONTRACTID "@blueprintit.co.uk/zipwriter;1"
#define ZIPWRITER_CLASSNAME "Nightly Tester Tools Zip Writer"
#define ZIPWRITER_CID { 0x5f57d36a, 0x3732, 0x40c6, { 0x9a, 0xb2, 0x5d, 0x39, 0xfd, 0x47, 0x12, 0xbc } }

class nttZipQueueItem
{
public:
    nsString mPath;
    nsCOMPtr<nsIFile> mFile;
};

class nttZipWriter : public nttIZipWriter
                   , public nsIRequestObserver
{
public:
    NS_DECL_ISUPPORTS
    NS_DECL_NTTIZIPWRITER
    NS_DECL_NSIREQUESTOBSERVER
  
    nttZipWriter();
    nsresult OnFileEntryComplete(nttZipHeader *header);
  
private:
    ~nttZipWriter();
    nsCOMPtr<nsIBufferedOutputStream> mStream;
    nsCOMArray<nttZipHeader> mHeaders;
    PRUint32 mCDSOffset;
    PRBool mCDSDirty;
    nsString mComment;
    
    PRBool mBusy;
    PRBool mProcessing;
    nsTArray<nttZipQueueItem> mQueue;
    nsCOMPtr<nsIFile> mFile;
    nsCOMPtr<nsIBufferedOutputStream> mProcessOutputStream;
    nsCOMPtr<nsIRequestObserver> mProcessObserver;
    nsCOMPtr<nsISupports> mProcessContext;
    
    nsresult nttZipWriter::ReadFile(nsIFile *file);
    void BeginProcessingNextItem();
    void FinishQueue(nsresult status);
    PRInt32 FindEntry(const nsAString & path);
};

#endif
