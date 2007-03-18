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

#include "crctable.h"
#include "StreamFunctions.h"
#include "nttZipOutputStream.h"
#include "nttStringInputStream.h"
#include "nttDeflateConverter.h"
#include "nsComponentManagerUtils.h"
#include "nsMemory.h"

NS_IMPL_THREADSAFE_ISUPPORTS2(nttZipOutputStream, nsIOutputStream, nsIStreamListener)

nttZipOutputStream::nttZipOutputStream(nttZipWriter *aWriter, nsIOutputStream *aStream, nttZipHeader aHeader)
{
		mWriter = aWriter;
		NS_ADDREF(mWriter);
		mStream = aStream;
		mHeader = aHeader;
		mHeader.mCRC = 0xffffffff;
		
		if (mHeader.mMethod == 8)
		{
				mConverter = new nttDeflateConverter();
				mConverter->AsyncConvertData("uncompressed", "deflate", (nsIStreamListener*)this, nsnull);
		}
}

/* void close (); */
NS_IMETHODIMP nttZipOutputStream::Close()
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
				
		if (mConverter)
				mConverter->OnStopRequest(nsnull, nsnull, NS_OK);
		mConverter = nsnull;
		
		mHeader.mCRC = mHeader.mCRC ^ 0xffffffff;
		mStream = nsnull;
		nsresult rv = mWriter->OnFileEntryComplete(mHeader);
		NS_RELEASE(mWriter);
		mWriter = nsnull;

		return rv;
}

/* void flush (); */
NS_IMETHODIMP nttZipOutputStream::Flush()
{
		if (!mStream)
			return NS_ERROR_FAILURE;
			
    return mStream->Flush();
}

/* unsigned long write (in string aBuf, in unsigned long aCount); */
NS_IMETHODIMP nttZipOutputStream::Write(const char *aBuf, PRUint32 aCount, PRUint32 *_retval)
{
		if (!mStream)
			return NS_ERROR_FAILURE;
			
		nsresult rv;
		
		for (PRUint32 n = 0; n < aCount; n++)
			mHeader.mCRC = CRC_TABLE[(mHeader.mCRC ^ aBuf[n]) & 0xFF] ^ ((mHeader.mCRC >> 8) & 0xFFFFFF);
			
		if (mConverter)
		{
				nsCOMPtr<nsIInputStream> stream = new nttStringInputStream(aBuf, aCount);
				rv = mConverter->OnDataAvailable(nsnull, nsnull, stream, mHeader.mUSize, aCount);
		}
		else
		{
				rv = NTT_WriteData(mStream, aBuf, aCount);
				if (NS_FAILED(rv)) return rv;
				mHeader.mCSize += aCount;
		}
		
		*_retval = aCount;
		mHeader.mUSize += aCount;
		
    return rv;
}

/* unsigned long writeFrom (in nsIInputStream aFromStream, in unsigned long aCount); */
NS_IMETHODIMP nttZipOutputStream::WriteFrom(nsIInputStream *aFromStream, PRUint32 aCount, PRUint32 *_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* [noscript] unsigned long writeSegments (in nsReadSegmentFun aReader, in voidPtr aClosure, in unsigned long aCount); */
NS_IMETHODIMP nttZipOutputStream::WriteSegments(nsReadSegmentFun aReader, void * aClosure, PRUint32 aCount, PRUint32 *_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean isNonBlocking (); */
NS_IMETHODIMP nttZipOutputStream::IsNonBlocking(PRBool *_retval)
{
		if (!mStream)
			return NS_ERROR_FAILURE;
			
    return mStream->IsNonBlocking(_retval);
}

/* void onDataAvailable (in nsIRequest aRequest, in nsISupports aContext, in nsIInputStream aInputStream, in unsigned long aOffset, in unsigned long aCount); */
NS_IMETHODIMP nttZipOutputStream::OnDataAvailable(nsIRequest *aRequest, nsISupports *aContext, nsIInputStream *aInputStream, PRUint32 aOffset, PRUint32 aCount)
{
		nsresult rv;
		char *buf = (char*)NS_Alloc(aCount);

		rv = NTT_ReadData(aInputStream, buf, aCount);
		if (NS_FAILED(rv))
		{
				NS_Free(buf);
				return rv;
		}
		rv = NTT_WriteData(mStream, buf, aCount);
		if (NS_FAILED(rv))
		{
				NS_Free(buf);
				return rv;
		}
		mHeader.mCSize += aCount;
		NS_Free(buf);
		return NS_OK;
}

/* void onStartRequest (in nsIRequest aRequest, in nsISupports aContext); */
NS_IMETHODIMP nttZipOutputStream::OnStartRequest(nsIRequest *aRequest, nsISupports *aContext)
{
		return NS_OK;
}

/* void onStopRequest (in nsIRequest aRequest, in nsISupports aContext, in nsresult aStatusCode); */
NS_IMETHODIMP nttZipOutputStream::OnStopRequest(nsIRequest *aRequest, nsISupports *aContext, nsresult aStatusCode)
{
		return NS_OK;
}
