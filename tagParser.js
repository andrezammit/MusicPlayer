var fs = require('fs');

var minTagMinorVer = 1;
var maxTagMinorVar = 4;

var minTagSize = 3;

var ver22HeaderSize = 6;
var ver23HeaderSize = 10;

var sevenBitMask = 0x7F;
var byteSize = 8;

function trimNullChar(string)
{
	if (!string || string.length == 0)
		return string;

	var lastIndex = string.length - 1;

	if (string.charCodeAt(lastIndex) == 0)
		string = string.substring(0, lastIndex);

	return string;
}

function getBitsFromByte(buffer, byteIndex, mask, shift)
{
	var tmpByte = buffer[byteIndex];
	var tmp = tmpByte & mask;

	return tmp >> shift;
}

function getTag(fullPath, callback)
{	
	var tagHeaderSize = 10;
	var frameHeaderSize = 10;

	var tagMinorVer = 3;
	var tagSize = 0;

	var fileHandle = null;

	var tag = { 'path' : fullPath };

	function returnError(errorMsg)
	{
		var error = { msg: errorMsg }
    	callback(error);
	}

	function readTagDone()
	{
		getTrackTime();
	}

	function getTrackTime()
	{
		buffer = new Buffer(4);
		fs.read(fileHandle, buffer, 0, 4, tagSize + 10,  
			function(error, bytesRead)
			{
				debugger;

				if (error)
				{
					returnError("Error reading mp3 frame.")
					return;
				}

				if (!verifyFrame(buffer))
				{
					returnError("Invalid mp3 frame.")
					return;
				}

				var mpegVersion = getMPEGVersion(buffer);
				var layer = getLayer(buffer);
				var bitRateIndex = getBitrateIndex(buffer);
				var samplingRate = getSamplingRateIndex(buffer);
				var paddingBit = getPaddingBit(buffer);
				var channelMode = getChannelMode(buffer);

				var bitRate = getBitRate(bitRateIndex, mpegVersion, layer);

				var trackTime = getTimeString(bitRate);

			});
	}

	function verifyFrame(buffer)
	{
		return buffer[0] == 0xFF;
	}

	function getMPEGVersion(buffer)
	{
		var tmpVersion = getBitsFromByte(buffer, 1, 0x18, 3);

		switch (tmpVersion)
		{
		case 0:
			return 3; // MPEG 2.5

		case 1:
			return 0; // Reserved

		case 2: 
			return 2; // MPEG 2

		case 3:
		default:
			return 1; // MPEG 1
		}
	}

	function getLayer(buffer)
	{
		var tmpLayer = getBitsFromByte(buffer, 1, 0x6, 1);

		switch (tmpLayer)
		{
		case 0:
			return 0; // Reserved

		case 1:
		default:		
			return 3; // Layer III

		case 2:
			return 2; // Layer II

		case 3:
			return 1; // Layer I 
		}
	}

	function getBitrateIndex(buffer)
	{
		return getBitsFromByte(buffer, 2, 0xF0, 4);
	}

	function getSamplingRateIndex(buffer)
	{
		return getBitsFromByte(buffer, 2, 0xC, 2);
	}

	function getPaddingBit(buffer)
	{
		return getBitsFromByte(buffer, 2, 0x2, 1);
	}

	function getChannelMode(buffer)
	{
		return getBitsFromByte(buffer, 2, 0xC0, 6);
	}

	function getSamplingRate(samplingRate)
	{
		var sampleRateArray =
		[ 
			[44100, 22050, 11025],
			[48000, 24000, 12000],
			[32000, 16000, 8000] 
		]
	}

	function getBitRate(bitRateIndex, mpegVersion, layer)
	{
		var x = 0;

		if (mpegVersion == 1)
		{
			switch (layer)
			{
			case 1:
				x = 0;
				break;

			case 2:
				x = 1;
				break;

			case 3:
				x = 2;
			}
		}
		else
		{
			switch (layer)
			{
			case 1:
				x = 3;
				break;

			case 2:
			case 3:
				x = 4;
				break;
			}
		}

		var bitRateArray =
		[ 
			[0,		0,		0,		0,		0],
			[32,	32,		32,		32,		8],
			[64,	48,		40,		48,		16],
			[96,	56,		48,		56,		24],
			[128,	64,		56,		64,		32],
			[160,	80,		64,		80,		40],
			[192,	96,		80,		96,		48],
			[224,	112,	96,		112,	56],
			[256,	128,	112,	128,	64],
			[288,	160,	128,	144,	80],
			[320,	192,	160,	160,	96],
			[352,	224,	192,	176,	112],
			[384,	256,	224,	192,	128],
			[416,	320,	256,	224,	144],
			[448,	384,	320,	256,	160]
		]

		return bitRateArray[bitRateIndex][x];
	}

	function getTimeString(bitRate)
	{
		var stat = fs.statSync(fullPath);
		var time = Math.floor((stat.size - tagSize) / ((bitRate * 1000) / 8));

		var minutes = Math.floor(time / 60);
		var seconds = time - (minutes * 60);

		return minutes + ':' + seconds;
	}

	function readTag()
	{
		function readTagDataDone(tagData)
		{
			readTagFrames(tagData, readTagDone);
		}

		function readTagHeaderDone()
		{
			readTagData(tagSize, readTagDataDone);
		}

		readTagHeader(readTagHeaderDone);
	}

	function verifyTagHeader(buffer)
	{
		if (buffer.length < minTagSize)
			return false;

		var tagID = buffer.toString('utf8', 0, 3);

		if (tagID != 'ID3')
			return false;

		return true;
	}

	function verifyTagVersion()
	{
		if (tagMinorVer < minTagMinorVer || 
			tagMinorVer > maxTagMinorVar)
			return false;

		return true;
	}

	function setTagDefaults()
	{
		switch (tagMinorVer)
		{
			case 2:
				frameHeaderSize = ver22HeaderSize;
				break;

			case 3:
			case 4:
			default:
				frameHeaderSize = ver23HeaderSize;
				break;
		}
	}

	function setTagSize(buffer)
	{
		if (tagMinorVer > 3)
		{
			tagSize = buffer.readUInt32BE(6);
		}
		else
		{
			tagSize = buffer.readUInt32BE(6);

			var tmpValue = tagSize & sevenBitMask;
			for (byteCount = 1; byteCount < 4; byteCount++)
			{
				var tmpByte = (sevenBitMask << (byteSize * byteCount));
				tmpValue = ((tagSize & tmpByte) >> byteCount) + tmpValue;
			}

			tagSize = tmpValue;
		}
	}

	function readTagHeader(callback)
	{
		var headerBuffer = new Buffer(tagHeaderSize);
		fs.read(fileHandle, headerBuffer, 0, tagHeaderSize, 0, 
			function(error, bytesRead) 
			{
				if (error)
				{
					returnError(error);
					return;
				}

				if (!verifyTagHeader(headerBuffer))
				{
					returnError('Invalid tag header.');
					return;
				}

				tagMinorVer = headerBuffer.readUInt8(3);

				if (!verifyTagVersion())
				{
					returnError('Invalid tag version.');
					return;
				}

				setTagDefaults();

				setTagSize(headerBuffer);

    			headerBuffer = null;
    			callback();
    		});
	}

	function readTagData(tagSize, callback)
	{
		var dataBuffer = new Buffer(tagSize);
		fs.read(fileHandle, dataBuffer, 0, tagSize, tagHeaderSize, 
			function(error, bytesRead) 
			{
				if (error)
				{
					dataBuffer = null;
					returnError(error);

					return;
				}

				callback(dataBuffer);
			});
	}

	function isEncodedFrame(frameID)
	{
		if (frameID[0] == 'T')
			return true;

		return false;
	}

	function getFrameEncodingType(frameEncodingByte)
	{
		switch (frameEncodingByte)
		{
		default:
		case 0:
			return 'ascii';

		case 3: 
			return 'utf8';

		case 1:
		case 2:
			return 'utf16le';
			return 'utf16le';
		}
	}

	function getTagFrame(tagData, offset, callback)
	{
		var frameID;
		var frameSize = 0;

		if (tagMinorVer > 2)
		{
			frameID = tagData.toString('utf8', offset, offset + 4);
			offset += 4;

			frameSize = tagData.readUInt32BE(offset);
			offset += 4;

			var frameFlags = tagData.readUInt16BE(offset);
			offset += 2;
		}
		else
		{
			frameID = tagData.toString('utf8', offset, offset + 3);
			offset += 3;

			for (cnt = 0; cnt < 3; cnt++)
				frameSize += tagData[offset + cnt] << byteSize * (2 - cnt);

			offset += 3;
		}

		frameID = trimNullChar(frameID);

		var frameData;

		if (!isIgnoreFrame(frameID))
		{
			var dataSize = frameSize;

			var frameEncoding = 'utf8';
			if (isEncodedFrame(frameID))
			{
				var frameEncodingByte = tagData.readUInt8(offset);
				
				offset += 1;
				dataSize -= 1;

				frameEncoding = getFrameEncodingType(frameEncodingByte);
			}

			frameData = tagData.toString(frameEncoding, offset, offset + dataSize);
		}

		callback(frameID, frameSize, frameData);
	}

	function isIgnoreFrame(frameID)
	{
		switch (frameID)
		{
		case 'TAL':
		case 'TALB':
		case 'TT2':
		case 'TIT2':
		case 'TP1':
		case 'TPE1':
		case 'TP2':
		case 'TPE2':
			return false;
		}

		return true;
	}

	function processTagData(tag, frameID, frameData, callback)
	{
		frameData = trimNullChar(frameData)

		switch (frameID)
		{
		case 'TAL':
		case 'TALB':
			tag.album = frameData;
			break;

		case 'TT2':
		case 'TIT2':
			tag.track = frameData;
			break;

		case 'TP1':
		case 'TPE1':
			tag.artist = frameData;
			break;

		case 'TP2':
		case 'TPE2':
			tag.albumArtist = frameData;
			break;
		}

		callback();
	}

	function readTagFrames(tagData, callback)
	{
		var offset = 0;

		function isTagReady()
		{
			if (!tag.artist || !tag.track || !tag.album || !tag.albumArtist)
				return false;

			return true;
		}

		function processFrameDataDone()
		{
			if (isTagReady() || offset + frameHeaderSize >= tagData.length)
			{
				tagData = null;

				if (!tag.albumArtist)
					tag.albumArtist = tag.artist;

				callback();
				return;
			}

            setTimeout(getTagFrame, 0, tagData, offset, getTagFrameDone);
		}

		function getTagFrameDone(frameID, frameSize, frameData)
		{
			if (!frameID || frameID.charCodeAt(0) == 0)
			{
				// stop reading the tag if we read a blank frameID.
				offset = tagData.length;
			}	
			else
			{
				//console.log('FrameID: ' + frameID + ' >> ' + frameData + ' << ');

				offset += frameHeaderSize + frameSize;
			}

			processTagData(tag, frameID, frameData, processFrameDataDone);
		}

		getTagFrame(tagData, offset, getTagFrameDone);
	}

    fs.open(fullPath, 'r', 
    	function(status, fd) 
    	{
    		if (status) 
    		{
    			returnError(status.error);
        		return;
        	}

        	fileHandle = fd;
    		readTag();
    	});
}

module.exports.getTag = getTag;
