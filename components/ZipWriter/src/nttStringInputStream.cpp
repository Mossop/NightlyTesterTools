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
#include "nttStringInputStream.h"

NS_IMPL_THREADSAFE_ISUPPORTS1(nttStringInputStream, nsIInputStream)

nttStringInputStream::nttStringInputStream(const char *buffer, PRUint32 count)
{
    mCount = count;
    mBuffer = buffer;
    mOffset = 0;
}

/* void close (); */
NS_IMETHODIMP nttStringInputStream::Close()
{
    return NS_OK;
}

/* unsigned long available (); */
NS_IMETHODIMP nttStringInputStream::Available(PRUint32 *_retval)
{
    *_retval = mCount - mOffset;
    return NS_OK;
}

/* [noscript] unsigned long read (in charPtr aBuf, in unsigned long aCount); */
NS_IMETHODIMP nttStringInputStream::Read(char * aBuf, PRUint32 aCount, PRUint32 *_retval)
{
    PRUint32 avail = mCount - mOffset;
    if (avail < aCount)
        aCount = avail;
    
    memcpy(aBuf, mBuffer+mOffset, aCount);
    *_retval = aCount;
    mOffset += aCount;

    return NS_OK;
}

/* [noscript] unsigned long readSegments (in nsWriteSegmentFun aWriter, in voidPtr aClosure, in unsigned long aCount); */
NS_IMETHODIMP nttStringInputStream::ReadSegments(nsWriteSegmentFun aWriter, void * aClosure, PRUint32 aCount, PRUint32 *_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* boolean isNonBlocking (); */
NS_IMETHODIMP nttStringInputStream::IsNonBlocking(PRBool *_retval)
{
    *_retval = PR_FALSE;
    return NS_OK;
}
