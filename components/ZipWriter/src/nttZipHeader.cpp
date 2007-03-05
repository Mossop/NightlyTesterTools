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

#include "nttZipHeader.h"
 
PRUint32 nttZipHeader::GetFileHeaderLength()
{
		return 4+2+2+2+2+2+4+4+4+2+2+mName.Length();
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
		WRITE16(stream, mName.Length());
		WRITE16(stream, 0);

		for (PRUint32 i = 0; i<mName.Length(); i++)
				WRITE8(stream, mName[i]);

		return NS_OK;
}

PRUint32 nttZipHeader::GetCDSHeaderLength()
{
		return 4+2+2+2+2+2+2+4+4+4+2+2+2+2+2+4+4+mName.Length()+mComment.Length();
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
		WRITE16(stream, mName.Length());
		WRITE16(stream, 0);
		WRITE16(stream, mComment.Length());
		WRITE16(stream, mDisk);
		WRITE16(stream, mIAttr);
		WRITE32(stream, mEAttr);
		WRITE32(stream, mOffset);

		for (PRUint32 i = 0; i<mName.Length(); i++)
				WRITE8(stream, mName[i]);

		for (PRUint32 i = 0; i<mComment.Length(); i++)
				WRITE8(stream, mComment[i]);

		return NS_OK;
}
