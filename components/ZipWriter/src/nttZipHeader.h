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

#ifndef _nttZipHeader_h_
#define _nttZipHeader_h_

#include "nsStringAPI.h"
#include "nsIBinaryOutputStream.h"

#define WRITE8(str,val) str->Write8(val)
#define WRITE16(str,val) str->Write8(val & 0xFF); str->Write8(val >> 8)
#define WRITE32(str,val) str->Write8(val & 0xFF); str->Write8((val >> 8) & 0xFF); str->Write8((val >> 16) & 0xFF); str->Write8(val >> 24)

#define READ8(buf, off) buf[off]
#define READ16(buf, off) buf[off] + (buf[off+1] << 8)
#define READ32(buf, off) buf[off] + (buf[off+1] << 8) + (buf[off+1] << 16) + (buf[off+1] << 24)

class nttZipHeader
{
public:
		nttZipHeader()
		{
		}
		
		nttZipHeader(const nsAString & aPath, PRUint64 aDate, PRUint32 aAttr, PRUint32 aOffset) :
				mVersionMade(20),
				mVersionNeeded(20),
				mFlags(0),
				mMethod(0),
				mTime(0),
				mDate(0),
				mCRC(0),
				mCSize(0),
				mUSize(0),
				mDisk(0),
				mIAttr(0),
				mEAttr(aAttr),
				mOffset(aOffset),
				mName(nsnull),
				mComment(nsnull)
		{
			mName = aPath;
			mComment = NS_LITERAL_STRING("");
		}

	 	PRUint16 mVersionMade;
		PRUint16 mVersionNeeded;
		PRUint16 mFlags;
		PRUint16 mMethod;
		PRUint16 mTime;
		PRUint16 mDate;
		PRUint32 mCRC;
		PRUint32 mCSize;
		PRUint32 mUSize;
		PRUint16 mDisk;
		PRUint16 mIAttr;
		PRUint32 mEAttr;
		PRUint32 mOffset;
		nsString mName;
		nsString mComment;

		PRUint32 GetFileHeaderLength();
		nsresult WriteFileHeader(nsIBinaryOutputStream *stream);
		PRUint32 GetCDSHeaderLength();
		nsresult WriteCDSHeader(nsIBinaryOutputStream *stream);
};

#endif
