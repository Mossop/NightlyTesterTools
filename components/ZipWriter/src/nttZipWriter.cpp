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

#include "nttZipWriter.h"
#include "nsComponentManagerUtils.h"

NS_IMPL_ISUPPORTS1(nttZipWriter, nttIZipWriter)

nttZipWriter::nttZipWriter()
{
  /* member initializers and constructor code */
}

nttZipWriter::~nttZipWriter()
{
  /* destructor code */
}

/* boolean isBusy (); */
NS_IMETHODIMP nttZipWriter::IsBusy(PRBool *_retval)
{
		*_retval = mBusy;
    return NS_OK;
}

/* void create (in nsIFile file); */
NS_IMETHODIMP nttZipWriter::Create(nsIFile *file)
{
		if (mStream)
				return NS_ERROR_ALREADY_INITIALIZED;
	
		nsresult rv;
		mStream = do_CreateInstance("@mozilla.org/network/file-output-stream;1", &rv);
		if (NS_FAILED(rv)) return rv;
		
		rv = mStream->Init(file, 0x02 | 0x08 | 0x20, 0664, 0);
		if (NS_FAILED(rv)) return rv;

		mBStream = do_CreateInstance("@mozilla.org/binaryoutputstream;1", &rv);
		if (NS_FAILED(rv)) return rv;
		
		rv = mBStream->SetOutputStream(mStream);
		if (NS_FAILED(rv)) return rv;

		mBusy = PR_FALSE;
		mProcessing = PR_FALSE;
		mOffset = 0;
		mComment = NS_LITERAL_STRING("");

    return NS_OK;
}

/* void addDirectoryEntry (in AString path, in PRInt64 modtime); */
NS_IMETHODIMP nttZipWriter::AddDirectoryEntry(const nsAString & path, PRInt64 modtime)
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
		if (mBusy)
				return NS_ERROR_FAILURE;
		
		nsresult rv;
		mBusy = true;
			
		nttZipHeader *header = new nttZipHeader(path, modtime, 16, mOffset);
		rv = header->WriteFileHeader(mBStream);
		if (NS_FAILED(rv)) return rv;
		
		return OnEntryComplete(header);
}

/* nsIOutputStream addFileEntry (in AString path, in PRInt64 modtime); */
NS_IMETHODIMP nttZipWriter::AddFileEntry(const nsAString & path, PRInt64 modtime, nsIOutputStream **_retval)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void addFile (in AString path, in nsIFile file, in nsIRequestObserver obs); */
NS_IMETHODIMP nttZipWriter::AddFile(const nsAString & path, nsIFile *file, nsIRequestObserver *obs)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void queueFile (in AString path, in nsIFile file); */
NS_IMETHODIMP nttZipWriter::QueueFile(const nsAString & path, nsIFile *file)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void processQueue (in nsIRequestObserver obs); */
NS_IMETHODIMP nttZipWriter::ProcessQueue(nsIRequestObserver *obs)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void setComment (in AString comment); */
NS_IMETHODIMP nttZipWriter::SetComment(const nsAString & comment)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void close (); */
NS_IMETHODIMP nttZipWriter::Close()
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

NS_IMETHODIMP OnFileEntryComplete(nttZipHeader *header)
{
	return NS_OK;
}

nsresult OnEntryComplete(nttZipHeader *header)
{
	return NS_OK;
}
