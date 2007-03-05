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
 *      Lan Qiang <jameslan@gmail.com>
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

#ifndef _nttDeflateConverter_h_
#define _nttDeflateConverter_h_

#include "nsIStreamConverter.h"
#include "nsCOMPtr.h"
#include "nsIPipe.h"
#include "zlib.h"

#define DEFLATECONVERTER_CONTRACTID "@mozilla.org/streamconv;1?from=uncompressed&to=deflate"
#define DEFLATECONVERTER_CLASSNAME "Deflate converter"
#define DEFLATECONVERTER_CID { 0x0ed5d497, 0xf13d, 0x4382, { 0x82, 0x05, 0x3e, 0x32, 0xb9, 0xca, 0x3a, 0x1c } }

#define NBUCKETS 6
#define BY4ALLOC_ITEMS 320
#define ZIP_BUFLEN    (4 * 1024 - 1)

class nttDeflateConverter : public nsIStreamConverter
{
public:
	  NS_DECL_ISUPPORTS
    NS_DECL_NSIREQUESTOBSERVER
    NS_DECL_NSISTREAMLISTENER
 	  NS_DECL_NSISTREAMCONVERTER
	  
	  nttDeflateConverter()
	  {
	  }
	
private:

	  ~nttDeflateConverter()
	  {
	  }
	  
	  nsCOMPtr<nsIPipe> mPipe;
	  nsCOMPtr<nsIStreamListener> mListener;
	  PRUint32 mOffset;
		struct DeflateStruct {
				z_stream         mZs;
				unsigned char    mWriteBuf[ZIP_BUFLEN];
		};
		struct DeflateStruct* mDeflate;
		
		nsresult PushAvailableData(nsIRequest *aRequest, nsISupports *aContext);
};

#endif
