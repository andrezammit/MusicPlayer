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
				var layerIndex = getLayerIndex(buffer);
				var bitRateIndex = getBitrateIndex(buffer);
				var samplingRate = getSamplingRate(buffer);
				var paddingBit = getPaddingBit(buffer);
				var channelMode = getChannelMode(buffer);
			});
	}

	function verifyFrame(buffer)
	{
		return buffer[0] == 0xFF;
	}

	function getMPEGVersion(buffer)
	{
		return getBitsFromByte(buffer, 1, 0x18, 3);
	}

	function getLayerIndex(buffer)
	{
		return getBitsFromByte(buffer, 1, 0x6, 1);
	}

	function getBitrateIndex(buffer)
	{
		return getBitsFromByte(buffer, 2, 0xF0, 4);
	}

	function getSamplingRate(buffer)
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
