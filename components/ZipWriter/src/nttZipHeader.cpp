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

#include "StreamFunctions.h"
#include "nttZipHeader.h"
#include "nsMemory.h"
#include "time.h"

#define ZIP_FILE_HEADER_SIGNATURE 0x04034b50
#define ZIP_FILE_HEADER_SIZE 30
#define ZIP_CDS_HEADER_SIGNATURE 0x02014b50
#define ZIP_CDS_HEADER_SIZE 46

NS_IMPL_ISUPPORTS1(nttZipHeader, nsIZipEntry)

/* readonly attribute unsigned short compression; */
NS_IMETHODIMP nttZipHeader::GetCompression(PRUint16 *aCompression)
{
    *aCompression = mMethod;
    return NS_OK;
}

/* readonly attribute unsigned long size; */
NS_IMETHODIMP nttZipHeader::GetSize(PRUint32 *aSize)
{
    *aSize = mCSize;
    return NS_OK;
}

/* readonly attribute unsigned long realSize; */
NS_IMETHODIMP nttZipHeader::GetRealSize(PRUint32 *aRealSize)
{
    *aRealSize = mUSize;
    return NS_OK;
}

/* readonly attribute unsigned long CRC32; */
NS_IMETHODIMP nttZipHeader::GetCRC32(PRUint32 *aCRC32)
{
    *aCRC32 = mCRC;
    return NS_OK;
}

/* readonly attribute boolean isDirectory; */
NS_IMETHODIMP nttZipHeader::GetIsDirectory(PRBool *aIsDirectory)
{
    const nsAString& last = Substring(mName, mName.Length()-1);
    if (last.Equals(NS_LITERAL_STRING("/")))
        *aIsDirectory = PR_TRUE;
    else
        *aIsDirectory = PR_FALSE;
    return NS_OK;
}

/* readonly attribute PRTime lastModifiedTime; */
NS_IMETHODIMP nttZipHeader::GetLastModifiedTime(PRTime *aLastModifiedTime)
{
    struct tm time;
    
    time.tm_hour = mTime >> 11;
    time.tm_min = (mTime >> 5) % 64;
    time.tm_sec = (mTime % 32) * 2;
    
    time.tm_year = mDate >> 11;
    time.tm_mon = ((mDate >> 5) % 16)-1;
    time.tm_mday = mDate % 32;
    
    *aLastModifiedTime = (PRTime)mktime(&time);
    
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* readonly attribute boolean isSynthetic; */
NS_IMETHODIMP nttZipHeader::GetIsSynthetic(PRBool *aIsSynthetic)
{
    *aIsSynthetic = PR_FALSE;
    return NS_OK;
}

void nttZipHeader::Init(const nsAString & aPath, PRTime aDate, PRUint32 aAttr, PRUint32 aOffset)
{
    mMethod = 8;
    aDate /= 1000;
    time_t timeval = (time_t)aDate;
    struct tm *time = localtime(&timeval);
    mTime = time->tm_sec/2 + (time->tm_min << 5) + (time->tm_hour << 11);
    mDate = time->tm_mday + ((time->tm_mon+1) << 5) + ((time->tm_year-80) << 9);
        
    mEAttr = aAttr;
    mOffset = aOffset;
    mName = aPath;
    mComment = NS_LITERAL_STRING("");
    nsCString str = NS_ConvertUTF16toUTF8(aPath);
    if (str.Length() != aPath.Length())
        mFlags = mFlags | 0x800;
}

PRUint32 nttZipHeader::GetFileHeaderLength()
{
    nsCString name;
    GetCodedString(mName, name);
    return ZIP_FILE_HEADER_SIZE+name.Length();
}

nsresult nttZipHeader::WriteFileHeader(nsIOutputStream *stream)
{
    nsresult rv;
    
    nsCString name;
    GetCodedString(mName, name);

    char buf[ZIP_FILE_HEADER_SIZE];
    PRUint32 pos = 0;
    WRITE32(buf, pos, ZIP_FILE_HEADER_SIGNATURE);
    WRITE16(buf, pos, mVersionNeeded);
    WRITE16(buf, pos, mFlags);
    WRITE16(buf, pos, mMethod);
    WRITE16(buf, pos, mTime);
    WRITE16(buf, pos, mDate);
    WRITE32(buf, pos, mCRC);
    WRITE32(buf, pos, mCSize);
    WRITE32(buf, pos, mUSize);
    WRITE16(buf, pos, name.Length());
    WRITE16(buf, pos, 0);

    rv = NTT_WriteData(stream, buf, pos);
    if (NS_FAILED(rv)) return rv;

    return NTT_WriteData(stream, name.get(), name.Length());
}

PRUint32 nttZipHeader::GetCDSHeaderLength()
{
    nsCString name;
    GetCodedString(mName, name);
    nsCString comment;
    GetCodedString(mComment, comment);
    return 4+2+2+2+2+2+2+4+4+4+2+2+2+2+2+4+4+name.Length()+comment.Length();
}

nsresult nttZipHeader::WriteCDSHeader(nsIOutputStream *stream)
{
    nsresult rv;
    
    nsCString name;
    GetCodedString(mName, name);
    nsCString comment;
    GetCodedString(mComment, comment);
    
    char buf[ZIP_CDS_HEADER_SIZE];
    PRUint32 pos = 0;
    WRITE32(buf, pos, ZIP_CDS_HEADER_SIGNATURE);
    WRITE16(buf, pos, mVersionMade);
    WRITE16(buf, pos, mVersionNeeded);
    WRITE16(buf, pos, mFlags);
    WRITE16(buf, pos, mMethod);
    WRITE16(buf, pos, mTime);
    WRITE16(buf, pos, mDate);
    WRITE32(buf, pos, mCRC);
    WRITE32(buf, pos, mCSize);
    WRITE32(buf, pos, mUSize);
    WRITE16(buf, pos, name.Length());
    WRITE16(buf, pos, 0);
    WRITE16(buf, pos, comment.Length());
    WRITE16(buf, pos, mDisk);
    WRITE16(buf, pos, mIAttr);
    WRITE32(buf, pos, mEAttr);
    WRITE32(buf, pos, mOffset);

    rv = NTT_WriteData(stream, buf, pos);
    if (NS_FAILED(rv)) return rv;

    rv = NTT_WriteData(stream, name.get(), name.Length());
    if (NS_FAILED(rv)) return rv;
    return NTT_WriteData(stream, comment.get(), comment.Length());
}

nsresult nttZipHeader::ReadCDSHeader(nsIInputStream *stream)
{
    char buf[ZIP_CDS_HEADER_SIZE];
    nsresult rv;
    
    rv = NTT_ReadData(stream, buf, ZIP_CDS_HEADER_SIZE);
    if (NS_FAILED(rv)) return rv;
    
    PRUint32 signature;
    PRUint16 namelength;
    PRUint16 fieldlength;
    PRUint16 commentlength;

    PRUint32 pos = 0;
    READ32(buf, pos, signature);
    if (signature != ZIP_CDS_HEADER_SIGNATURE)
        return NS_ERROR_FAILURE;
    
    READ16(buf, pos, mVersionMade);
    READ16(buf, pos, mVersionNeeded);
    READ16(buf, pos, mFlags);
    READ16(buf, pos, mMethod);
    READ16(buf, pos, mTime);
    READ16(buf, pos, mDate);
    READ32(buf, pos, mCRC);
    READ32(buf, pos, mCSize);
    READ32(buf, pos, mUSize);
    READ16(buf, pos, namelength);
    READ16(buf, pos, fieldlength);
    READ16(buf, pos, commentlength);
    READ16(buf, pos, mDisk);
    READ16(buf, pos, mIAttr);
    READ32(buf, pos, mEAttr);
    READ32(buf, pos, mOffset);
    
    char *field = (char*)NS_Alloc(namelength);
    rv = NTT_ReadData(stream, field, namelength);
    if (NS_FAILED(rv))
    {
        NS_Free(field);
        return rv;
    }
    if (mFlags & 0x800)
        mName = NS_ConvertUTF8toUTF16(field, namelength);
    else
        mName = NS_ConvertASCIItoUTF16(field, namelength);
    NS_Free(field);
    
    field = (char*)NS_Alloc(fieldlength);
    rv = NTT_ReadData(stream, field, fieldlength);
    if (NS_FAILED(rv))
    {
        NS_Free(field);
        return rv;
    }
    NS_Free(field);
    
    field = (char*)NS_Alloc(commentlength);
    rv = NTT_ReadData(stream, field, commentlength);
    if (NS_FAILED(rv))
    {
        NS_Free(field);
        return rv;
    }
    if (mFlags & 0x800)
        mComment = NS_ConvertUTF8toUTF16(field, commentlength);
    else
        mComment = NS_ConvertASCIItoUTF16(field, commentlength);
    NS_Free(field);
    
    return NS_OK;
}

void nttZipHeader::GetCodedString(const nsAString & string, nsACString & retval)
{
    nsCString str;
    if (mFlags & 0x800)
        str = NS_ConvertUTF16toUTF8(string);
    else
        str = NS_LossyConvertUTF16toASCII(string);
    retval = str;
}
