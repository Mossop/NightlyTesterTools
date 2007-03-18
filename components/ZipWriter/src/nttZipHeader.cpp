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

void nttZipHeader::Init(const nsAString & aPath, PRUint64 aDate, PRUint32 aAttr, PRUint32 aOffset)
{
		mEAttr = aAttr;
		mOffset = aOffset;
		mName = aPath;
		mComment = NS_LITERAL_STRING("");
		nsCAutoString str = NS_ConvertUTF16toUTF8(aPath);
		if (str.Length() != aPath.Length())
				mFlags = mFlags | 0x800;
}

PRUint32 nttZipHeader::GetFileHeaderLength()
{
		return 4+2+2+2+2+2+4+4+4+2+2+GetStringLength(mName);
}

nsresult nttZipHeader::WriteFileHeader(nsIBinaryOutputStream *stream)
{
		WRITE32(stream, 0x04034b50);
		WRITE16(stream, mVersionNeeded);
		WRITE16(stream, mFlags);
		WRITE16(stream, mMethod);
		WRITE16(stream, mTime);
		WRITE16(stream, mDate);
		WRITE32(stream, mCRC);
		WRITE32(stream, mCSize);
		WRITE32(stream, mUSize);
		WRITE16(stream, GetStringLength(mName));
		WRITE16(stream, 0);

		WriteString(mName, stream);

		return NS_OK;
}

PRUint32 nttZipHeader::GetCDSHeaderLength()
{
		return 4+2+2+2+2+2+2+4+4+4+2+2+2+2+2+4+4+GetStringLength(mName)+GetStringLength(mComment);
}

nsresult nttZipHeader::WriteCDSHeader(nsIBinaryOutputStream *stream)
{
		WRITE32(stream, 0x02014b50);
		WRITE16(stream, mVersionMade);
		WRITE16(stream, mVersionNeeded);
		WRITE16(stream, mFlags);
		WRITE16(stream, mMethod);
		WRITE16(stream, mTime);
		WRITE16(stream, mDate);
		WRITE32(stream, mCRC);
		WRITE32(stream, mCSize);
		WRITE32(stream, mUSize);
		WRITE16(stream, GetStringLength(mName));
		WRITE16(stream, 0);
		WRITE16(stream, GetStringLength(mComment));
		WRITE16(stream, mDisk);
		WRITE16(stream, mIAttr);
		WRITE32(stream, mEAttr);
		WRITE32(stream, mOffset);

		WriteString(mName, stream);		
		WriteString(mComment, stream);

		return NS_OK;
}

nsresult nttZipHeader::ReadCDSHeader(nsIInputStream *stream)
{
		char buf[46];
		nsresult rv;
		
		PRUint32 count;
		rv = NTT_ReadData(stream, buf, 46);
		if (NS_FAILED(rv)) return rv;
		
		PRUint32 signature     = READ32(buf, 0);
		if (signature != 0x02014b50)
				return NS_ERROR_FAILURE;
				
		mVersionMade           = READ16(buf, 4);
		mVersionNeeded         = READ16(buf, 6);
		mFlags                 = READ16(buf, 8);
		mMethod                = READ16(buf, 10);
		mTime                  = READ16(buf, 12);
		mDate                  = READ16(buf, 14);
		mCRC                   = READ32(buf, 16);
		mCSize                 = READ32(buf, 20);
		mUSize                 = READ32(buf, 24);
		PRUint16 namelength    = READ16(buf, 28);
		PRUint16 fieldlength   = READ16(buf, 30);
		PRUint16 commentlength = READ16(buf, 32);
		mDisk                  = READ16(buf, 34);
		mIAttr                 = READ16(buf, 36);
		mEAttr                 = READ32(buf, 38);
		mOffset                = READ32(buf, 42);
		
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

PRUint32 nttZipHeader::GetStringLength(const nsAString & string)
{
		if (mFlags & 0x800)
		{
				nsCAutoString str = NS_ConvertUTF16toUTF8(string);
				return str.Length();
		}
		else
		{
				return string.Length();
		}
}

void nttZipHeader::WriteString(const nsAString & string, nsIBinaryOutputStream *stream)
{
		if (mFlags & 0x800)
		{
				nsCAutoString str = NS_ConvertUTF16toUTF8(string);
				for (PRUint32 i = 0; i<str.Length(); i++)
						WRITE8(stream, str[i]);
		}
		else
		{
				for (PRUint32 i = 0; i<string.Length(); i++)
						WRITE8(stream, string[i] & 0xff);
		}
}
