var fs = require('fs');

function trimNullChar(string)
{
	if (!string || string.length == 0)
		return string;

	var lastIndex = string.length - 1;

	if (string.charCodeAt(lastIndex) == 0)
		string = string.substring(0, lastIndex);

	return string;
}

function getTag(fullPath, callback)
{	
	var tagHeaderSize = 10;
	var frameHeaderSize = 10;
	var tagMinorVer = 3;

	function returnError(errorMsg)
	{
		var error = { msg: errorMsg }
    	callback(error);
	}

	function readTag(fd)
	{
		function readTagDataDone(tagData)
		{
			readTagFrames(tagData, callback);
		}

		function readTagHeaderDone(tagLen)
		{
			readTagData(fd, tagLen, readTagDataDone);
		}

		readTagHeader(fd, readTagHeaderDone);
	}

	function verifyTagHeader(buffer)
	{
		if (buffer.length < 3)
			return false;

		var tagID = buffer.toString('utf8', 0, 3);

		if (tagID != 'ID3')
			return false;

		return true;
	}

	function verifyTagVersion()
	{
		if (tagMinorVer < 1 || tagMinorVer > 4)
			return false;

		return true;
	}

	function setTagDefaults()
	{
		switch (tagMinorVer)
		{
			case 2:
				frameHeaderSize = 6;
				break;

			case 3:
			case 4:
			default:
				frameHeaderSize = 10;
				break;
		}
	}

	function getTagLength(buffer)
	{
		var tagLen = 0;

		if (tagMinorVer > 3)
		{
			tagLen = buffer.readUInt32BE(6);
		}
		else
		{
			tagLen = buffer.readUInt32BE(6);

			var tmpValue = tagLen & 0x7F;
			for (byteCount = 1; byteCount < 4; byteCount++)
			{
				var tmpByte = (0x7F << (8 * byteCount));
				tmpValue = ((tagLen & tmpByte) >> byteCount) + tmpValue;
			}

			tagLen = tmpValue;
		}

		return tagLen;
	}

	function readTagHeader(fd, callback)
	{
		var headerBuffer = new Buffer(tagHeaderSize);
		fs.read(fd, headerBuffer, 0, tagHeaderSize, 0, 
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

				var tagLen = getTagLength(headerBuffer);

    			headerBuffer = null;
    			callback(tagLen);
    		});
	}

	function readTagData(fd, tagLen, callback)
	{
		var dataBuffer = new Buffer(tagLen);
		fs.read(fd, dataBuffer, 0, tagLen, 10, 
			function(error, bytesRead) 
			{
				fs.closeSync(fd);

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

		case 1:
			return 'utf16le';

		case 2:
			return 'utf16le';

		case 3: 
			return 'utf8';
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
				frameSize += tagData[offset + cnt] << 8 * (2 - cnt);

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

				//frameEncoding = getFrameEncodingType(frameEncodingByte);
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
		var tag = { 'path' : fullPath };

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

				callback(null, tag);
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

    		readTag(fd);
    	});
}

module.exports.getTag = getTag;
