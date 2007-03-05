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
 * The Original Code is Nightly Tester Tools.
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

const Ci = Components.interfaces;
const Cc = Components.classes;

function LOG(string)
{
	var gConsole = Cc["@mozilla.org/consoleservice;1"]
                  .getService(Ci.nsIConsoleService);
	gConsole.logStringMessage(string);
}

var CRC_TABLE = [
0x00000000,0x77073096,0xEE0E612C,0x990951BA,0x076DC419,0x706AF48F,0xE963A535,0x9E6495A3,
0x0EDB8832,0x79DCB8A4,0xE0D5E91E,0x97D2D988,0x09B64C2B,0x7EB17CBD,0xE7B82D07,0x90BF1D91,
0x1DB71064,0x6AB020F2,0xF3B97148,0x84BE41DE,0x1ADAD47D,0x6DDDE4EB,0xF4D4B551,0x83D385C7,
0x136C9856,0x646BA8C0,0xFD62F97A,0x8A65C9EC,0x14015C4F,0x63066CD9,0xFA0F3D63,0x8D080DF5,
0x3B6E20C8,0x4C69105E,0xD56041E4,0xA2677172,0x3C03E4D1,0x4B04D447,0xD20D85FD,0xA50AB56B,
0x35B5A8FA,0x42B2986C,0xDBBBC9D6,0xACBCF940,0x32D86CE3,0x45DF5C75,0xDCD60DCF,0xABD13D59,
0x26D930AC,0x51DE003A,0xC8D75180,0xBFD06116,0x21B4F4B5,0x56B3C423,0xCFBA9599,0xB8BDA50F,
0x2802B89E,0x5F058808,0xC60CD9B2,0xB10BE924,0x2F6F7C87,0x58684C11,0xC1611DAB,0xB6662D3D,
0x76DC4190,0x01DB7106,0x98D220BC,0xEFD5102A,0x71B18589,0x06B6B51F,0x9FBFE4A5,0xE8B8D433,
0x7807C9A2,0x0F00F934,0x9609A88E,0xE10E9818,0x7F6A0DBB,0x086D3D2D,0x91646C97,0xE6635C01,
0x6B6B51F4,0x1C6C6162,0x856530D8,0xF262004E,0x6C0695ED,0x1B01A57B,0x8208F4C1,0xF50FC457,
0x65B0D9C6,0x12B7E950,0x8BBEB8EA,0xFCB9887C,0x62DD1DDF,0x15DA2D49,0x8CD37CF3,0xFBD44C65,
0x4DB26158,0x3AB551CE,0xA3BC0074,0xD4BB30E2,0x4ADFA541,0x3DD895D7,0xA4D1C46D,0xD3D6F4FB,
0x4369E96A,0x346ED9FC,0xAD678846,0xDA60B8D0,0x44042D73,0x33031DE5,0xAA0A4C5F,0xDD0D7CC9,
0x5005713C,0x270241AA,0xBE0B1010,0xC90C2086,0x5768B525,0x206F85B3,0xB966D409,0xCE61E49F,
0x5EDEF90E,0x29D9C998,0xB0D09822,0xC7D7A8B4,0x59B33D17,0x2EB40D81,0xB7BD5C3B,0xC0BA6CAD,
0xEDB88320,0x9ABFB3B6,0x03B6E20C,0x74B1D29A,0xEAD54739,0x9DD277AF,0x04DB2615,0x73DC1683,
0xE3630B12,0x94643B84,0x0D6D6A3E,0x7A6A5AA8,0xE40ECF0B,0x9309FF9D,0x0A00AE27,0x7D079EB1,
0xF00F9344,0x8708A3D2,0x1E01F268,0x6906C2FE,0xF762575D,0x806567CB,0x196C3671,0x6E6B06E7,
0xFED41B76,0x89D32BE0,0x10DA7A5A,0x67DD4ACC,0xF9B9DF6F,0x8EBEEFF9,0x17B7BE43,0x60B08ED5,
0xD6D6A3E8,0xA1D1937E,0x38D8C2C4,0x4FDFF252,0xD1BB67F1,0xA6BC5767,0x3FB506DD,0x48B2364B,
0xD80D2BDA,0xAF0A1B4C,0x36034AF6,0x41047A60,0xDF60EFC3,0xA867DF55,0x316E8EEF,0x4669BE79,
0xCB61B38C,0xBC66831A,0x256FD2A0,0x5268E236,0xCC0C7795,0xBB0B4703,0x220216B9,0x5505262F,
0xC5BA3BBE,0xB2BD0B28,0x2BB45A92,0x5CB36A04,0xC2D7FFA7,0xB5D0CF31,0x2CD99E8B,0x5BDEAE1D,
0x9B64C2B0,0xEC63F226,0x756AA39C,0x026D930A,0x9C0906A9,0xEB0E363F,0x72076785,0x05005713,
0x95BF4A82,0xE2B87A14,0x7BB12BAE,0x0CB61B38,0x92D28E9B,0xE5D5BE0D,0x7CDCEFB7,0x0BDBDF21,
0x86D3D2D4,0xF1D4E242,0x68DDB3F8,0x1FDA836E,0x81BE16CD,0xF6B9265B,0x6FB077E1,0x18B74777,
0x88085AE6,0xFF0F6A70,0x66063BCA,0x11010B5C,0x8F659EFF,0xF862AE69,0x616BFFD3,0x166CCF45,
0xA00AE278,0xD70DD2EE,0x4E048354,0x3903B3C2,0xA7672661,0xD06016F7,0x4969474D,0x3E6E77DB,
0xAED16A4A,0xD9D65ADC,0x40DF0B66,0x37D83BF0,0xA9BCAE53,0xDEBB9EC5,0x47B2CF7F,0x30B5FFE9,
0xBDBDF21C,0xCABAC28A,0x53B39330,0x24B4A3A6,0xBAD03605,0xCDD70693,0x54DE5729,0x23D967BF,
0xB3667A2E,0xC4614AB8,0x5D681B02,0x2A6F2B94,0xB40BBE37,0xC30C8EA1,0x5A05DF1B,0x2D02EF8D];

function InverseBinaryOutputStream(stream)
{
	this.stream = Cc["@mozilla.org/binaryoutputstream;1"]
	               .createInstance(Ci.nsIBinaryOutputStream);
	this.stream.setOutputStream(stream);
}

InverseBinaryOutputStream.prototype = {

	stream: null,
	
	write8: function(data)
	{
		this.stream.write8(data);
	},
	
	write16: function(data)
	{
		this.write8(data & 0xFF);
		this.write8(data >>> 8);
	},
	
	write32: function(data)
	{
		this.write16(data & 0xFFFF);
		this.write16(data >>> 16);
	}
}

function ZipFileHeader(path, date, attr, offset)
{
	this.name = path;
	this.date = date;
	this.eattr = attr;
	this.offset = offset;
	this.comment = "";
}

ZipFileHeader.prototype = {
	versionmade: 20,
	versionneeded: 20,
	flags: 0,
	method: 0,
	date: null,
	crc: 0,
	csize: 0,
	usize: 0,
	disk: 0,
	iattr: 0,
	eattr: null,
	offset: null,
	name: null,
	comment: null,
	
	getFileHeaderLength: function()
	{
		return 4+2+2+2+2+2+4+4+4+2+2+this.name.length;
	},
	
	writeDate: function(stream)
	{
		var time = this.date.getSeconds()/2 + (this.date.getMinutes() << 5) + (this.date.getHours() << 11);
		var date = this.date.getDate() + ((this.date.getMonth()+1) << 5) + ((this.date.getFullYear()-1980) << 9);
		stream.write16(time);
		stream.write16(date);
	},
	
	writeFileHeader: function(stream)
	{
		stream.write32(0x04034b50);
		stream.write16(this.versionneeded);
		stream.write16(this.flags);
		stream.write16(this.method);
		this.writeDate(stream);
		stream.write32(this.crc);
		stream.write32(this.csize);
		stream.write32(this.usize);
		stream.write16(this.name.length);
		stream.write16(0);
		for (var i = 0; i<this.name.length; i++)
			stream.write8(this.name.charCodeAt(i));
	},
	
	getCDSHeaderLength: function()
	{
		return 4+2+2+2+2+2+2+4+4+4+2+2+2+2+2+4+4+this.name.length+this.comment.length;
	},
	
	writeCDSHeader: function(stream)
	{
		stream.write32(0x02014b50);
		stream.write16(this.versionmade);
		stream.write16(this.versionneeded);
		stream.write16(this.flags);
		stream.write16(this.method);
		this.writeDate(stream);
		stream.write32(this.crc);
		stream.write32(this.csize);
		stream.write32(this.usize);
		stream.write16(this.name.length);
		stream.write16(0);
		stream.write16(this.comment.length);
		stream.write16(this.disk);
		stream.write16(this.iattr);
		stream.write32(this.eattr);
		stream.write32(this.offset);
		
		for (var i = 0; i<this.name.length; i++)
			stream.write8(this.name.charCodeAt(i));
		
		for (var i = 0; i<this.comment.length; i++)
			stream.write8(this.comment.charCodeAt(i));
	}
}

function ZipOutputStream(writer, header, stream)
{
	this.writer = writer;

	/* nsIOutputStream sucks, we can't implement it correctly in JS
	 * so... we have to do some tricks:
	 *
	 *  < output stream consumer >
	 *              |
	 *       /nsIOuputStream \
	 *              |
	 *         [ nsIPipe ]
	 *              |
	 *    \nsIAsyncInputStream/    (this.instream)
	 *              |
	 *         < JS glue >
	 *              |
	 *     / nsIStreamListener \   (this.streamlistener)
	 *              |
	 *    [ nsIStreamListenerTee ] ---------------+
	 *              |                             |
	 *     / nsIStreamListener \         / nsIOutputStream \
	 *              |                             |
	 *  [ nsISimpleStreamListener ]          [ nsIPipe ]
	 *              |                             |
	 *      / nsIOutputStrean \          \ nsIInputStream /
	 *              |                             |
	 *  [ nsIBufferedOutputStream ]    [ nsIBinaryInputStream ] (this.crcstream)
	 *              | (this.bufstream)            |
	 *      / nsIOutputStream \          < CRC calculator >
	 *              |
	 *  < underlying output stream > (this.basestream)
	 *
	 * When the output stream gets written to, the pipe notifies us of the
	 * write; we then have the stream listener tee read from the pipe,
	 * putting it in the underlying output stream.  It also goes into the
	 * second pipe, which is read from to calculate the CRC.
	 *
	 * This would have been much simpler if nsIInputStreamTee could be
	 * created from script.. alas, we can't.
	 */

  this.crcstream = Cc["@mozilla.org/binaryinputstream;1"]
                    .createInstance(Ci.nsIBinaryInputStream);
  var pipe = Cc["@mozilla.org/pipe;1"]
              .createInstance(Ci.nsIPipe);
  pipe.init(false, false, 0x8000, 0, null);
  this.crcstream.setInputStream(pipe.inputStream);

	this.basestream = stream;
  var bufout = Cc["@mozilla.org/network/buffered-output-stream;1"]
                .createInstance(Ci.nsIBufferedOutputStream);
  bufout.init(this.basestream, 0x8000);
  this.bufstream = bufout;
  
  var sslistener = Cc["@mozilla.org/network/simple-stream-listener;1"]
                    .createInstance(Ci.nsISimpleStreamListener);
  sslistener.init(bufout, null);
  
  this.streamlistener = Cc["@mozilla.org/network/stream-listener-tee;1"]
                         .createInstance(Ci.nsIStreamListenerTee);
  this.streamlistener.init(sslistener, pipe.outputStream);
  
  pipe = Cc["@mozilla.org/pipe;1"]
              .createInstance(Ci.nsIPipe);
  pipe.init(false, /* input stream is blocking */
            this.basestream.isNonBlocking(), /* output stream blocking? */
            0x8000, /* segment size */
            0, /* default segment count */
            null); /* default allocator */
  var outstream = pipe.outputStream;
  this.instream = pipe.inputStream;
        
	this.header = header;
	this.crc = 0xffffffff;
	this.size = 0;
        
  this.instream.asyncWait(this, 0, 0, null);
  outstream.asyncWait(this, 1, 0, null); // triggered only on close
  
  return outstream;
}

ZipOutputStream.prototype = {

instream: null,
streamlistener: null,
bufstream: null,
crcstream: null,
writer: null,
crc: null,
basestream: null,
size: null,

onInputStreamReady: function(aStream)
{
	var count = aStream.available();
	LOG("Writing " + count + " bytes at offset " + this.size);

	/* make the stream listener read from the pipe */
	this.streamlistener.onDataAvailable(null,
                                      null,
                                      aStream,
                                      this.size,
                                      count);
        
  /* and read from the CRC stream */
  for (var n = 0; n < count; n++)
  {
		var b = this.crcstream.read8();
    this.crc = CRC_TABLE[(this.crc ^ b) & 0xFF] ^ ((this.crc >> 8) & 0xFFFFFF);
  }

	this.size += count;

	aStream.asyncWait(this, 0, 0, null);
        
	/* probably would be useful to have some sort of status feedback */
},

onOutputStreamReady: function(aStream)
{
	// this is only called when the output stream had been closed.
	// when that is the case, we need to flush everything and close.
	// the stream is closed
	this.instream.close();
	this.bufstream.flush();
	this.close();
},

close: function()
{
	try
	{
		LOG("ZipOutputStream closing:");
		LOG("  Size: " + this.size);
		LOG("  CRC " + (Array(32).join("0") + ((this.crc ^ 0xffffffff) >>> 0).toString(16)).substr(-8));
		this.header.crc = this.crc ^ 0xffffffff;
		this.header.csize = this.size;
		this.header.usize = this.size;
		this.writer.onFileEntryFinished(this.header);
	}
	catch (e)
	{
		LOG(e);
		throw e;
	}
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nsISupports) ||
            iid.equals(Ci.nsIInputStreamCallback))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

function ZipWriter()
{
}

ZipWriter.prototype = {

bstream: null,
stream: null,
headers: null,
offset: null,
comment: null,

busy: null,
queue: null,
processing: null,
processOutputStream: null,
processInputStream: null,
processObserver: null,

isBusy: function()
{
	return this.busy;
},

create: function(file)
{
	if (this.stream)
		throw Components.results.NS_ERROR_ALREADY_INITIALIZED;

	this.stream = Cc["@mozilla.org/network/file-output-stream;1"]
	               .createInstance(Ci.nsIFileOutputStream);
	this.stream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	this.stream.QueryInterface(Ci.nsISeekableStream);
	this.bstream = new InverseBinaryOutputStream(this.stream);
	this.headers = [];
	this.busy = false;
	this.processing = false;
	this.queue = [];
	this.offset = 0;
	this.comment = "";
},

addDirectoryEntry: function(path, modtime)
{
	if (!this.stream)
		throw Components.results.NS_ERROR_NOT_INITIALIZED;
	if (this.busy)
		throw Components.results.NS_ERROR_FAILURE;
	
	this.busy = true;
	if (path.substr(-1) != "/")
		path += "/";
		
	var header = new ZipFileHeader(path, new Date(modtime), 16, this.offset);
	header.writeFileHeader(this.bstream);
	
	this.onEntryFinished(header);
},

addFileEntry: function(path, modtime)
{
	if (!this.stream)
		throw Components.results.NS_ERROR_NOT_INITIALIZED;
	if (this.busy)
		throw Components.results.NS_ERROR_FAILURE;
		
	this.busy = true;
	var header = new ZipFileHeader(path, new Date(modtime), 0, this.offset);
	header.writeFileHeader(this.bstream);
	return new ZipOutputStream(this, header, this.stream);
},

onFileEntryFinished: function(header)
{
	this.stream.flush();
	this.stream.seek(Ci.nsISeekableStream.NS_SEEK_CUR, -(header.csize + header.getFileHeaderLength()));
	header.writeFileHeader(this.bstream);
	this.stream.flush();
	this.stream.seek(Ci.nsISeekableStream.NS_SEEK_CUR, header.csize);
	this.onEntryFinished(header);
},

onEntryFinished: function(header)
{
	this.offset += header.csize + header.getFileHeaderLength();
	this.headers.push(header);
	this.busy = false;
	
	if (this.processing)
	{
		if (this.queue.length == 0)
		{
			if (this.processObserver)
				this.processObserver.onStopRequest(null, this, Components.results.NS_OK);
			this.processing = false;
			this.processObserver = null;
		}
		else
		{
			var next = this.queue.shift();
			this.beginProcessing(next.path, next.file);
		}
	}
	else if (this.processObserver)
	{
		this.processObserver.onStopRequest(null, this, Components.results.NS_OK);
		this.processObserver = null;
	}
},

beginProcessing: function(path, file)
{
	LOG("Processing "+path+" from "+file.path);
	if (file.isDirectory())
	{
		this.addDirectoryEntry(path, file.lastModifiedTime);
	}
	else
	{
		this.processInputStream = Cc["@mozilla.org/network/file-input-stream;1"]
                               .createInstance(Ci.nsIFileInputStream);
		this.processInputStream.init(file, -1, 0, 0);
		var ostream = this.addFileEntry(path, file.lastModifiedTime);
		
		this.processOutputStream = Cc["@mozilla.org/network/buffered-output-stream;1"]
                                .createInstance(Ci.nsIBufferedOutputStream);
		this.processOutputStream.init(ostream, 0x8000);
		
		// make a stream pump and a stream listener to read from the input stream for us
		var pump = Cc["@mozilla.org/network/input-stream-pump;1"]
		            .createInstance(Ci.nsIInputStreamPump);
		pump.init(this.processInputStream, -1, -1, 0, 0, true);
		
		// make a simple stream listener to do the writing to output stream for us
		var listener = Cc["@mozilla.org/network/simple-stream-listener;1"]
		                .createInstance(Ci.nsISimpleStreamListener);
		listener.init(this.processOutputStream, this);
		
		// start the copying
		pump.asyncRead(listener, null);
	}
},

addFile: function(path, file, observer)
{
	if (!this.stream)
		throw Components.results.NS_ERROR_NOT_INITIALIZED;
	if (this.busy)
		throw Components.results.NS_ERROR_FAILURE;
	
	if (observer)
		observer.onStartRequest(null, this);
	this.processObserver = observer;
	this.beginProcessing(path, file);
},

queueFile: function(path, file)
{
	this.queue.push({ path: path, file: file });
},

processQueue: function(observer)
{
	if (!this.stream)
		throw Components.results.NS_ERROR_NOT_INITIALIZED;
	if (this.busy)
		throw Components.results.NS_ERROR_FAILURE;
	
	if (observer)
		observer.onStartRequest(null, this);
	if (this.queue.length > 0)
	{
		this.processObserver = observer;
		this.processing = true;
		var next = this.queue.shift();
		this.beginProcessing(next.path, next.file);
	}
	else if (observer)
		observer.onStopRequest(null, this, Components.results.NS_OK);
},

setComment: function(comment)
{
	this.comment = comment;
},

close: function()
{
	if (!this.stream)
		throw Components.results.NS_ERROR_NOT_INITIALIZED;
	if (this.busy)
		throw Components.results.NS_ERROR_FAILURE;
	
	LOG("ZipWriter closing");
	var size = 0;
	for (var i = 0; i < this.headers.length; i++)
	{
		this.headers[i].writeCDSHeader(this.bstream);
		size += this.headers[i].getCDSHeaderLength();
	}
	
	this.bstream.write32(0x06054b50);
	this.bstream.write16(0);
	this.bstream.write16(0);
	this.bstream.write16(this.headers.length);
	this.bstream.write16(this.headers.length);
	this.bstream.write32(size);
	this.bstream.write32(this.offset);
	this.bstream.write16(this.comment.length);
	for (var i = 0; i < this.comment.length; i++)
		this.bstream.write8(this.comment.charCodeAt(i));
	
	this.stream.close();
	this.stream = null;
	this.bstream = null;
},

// nsIRequestObserver implementation

onStartRequest: function(aRequest, aContext)
{
},

onStopRequest: function(aRequest, aContext, aStatusCode)
{
	this.processInputStream.close();
	this.processOutputStream.close();
},

QueryInterface: function(iid)
{
	if (iid.equals(Ci.nttIZipWriter)
		|| iid.equals(Ci.nsIRequestObserver)
		|| iid.equals(Ci.nsISupports))
	{
		return this;
	}
	else
	{
		throw Components.results.NS_ERROR_NO_INTERFACE;
	}
}
}

var initModule =
{
	ServiceCID: Components.ID("{5147eddd-e4cc-483b-a3c5-bd38177ffc1a}"),
	ServiceContractID: "@blueprintit.co.uk/zipwriter;1",
	ServiceName: "Nightly Tester Zip Writer",
	
	registerSelf: function (compMgr, fileSpec, location, type)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(this.ServiceCID,this.ServiceName,this.ServiceContractID,
			fileSpec,location,type);
	},

	unregisterSelf: function (compMgr, fileSpec, location)
	{
		compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
		compMgr.unregisterFactoryLocation(this.ServiceCID,fileSpec);
	},

	getClassObject: function (compMgr, cid, iid)
	{
		if (!cid.equals(this.ServiceCID))
			throw Components.results.NS_ERROR_NO_INTERFACE
		if (!iid.equals(Components.interfaces.nsIFactory))
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		return this.instanceFactory;
	},

	canUnload: function(compMgr)
	{
		return true;
	},

	instanceFactory:
	{
		createInstance: function (outer, iid)
		{
			if (outer != null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			var instance = new ZipWriter();
			return instance.QueryInterface(iid);
		}
	}
}; //Module

function NSGetModule(compMgr, fileSpec)
{
	return initModule;
}
