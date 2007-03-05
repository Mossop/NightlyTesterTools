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

#include "nttDeflateConverter.h"
#include "nsComponentManagerUtils.h"
#include "nspr.h"

NS_IMPL_ISUPPORTS1(nttDeflateConverter, nsIStreamConverter)

nsresult gZlibInit(z_stream *zs)
{
		memset(zs, 0, sizeof(z_stream));

		return NS_OK;
}

/* nsIInputStream convert (in nsIInputStream aFromStream, in string aFromType, in string aToType, in nsISupports aCtxt); */
NS_IMETHODIMP nttDeflateConverter::Convert(nsIInputStream *aFromStream, const char *aFromType, const char *aToType, nsISupports *aCtxt, nsIInputStream **_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void asyncConvertData (in string aFromType, in string aToType, in nsIStreamListener aListener, in nsISupports aCtxt); */
NS_IMETHODIMP nttDeflateConverter::AsyncConvertData(const char *aFromType, const char *aToType, nsIStreamListener *aListener, nsISupports *aCtxt)
{
		nsresult rv;
		int zerr;
		
		mOffset = 0;
    mListener = aListener;
    mPipe = do_CreateInstance("@mozilla.org/pipe;1");
		mDeflate = (DeflateStruct*) PR_Malloc(sizeof(DeflateStruct));
		NS_ENSURE_TRUE(mDeflate, NS_ERROR_OUT_OF_MEMORY);

		rv = gZlibInit(&(mDeflate->mZs));
		NS_ENSURE_SUCCESS(rv, NS_ERROR_OUT_OF_MEMORY);
		zerr = deflateInit2(&mDeflate->mZs,
				                -1,
				                Z_DEFLATED,
				                -MAX_WBITS,
				                8,
				                Z_DEFAULT_STRATEGY);
		if (zerr != Z_OK) return NS_ERROR_OUT_OF_MEMORY;

		mDeflate->mZs.next_out = mDeflate->mWriteBuf;
		mDeflate->mZs.avail_out = ZIP_BUFLEN;
    return NS_OK;
}

/* void onDataAvailable (in nsIRequest aRequest, in nsISupports aContext, in nsIInputStream aInputStream, in unsigned long aOffset, in unsigned long aCount); */
NS_IMETHODIMP nttDeflateConverter::OnDataAvailable(nsIRequest *aRequest, nsISupports *aContext, nsIInputStream *aInputStream, PRUint32 aOffset, PRUint32 aCount)
{
		nsresult rv;
		
		char* aBuffer = (char*)NS_Alloc(aCount);
		PRUint32 aBytesWrite;
		rv = aInputStream->Read(aBuffer, aCount, &aBytesWrite);
    
		const PRUint32 oldTotalOut = mDeflate->mZs.total_out;
	
		// make sure we aren't reading too much
		mDeflate->mZs.avail_in = aCount;
		mDeflate->mZs.next_in = (unsigned char*)aBuffer;
	
		aBytesWrite = 0;
		int zerr = Z_OK;
		// deflate loop
		while (mDeflate->mZs.avail_in > 0 && zerr == Z_OK) {
				zerr = deflate(&(mDeflate->mZs), Z_NO_FLUSH);
		
				while (mDeflate->mZs.avail_out == 0) {
						// buffer is full, time to write it to disk!
						nsresult rv = PushAvailableData(aRequest, aContext);
						NS_ENSURE_SUCCESS(rv, rv);
						zerr = deflate(&(mDeflate->mZs), Z_NO_FLUSH);
				}
		}
		
		aBytesWrite = (mDeflate->mZs.total_out - oldTotalOut);
		
		NS_Free(aBuffer);
		
		return NS_OK;
}

/* void onStartRequest (in nsIRequest aRequest, in nsISupports aContext); */
NS_IMETHODIMP nttDeflateConverter::OnStartRequest(nsIRequest *aRequest, nsISupports *aContext)
{
    return mListener->OnStartRequest(aRequest, aContext);
}

/* void onStopRequest (in nsIRequest aRequest, in nsISupports aContext, in nsresult aStatusCode); */
NS_IMETHODIMP nttDeflateConverter::OnStopRequest(nsIRequest *aRequest, nsISupports *aContext, nsresult aStatusCode)
{
		nsresult rv;
	
		int zerr;
		do {
				zerr = deflate(&(mDeflate->mZs), Z_FINISH);
				// TODO check whether output size smaller than input size
				rv = PushAvailableData(aRequest, aContext);
				NS_ENSURE_SUCCESS(rv, rv);
		} while (zerr == Z_OK);

		deflateEnd(&(mDeflate->mZs));

		PR_FREEIF(mDeflate);

    return mListener->OnStopRequest(aRequest, aContext, aStatusCode);
}

nsresult nttDeflateConverter::PushAvailableData(nsIRequest *aRequest, nsISupports *aContext)
{
		nsresult rv;
		
		nsCOMPtr<nsIAsyncOutputStream> out;
		mPipe->GetOutputStream(getter_AddRefs(out));
		nsCOMPtr<nsIAsyncInputStream> in;
		mPipe->GetInputStream(getter_AddRefs(in));
		
		PRUint32 bytesToWrite = ZIP_BUFLEN - mDeflate->mZs.avail_out;
		PRUint32 bytesWritten;

		rv = out->Write((char*)mDeflate->mWriteBuf, bytesToWrite, &bytesWritten);
		if (NS_FAILED(rv)) return rv;
		if (bytesWritten < bytesToWrite)
				return NS_ERROR_FAILURE;
		
		// now set the state for 'deflate'
		mDeflate->mZs.next_out = mDeflate->mWriteBuf;
		mDeflate->mZs.avail_out = ZIP_BUFLEN;
		
		rv = mListener->OnDataAvailable(aRequest, aContext, in, mOffset, bytesWritten);
		mOffset += bytesWritten;
		return rv;
}
