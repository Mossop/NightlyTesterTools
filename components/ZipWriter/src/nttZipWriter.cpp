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
 *      Mook <mook.moz+random.code@gmail.com>
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
#include "nttZipWriter.h"
#include "nttZipOutputStream.h"
#include "nsISeekableStream.h"
#include "nsIInputStreamPump.h"
#include "nsISimpleStreamListener.h"
#include "nsComponentManagerUtils.h"
#include "nsMemory.h"

#define ZIP_EOCDR_HEADER_SIZE 22
#define ZIP_EOCDR_HEADER_SIGNATURE 0x06054b50

NS_IMPL_ISUPPORTS2(nttZipWriter, nttIZipWriter, nsIRequestObserver)

nttZipWriter::nttZipWriter()
{
}

nttZipWriter::~nttZipWriter()
{
    if (mStream && !mBusy)
        Close();
}

/* attribute AString comment; */
NS_IMETHODIMP nttZipWriter::GetComment(nsAString & aComment)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;

    aComment = mComment;
    return NS_OK;
}
NS_IMETHODIMP nttZipWriter::SetComment(const nsAString & aComment)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;

    mComment = aComment;
    mCDSDirty = PR_TRUE;
    return NS_OK;
}

/* readonly attribute boolean busy; */
NS_IMETHODIMP nttZipWriter::GetBusy(PRBool *aBusy)
{
    *aBusy = mBusy;
    return NS_OK;
}

nsresult nttZipWriter::ReadFile(nsIFile *file)
{
    nsresult rv;
    
    nsCOMPtr<nsIFileInputStream> stream = do_CreateInstance("@mozilla.org/network/file-input-stream;1");
    rv = stream->Init(file, 1, 0, 0);
    if (NS_FAILED(rv)) return NS_ERROR_FAILURE;
    
    PRInt64 size;
    file->GetFileSize(&size);
    
    char buf[1024];
    PRUint64 seek = size-1024;
    PRUint32 length = 1024;
    
    if (seek <= 0)
    {
        length += seek;
        seek = 0;
    }
    
    PRUint32 pos;
    PRUint32 sig = 0;
    nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(stream);

    while (true)
    {
        rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, seek);
        if (NS_FAILED(rv))
        {
            stream->Close();
            return rv;
        }
        rv = NTT_ReadData(stream, buf, length);
        if (NS_FAILED(rv))
        {
            stream->Close();
            return rv;
        }
        
        pos = length - ZIP_EOCDR_HEADER_SIZE;       // We know it's at least this far from the end
        READ32(buf, pos, sig);
        pos-=4;
        while (pos >=0)
        {
            if (sig == ZIP_EOCDR_HEADER_SIGNATURE)
            {
                // Skip down to entry count
                pos+=10;
                PRUint32 entries;
                READ16(buf, pos, entries);
                // Skip past CDS size
                pos+=4;
                READ32(buf, pos, mCDSOffset);
                PRUint32 commentlen;
                READ16(buf, pos, commentlen);
                
                if (commentlen == 0)
                {
                    mComment = NS_LITERAL_STRING("");
                }
                else if (pos+commentlen <= length)
                {
                    mComment = NS_ConvertASCIItoUTF16(buf+pos, commentlen);
                }
                else
                {
                    char *field = (char*)NS_Alloc(commentlen);
                    rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, seek+pos);
                    if (NS_FAILED(rv))
                    {
                        NS_Free(field);
                        stream->Close();
                        return rv;
                    }
                    rv = NTT_ReadData(stream, buf, length);
                    if (NS_FAILED(rv))
                    {
                        NS_Free(field);
                        stream->Close();
                        return rv;
                    }
                    mComment = NS_ConvertASCIItoUTF16(field, commentlen);
                    NS_Free(field);
                }
                
                rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
                if (NS_FAILED(rv))
                {
                    stream->Close();
                    return rv;
                }
                for (PRUint32 entry = 0; entry < entries; entry++)
                {
                    nttZipHeader header;
                    rv = header.ReadCDSHeader(stream);
                    if (NS_FAILED(rv))
                    {
                        mHeaders.Clear();
                        stream->Close();
                        return rv;
                    }
                    mHeaders.AppendElement(header);
                }

                stream->Close();

                nsCOMPtr<nsIFileOutputStream> stream = do_CreateInstance("@mozilla.org/network/file-output-stream;1");
                rv = stream->Init(file, 0x02 | 0x08, 0664, 0);
                if (NS_FAILED(rv))
                {
                    mHeaders.Clear();
                    return rv;
                }
            
                mStream = do_CreateInstance("@mozilla.org/network/buffered-output-stream;1");
                rv = mStream->Init(stream, 0x8000);
                if (NS_FAILED(rv))
                {
                    mStream = nsnull;
                    mHeaders.Clear();
                    stream->Close();
                    return rv;
                }
                
                seekable = do_QueryInterface(mStream);
                seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
                
                mBusy = PR_FALSE;
                mProcessing = PR_FALSE;

                return NS_OK;
            }
            sig = sig << 8;
            sig += buf[--pos];
        }
        
        if (seek == 0)           // Out of room, this zip is damaged
        {
            stream->Close();
            return NS_ERROR_FAILURE;
        }
          
        seek -= (1024 - ZIP_EOCDR_HEADER_SIZE);     // Overlap by the size of the end of cdr
        if (seek < 0)
        {
            length += seek;
            seek = 0;
        }
    }
    // Should never reach here
    
    return NS_ERROR_FAILURE;
}
  
/* void open (in nsIFile file, in PRInt32 ioflags); */
NS_IMETHODIMP nttZipWriter::Open(nsIFile *file, PRInt32 ioflags)
{
    if (mStream)
        return NS_ERROR_ALREADY_INITIALIZED;
  
    if (!file)
        return NS_ERROR_INVALID_ARG;
    
    mFile = file;
    
    PRBool exists;
    file->Exists(&exists);
    if (!exists && !(ioflags & 0x08))
        return NS_ERROR_FILE_NOT_FOUND;

    mBusy = PR_FALSE;
    mProcessing = PR_FALSE;

    if (!exists || (ioflags & 0x20))
    {
        nsresult rv;

        nsCOMPtr<nsIFileOutputStream> stream = do_CreateInstance("@mozilla.org/network/file-output-stream;1");
        rv = stream->Init(file, 0x02 | 0x08 | 0x20, 0664, 0);
        if (NS_FAILED(rv)) return rv;
        
        mStream = do_CreateInstance("@mozilla.org/network/buffered-output-stream;1");
        rv = mStream->Init(stream, 0x8000);
        if (NS_FAILED(rv))
        {
            mStream = nsnull;
            stream->Close();
            return rv;
        }
        
        mCDSOffset = 0;
        mComment = NS_LITERAL_STRING("");
        mCDSDirty = PR_TRUE;
    
        return NS_OK;
    }
    else
    {
        mCDSDirty = PR_FALSE;

        return ReadFile(file);
    }
}

/* void addDirectoryEntry (in AString path, in PRTime modtime); */
NS_IMETHODIMP nttZipWriter::AddDirectoryEntry(const nsAString & path, PRTime modtime)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mBusy)
        return NS_ERROR_FAILURE;
    
    nsresult rv;
    
    const nsAString& last = Substring(path, path.Length()-1);
    nttZipHeader header;
    if (last.Equals(NS_LITERAL_STRING("/")))
    {
        nsString dirPath;
        dirPath.Append(path);
        dirPath.Append(NS_LITERAL_STRING("/"));
        header.Init(dirPath, modtime, 16, mCDSOffset);
    }
    else
        header.Init(path, modtime, 16, mCDSOffset);
    rv = header.WriteFileHeader(mStream);
    if (NS_FAILED(rv)) return rv;
    
    mCDSDirty = PR_TRUE;
    mCDSOffset += header.mCSize + header.GetFileHeaderLength();
    mHeaders.AppendElement(header);

    return NS_OK;
}

/* nsIOutputStream addFileEntry (in AString path, in PRTime modtime); */
NS_IMETHODIMP nttZipWriter::AddFileEntry(const nsAString & path, PRTime modtime, nsIOutputStream **_retval)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mBusy)
        return NS_ERROR_FAILURE;
    
    nsresult rv;
    mBusy = PR_TRUE;
    
    nttZipHeader header;
    header.Init(path, modtime, 0, mCDSOffset);
    rv = header.WriteFileHeader(mStream);
    if (NS_FAILED(rv)) return rv;
    
    nttZipOutputStream *stream = new nttZipOutputStream(this, mStream, header);
    NS_ADDREF(stream);
    *_retval = stream;
    
    return NS_OK;
}

/* void addFile (in AString path, in nsIFile file); */
NS_IMETHODIMP nttZipWriter::AddFile(const nsAString & path, nsIFile *file)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mBusy)
        return NS_ERROR_FAILURE;

    PRBool exists;
    file->Exists(&exists);
    if (!exists)
        return NS_ERROR_FILE_NOT_FOUND;

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
        
        nsCOMPtr<nsIFileInputStream> inputStream = do_CreateInstance("@mozilla.org/network/file-input-stream;1");
        rv = inputStream->Init(file, -1, 0, 0);
        if (NS_FAILED(rv)) return rv;
        
        nsCOMPtr<nsIOutputStream> outputStream;
        rv = AddFileEntry(path, modtime, getter_AddRefs(outputStream));
        if (NS_FAILED(rv))
        {
            inputStream->Close();
            return rv;
        }
        
        char buf[4096];
        PRUint32 read;
        do
        {
            rv = inputStream->Read(buf, 4096, &read);
            if (NS_FAILED(rv))
            {
                inputStream->Close();
                outputStream->Close();
                return rv;
            }
            
            rv = NTT_WriteData(outputStream, buf, read);
            if (NS_FAILED(rv))
            {
                inputStream->Close();
                outputStream->Close();
                return rv;
            }
        } while (read > 0);
        inputStream->Close();
        outputStream->Close();
        return NS_OK;
    }
}

/* void removeEntry (in AString path); */
NS_IMETHODIMP nttZipWriter::RemoveEntry(const nsAString & path)
{
    PRInt32 pos = FindEntry(path);
    if (pos >= 0)
    {
        nsresult rv;
        
        if ((pos+1) < mHeaders.Length())
        {
            nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
            rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mHeaders[pos].mOffset);
            if (NS_FAILED(rv)) return rv;
            
            nsCOMPtr<nsIFileInputStream> reader = do_CreateInstance("@mozilla.org/network/file-input-stream;1");
            reader->Init(mFile, 1, 0, 0);
            seekable = do_QueryInterface(reader);
            rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mHeaders[pos+1].mOffset);
            if (NS_FAILED(rv)) return rv;
            
            PRUint32 count = mCDSOffset - mHeaders[pos+1].mOffset;
            PRUint32 read = 0;
            char buf[4096];
            while (count > 0)
            {
                if (count < 4096)
                  read = count;
                else
                  read = 4096;

                rv = reader->Read(buf, read, &read);
                if (NS_FAILED(rv)) return rv;
                
                rv = NTT_WriteData(mStream, buf, read);
                if (NS_FAILED(rv)) return rv;
                
                count -= read;
            }
            reader->Close();
            
            PRUint32 shift = (mHeaders[pos+1].mOffset - mHeaders[pos].mOffset);
            mCDSOffset -= shift;
            PRUint32 pos2 = pos+1;
            while (pos2 < mHeaders.Length())
            {
                mHeaders[pos2].mOffset -= shift;
                pos2++;
            }
        }
        else
        {
            mCDSOffset = mHeaders[pos].mOffset;
            nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
            rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
            if (NS_FAILED(rv)) return rv;
        }
        
        mHeaders.RemoveElementAt(pos);
        mCDSDirty = PR_TRUE;
        
        return NS_OK;
    }
    
    return NS_ERROR_FILE_NOT_FOUND;
}

/* void queueFile (in AString path, in nsIFile file); */
NS_IMETHODIMP nttZipWriter::QueueFile(const nsAString & path, nsIFile *file)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;

    PRBool exists;
    file->Exists(&exists);
    if (!exists)
        return NS_ERROR_FAILURE;

    nttZipQueueItem item;
    item.mFile = file;
    item.mPath = path;
    mQueue.AppendElement(item);
    
    return NS_OK;
}

/* void queueRemoval (in AString path); */
NS_IMETHODIMP nttZipWriter::QueueRemoval(const nsAString & path)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;

    nttZipQueueItem item;
    item.mPath = path;
    mQueue.AppendElement(item);

    return NS_OK;
}

/* void processQueue (in nsIRequestObserver observer, in nsISupports ctxt); */
NS_IMETHODIMP nttZipWriter::ProcessQueue(nsIRequestObserver *observer, nsISupports *ctxt)
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mBusy)
        return NS_ERROR_FAILURE;
    
    mProcessObserver = observer;
    mProcessContext = ctxt;
    mProcessing = PR_TRUE;
    if (mProcessObserver)
        mProcessObserver->OnStartRequest(nsnull, mProcessContext);
    
    BeginProcessingNextItem();

    return NS_OK;
}

/* void close (); */
NS_IMETHODIMP nttZipWriter::Close()
{
    if (!mStream)
        return NS_ERROR_NOT_INITIALIZED;
    if (mBusy)
        return NS_ERROR_FAILURE;
    
    if (mCDSDirty)
    {
        nsresult rv;
        
        PRUint32 size = 0;
        for (PRUint32 i = 0; i < mHeaders.Length(); i++)
        {
            rv = mHeaders[i].WriteCDSHeader(mStream);
            if (NS_FAILED(rv)) return rv;
            size += mHeaders[i].GetCDSHeaderLength();
        }
        
        nsCString comment = NS_LossyConvertUTF16toASCII(mComment);

        char buf[ZIP_EOCDR_HEADER_SIZE];
        PRUint32 pos = 0;
        WRITE32(buf, pos, ZIP_EOCDR_HEADER_SIGNATURE);
        WRITE16(buf, pos, 0);
        WRITE16(buf, pos, 0);
        WRITE16(buf, pos, mHeaders.Length());
        WRITE16(buf, pos, mHeaders.Length());
        WRITE32(buf, pos, size);
        WRITE32(buf, pos, mCDSOffset);
        WRITE16(buf, pos, comment.Length());
        rv = NTT_WriteData(mStream, buf, pos);
        if (NS_FAILED(rv)) return rv;
        
        rv = NTT_WriteData(mStream, comment.get(), comment.Length());
        if (NS_FAILED(rv)) return rv;

        nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
        rv = seekable->SetEOF();
        if (NS_FAILED(rv)) return rv;
    }
    
    mStream->Close();
    mStream = nsnull;
    mHeaders.Clear();
    
    return NS_OK;
}

/* void onStartRequest (in nsIRequest aRequest, in nsISupports aContext); */
NS_IMETHODIMP nttZipWriter::OnStartRequest(nsIRequest *aRequest, nsISupports *aContext)
{
    return NS_OK;
}

/* void onStopRequest (in nsIRequest aRequest, in nsISupports aContext, in nsresult aStatusCode); */
NS_IMETHODIMP nttZipWriter::OnStopRequest(nsIRequest *aRequest, nsISupports *aContext, nsresult aStatusCode)
{
    if (mProcessOutputStream)
    {
        // We were adding a file, just close and let that clean up
        // Closing the stream may end the queue or start a new file so clear the member stream first
        nsCOMPtr<nsIOutputStream> stream = do_QueryInterface(mProcessOutputStream);
        mProcessOutputStream = nsnull;
        stream->Close();
    }
    else
    {
        // We were removing an entry
        nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
        nsresult rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
        if (NS_FAILED(rv))
        {
            FinishQueue(rv);
            return rv;
        }
        mBusy = PR_FALSE;
        BeginProcessingNextItem();
    }
    return NS_OK;
}

nsresult nttZipWriter::OnFileEntryComplete(nttZipHeader header)
{
    nsresult rv;
    mStream->Flush();
    nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
    
    rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
    if (NS_FAILED(rv)) return rv;
    rv = header.WriteFileHeader(mStream);
    if (NS_FAILED(rv)) return rv;
    rv = mStream->Flush();
    if (NS_FAILED(rv)) return rv;
    rv = seekable->Seek(nsISeekableStream::NS_SEEK_CUR, header.mCSize);
    if (NS_FAILED(rv)) return rv;
    
    mCDSDirty = PR_TRUE;
    mCDSOffset += header.mCSize + header.GetFileHeaderLength();
    mHeaders.AppendElement(header);
    mBusy = PR_FALSE;

    if (mProcessing)
        BeginProcessingNextItem();

    return NS_OK;
}

void nttZipWriter::BeginProcessingNextItem()
{
    NS_ASSERTION(!mProcessOutputStream, "Hanging output stream");
    
    if (!mProcessing)
        return;
        
    if (mQueue.IsEmpty())
    {
        FinishQueue(NS_OK);
        return;
    }
    
    nttZipQueueItem next = mQueue[0];
    mQueue.RemoveElementAt(0);
    
    nsresult rv;
    
    // If file is set then this is a new entry to add
    if (next.mFile)
    {
        PRBool exists;
        next.mFile->Exists(&exists);
        if (!exists)
        {
            FinishQueue(NS_ERROR_FILE_NOT_FOUND);
            return;
        }

        PRBool isdir;
        next.mFile->IsDirectory(&isdir);
        PRInt64 modtime;
        next.mFile->GetLastModifiedTime(&modtime);
        if (isdir)
        {
            // Directory additions are cheap, just do them synchronously
            rv = AddDirectoryEntry(next.mPath, modtime);
            if (NS_FAILED(rv))
            {
                FinishQueue(rv);
                return;
            }
            BeginProcessingNextItem();
        }
        else
        {
            nsCOMPtr<nsIFileInputStream> inputStream = do_CreateInstance("@mozilla.org/network/file-input-stream;1");
            rv = inputStream->Init(next.mFile, -1, 0, 0);
            if (NS_FAILED(rv))
            {
                FinishQueue(rv);
                return;
            }
            
            nsCOMPtr<nsIOutputStream> ostream;
            rv = AddFileEntry(next.mPath, modtime, getter_AddRefs(ostream));
            if (NS_FAILED(rv))
            {
                FinishQueue(rv);
                return;
            }
            
            mProcessOutputStream = do_CreateInstance("@mozilla.org/network/buffered-output-stream;1");
            rv = mProcessOutputStream->Init(ostream, 0x8000);
            if (NS_FAILED(rv))
            {
                mProcessOutputStream = nsnull;
                FinishQueue(rv);
                return;
            }
            
            // make a stream pump and a stream listener to read from the input stream for us
            nsCOMPtr<nsIInputStreamPump> pump = do_CreateInstance("@mozilla.org/network/input-stream-pump;1");
            rv = pump->Init(inputStream, -1, -1, 0, 0, PR_TRUE);
            if (NS_FAILED(rv))
            {
                mProcessOutputStream = nsnull;
                FinishQueue(rv);
                return;
            }
            
            // make a simple stream listener to do the writing to output stream for us
            nsCOMPtr<nsISimpleStreamListener> listener = do_CreateInstance("@mozilla.org/network/simple-stream-listener;1");
            listener->Init(mProcessOutputStream, this);
            if (NS_FAILED(rv))
            {
                mProcessOutputStream = nsnull;
                FinishQueue(rv);
                return;
            }
            
            // start the copying
            rv = pump->AsyncRead(listener, nsnull);
            if (NS_FAILED(rv))
            {
                mProcessOutputStream = nsnull;
                FinishQueue(rv);
                return;
            }
        }
    }
    else
    {
        PRInt32 pos = FindEntry(next.mPath);
        if (pos >= 0)
        {
            nsresult rv;
            
            if ((pos+1) < mHeaders.Length())
            {
                mBusy = PR_TRUE;
                
                nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
                rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mHeaders[pos].mOffset);
                if (NS_FAILED(rv))
                {
                    FinishQueue(rv);
                    return;
                }

                // Open the zip file for reading
                nsCOMPtr<nsIFileInputStream> reader = do_CreateInstance("@mozilla.org/network/file-input-stream;1");
                reader->Init(mFile, 1, 0, 0);

                // make a stream pump and a stream listener to read from the input stream for us
                nsCOMPtr<nsIInputStreamPump> pump = do_CreateInstance("@mozilla.org/network/input-stream-pump;1");
                rv = pump->Init(reader, mHeaders[pos+1].mOffset, mCDSOffset-mHeaders[pos+1].mOffset, 0, 0, PR_TRUE);
                if (NS_FAILED(rv))
                {
                    FinishQueue(rv);
                    return;
                }
                
                PRUint32 shift = (mHeaders[pos+1].mOffset - mHeaders[pos].mOffset);
                mCDSOffset -= shift;
                PRUint32 pos2 = pos+1;
                while (pos2 < mHeaders.Length())
                {
                    mHeaders[pos2].mOffset -= shift;
                    pos2++;
                }
                
                mHeaders.RemoveElementAt(pos);
                mCDSDirty = PR_TRUE;
                
                // make a simple stream listener to do the writing to output stream for us
                nsCOMPtr<nsISimpleStreamListener> listener = do_CreateInstance("@mozilla.org/network/simple-stream-listener;1");
                listener->Init(mStream, this);
                if (NS_FAILED(rv))
                {
                    FinishQueue(rv);
                    return;
                }
                
                // start the copying
                rv = pump->AsyncRead(listener, nsnull);
                if (NS_FAILED(rv))
                {
                    FinishQueue(rv);
                    return;
                }
            }
            else
            {
                mCDSOffset = mHeaders[pos].mOffset;
                nsCOMPtr<nsISeekableStream> seekable = do_QueryInterface(mStream);
                rv = seekable->Seek(nsISeekableStream::NS_SEEK_SET, mCDSOffset);
                if (NS_FAILED(rv))
                {
                    FinishQueue(rv);
                    return;
                }
                
                mHeaders.RemoveElementAt(pos);
                mCDSDirty = PR_TRUE;
                
                BeginProcessingNextItem();
            }
        }
        else
        {
            FinishQueue(NS_ERROR_FILE_NOT_FOUND);
        }
    }
}

void nttZipWriter::FinishQueue(nsresult status)
{
    NS_ASSERTION(!mProcessOutputStream, "Hanging output stream");
    
    if (mProcessObserver)
        mProcessObserver->OnStopRequest(nsnull, mProcessContext, status);
    mProcessing = PR_FALSE;
    mProcessObserver = nsnull;
    mProcessContext = nsnull;
    if (mProcessOutputStream)
        mProcessOutputStream->Close();
    mProcessOutputStream = nsnull;
}

PRInt32 nttZipWriter::FindEntry(const nsAString & path)
{
    for (PRUint32 pos = 0; pos < mHeaders.Length(); pos++)
    {
        if (mHeaders[pos].mName.Equals(path))
            return pos;
    }
    return -1;
}
