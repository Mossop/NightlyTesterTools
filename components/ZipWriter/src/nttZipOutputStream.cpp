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
 * $HeadURL: svn://svn.blueprintit.co.uk/dave/mozilla/firefox/FindBar/trunk/components/src/fbTextExtractor.cpp $
 * $LastChangedBy: dave $
 * $Date: 2006-10-28 23:31:36 +0100 (Sat, 28 Oct 2006) $
 * $Revision: 858 $
 *
 */

#include "crctable.h"
#include "nttZipOutputStream.h"

NS_IMPL_THREADSAFE_ISUPPORTS1(nttZipOutputStream, nsIOutputStream)

nsresult nttZipOutputStream::Init(nttZipWriter *aWriter, nsIOutputStream *aStream, nttZipHeader *aHeader)
{
		mWriter = aWriter;
		mStream = aStream;
		mHeader = aHeader;
		mSize = 0;
		mCRC = 0xffffffff;
		return NS_OK;
}

/* void close (); */
NS_IMETHODIMP nttZipOutputStream::Close()
{
		mHeader->mCRC = mCRC ^ 0xffffffff;
		mHeader->mCSize = mSize;
		mHeader->mUSize = mSize;
		return mWriter->OnFileEntryComplete(mHeader);
}

/* void flush (); */
NS_IMETHODIMP nttZipOutputStream::Flush()
{
    return mStream->Flush();
}

/* unsigned long write (in string aBuf, in unsigned long aCount); */
NS_IMETHODIMP nttZipOutputStream::Write(const char *aBuf, PRUint32 aCount, PRUint32 *_retval)
{
		nsresult rv;
		
		rv = mStream->Write(aBuf, aCount, _retval);
		if (NS_FAILED(rv)) return rv;
	
		for (PRUint32 n = 0; n < *_retval; n++)
			mCRC = CRC_TABLE[(mCRC ^ aBuf[n]) & 0xFF] ^ ((mCRC >> 8) & 0xFFFFFF);
			
		mSize += *_retval;

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
    return mStream->IsNonBlocking(_retval);
}
