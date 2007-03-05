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

#include "nttZipWriter.h"
#include "nttZipOutputStream.h"
#include "nsISeekableStream.h"
#include "nsIInputStreamPump.h"
#include "nsISimpleStreamListener.h"
#include "nsComponentManagerUtils.h"
#include "stdio.h"

NS_IMPL_ISUPPORTS2(nttZipWriter, nttIZipWriter, nsIRequestObserver)

nttZipWriter::nttZipWriter()
{
}

nttZipWriter::~nttZipWriter()
{
  	if (mStream && !mBusy)
  			Close();
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
		
		printf("Adding directory entry %s\n", ToNewUTF8String(path));
		
		nsresult rv;
		mBusy = PR_TRUE;
			
		nttZipHeader header(path, modtime, 16, mOffset);
		rv = header.WriteFileHeader(mBStream);
		if (NS_FAILED(rv)) return rv;
		
		return OnEntryComplete(header);
}

/* nsIOutputStream addFileEntry (in AString path, in PRInt64 modtime); */
NS_IMETHODIMP nttZipWriter::AddFileEntry(const nsAString & path, PRInt64 modtime, nsIOutputStream **_retval)
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
		if (mBusy)
				return NS_ERROR_FAILURE;
		
		printf("Adding file entry %s\n", ToNewUTF8String(path));
		
		nsresult rv;
		mBusy = PR_TRUE;
		
		nttZipHeader header(path, modtime, 0, mOffset);
		rv = header.WriteFileHeader(mBStream);
		if (NS_FAILED(rv)) return rv;
		
		nttZipOutputStream *stream = new nttZipOutputStream(this, mStream, header);
		NS_ADDREF(stream);
		*_retval = stream;
		
		return NS_OK;
}

/* void addFile (in AString path, in nsIFile file, in nsIRequestObserver obs); */
NS_IMETHODIMP nttZipWriter::AddFile(const nsAString & path, nsIFile *file, nsIRequestObserver *obs)
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
		if (mBusy)
				return NS_ERROR_FAILURE;
		
		if (obs)
				obs->OnStartRequest(nsnull, NS_ISUPPORTS_CAST(nttIZipWriter*, this));
		mProcessObserver = obs;
		return BeginProcessing(path, file);
}

/* void queueFile (in AString path, in nsIFile file); */
NS_IMETHODIMP nttZipWriter::QueueFile(const nsAString & path, nsIFile *file)
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;

		nttZipQueueItem item;
		item.mFile = file;
		item.mPath = path;
		mQueue.AppendElement(item);
		
    return NS_OK;
}

/* void processQueue (in nsIRequestObserver obs); */
NS_IMETHODIMP nttZipWriter::ProcessQueue(nsIRequestObserver *obs)
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
		if (mBusy)
				return NS_ERROR_FAILURE;
		
		if (obs)
				obs->OnStartRequest(nsnull, NS_ISUPPORTS_CAST(nttIZipWriter*, this));
		if (!mQueue.IsEmpty())
		{
				mProcessObserver = obs;
				mProcessing = PR_TRUE;
				nttZipQueueItem next = mQueue[0];
				mQueue.RemoveElementAt(0);
				return BeginProcessing(next.mPath, next.mFile);
		}
		else if (obs)
				obs->OnStopRequest(nsnull, NS_ISUPPORTS_CAST(nttIZipWriter*, this), NS_OK);
		return NS_OK;
}

/* void setComment (in AString comment); */
NS_IMETHODIMP nttZipWriter::SetComment(const nsAString & comment)
{
		mComment = comment;
    return NS_OK;
}

/* void close (); */
NS_IMETHODIMP nttZipWriter::Close()
{
		if (!mStream)
				return NS_ERROR_NOT_INITIALIZED;
		if (mBusy)
				return NS_ERROR_FAILURE;
		
		printf("ZipWriter close\n");
		PRUint32 size = 0;
		for (PRUint32 i = 0; i < mHeaders.Length(); i++)
		{
				mHeaders[i].WriteCDSHeader(mBStream);
				size += mHeaders[i].GetCDSHeaderLength();
		}
		
		WRITE32(mBStream, 0x06054b50);
		WRITE16(mBStream, 0);
		WRITE16(mBStream, 0);
		WRITE16(mBStream, mHeaders.Length());
		WRITE16(mBStream, mHeaders.Length());
		WRITE32(mBStream, size);
		WRITE32(mBStream, mOffset);
		WRITE16(mBStream, mComment.Length());
		for (PRUint32 i = 0; i < mComment.Length(); i++)
			WRITE8(mBStream, mComment[i]);
		
		mStream->Close();
		mStream = nsnull;
		mBStream = nsnull;
		
		return NS_OK;
}

/* void onStartRequest (in nsIRequest aRequest, in nsISupports aContext); */
NS_IMETHODIMP nttZipWriter::OnStartRequest(nsIRequest *aRequest, nsISupports *aContext)
{
}

/* void onStopRequest (in nsIRequest aRequest, in nsISupports aContext, in nsresult aStatusCode); */
NS_IMETHODIMP nttZipWriter::OnStopRequest(nsIRequest *aRequest, nsISupports *aContext, nsresult aStatusCode)
{
		mProcessInputStream->Close();
		mProcessOutputStream->Close();
}

nsresult nttZipWriter::OnFileEntryComplete(nttZipHeader header)
{
		nsresult rv;
		mStream->Flush();
		nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
		
		rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mOffset);
		if (NS_FAILED(rv)) return rv;
		rv = header.WriteFileHeader(mBStream);
		if (NS_FAILED(rv)) return rv;
		rv = mStream->Flush();
		if (NS_FAILED(rv)) return rv;
		rv = seekable->Seek(nsISeekableStream::NS_SEEK_CUR, header.mCSize);
		if (NS_FAILED(rv)) return rv;
		
		return OnEntryComplete(header);
}

nsresult nttZipWriter::OnEntryComplete(nttZipHeader header)
{
		printf("Entry complete\n");
		mOffset += header.mCSize + header.GetFileHeaderLength();
		mHeaders.AppendElement(header);
		mBusy = PR_FALSE;
		
		if (mProcessing)
		{
				if (mQueue.IsEmpty())
				{
						if (mProcessObserver)
								mProcessObserver->OnStopRequest(nsnull, NS_ISUPPORTS_CAST(nttIZipWriter*, this), NS_OK);
						mProcessing = PR_FALSE;
						mProcessObserver = nsnull;
				}
				else
				{
						nttZipQueueItem next = mQueue[0];
						mQueue.RemoveElementAt(0);
						return BeginProcessing(next.mPath, next.mFile);
				}
		}
		else if (mProcessObserver)
		{
				mProcessObserver->OnStopRequest(nsnull, NS_ISUPPORTS_CAST(nttIZipWriter*, this), NS_OK);
				mProcessObserver = nsnull;
		}
		return NS_OK;
}

nsresult nttZipWriter::BeginProcessing(const nsAString & path, nsIFile *file)
{
		PRBool isdir;
		file->IsDirectory(&isdir);
		PRInt64 modtime;
		file->GetLastModifiedTime(&modtime);
		if (isdir)
		{
				return AddDirectoryEntry(path, modtime);
		}
		else
		{
				nsresult rv;
				
				mProcessInputStream = do_CreateInstance("@mozilla.org/network/file-input-stream;1", &rv);
				if (NS_FAILED(rv)) return rv;
				mProcessInputStream->Init(file, -1, 0, 0);
				if (NS_FAILED(rv)) return rv;
				
				nsCOMPtr<nsIOutputStream> ostream;
				rv = AddFileEntry(path, modtime, getter_AddRefs(ostream));
				if (NS_FAILED(rv)) return rv;
				
				mProcessOutputStream = do_CreateInstance("@mozilla.org/network/buffered-output-stream;1", &rv);
				if (NS_FAILED(rv)) return rv;
				rv = mProcessOutputStream->Init(ostream, 0x8000);
				if (NS_FAILED(rv)) return rv;
				
				// make a stream pump and a stream listener to read from the input stream for us
				nsCOMPtr<nsIInputStreamPump> pump = do_CreateInstance("@mozilla.org/network/input-stream-pump;1", &rv);
				if (NS_FAILED(rv)) return rv;
				rv = pump->Init(mProcessInputStream, -1, -1, 0, 0, PR_TRUE);
				if (NS_FAILED(rv)) return rv;
				
				// make a simple stream listener to do the writing to output stream for us
				nsCOMPtr<nsISimpleStreamListener> listener = do_CreateInstance("@mozilla.org/network/simple-stream-listener;1", &rv);
				if (NS_FAILED(rv)) return rv;
				listener->Init(mProcessOutputStream, this);
				if (NS_FAILED(rv)) return rv;
				
				// start the copying
				return pump->AsyncRead(listener, nsnull);
		}
}
