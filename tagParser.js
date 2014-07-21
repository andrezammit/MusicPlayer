var fs = require('fs');

var tagHeaderSize = 10;
var frameHeaderSize = 10;

function getTag(fullPath, callback)
{	
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

		console.log(tagID);

		if (tagID != 'ID3')
			return false;

		return true;
	}

	function verifyTagVersion(tagMinorVer)
	{
		if (tagMinorVer < 1 || tagMinorVer > 4)
			return false;

		return true;
	}

	function getTagLength(buffer, tagMinorVer)
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
			for (lineCount = 1; lineCount < 4; lineCount++)
			{
				var tmpByte = (0x7F << (8 * lineCount));
				tmpValue = ((tagLen & tmpByte) >> lineCount) + tmpValue;
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

				if (!verifyTagVersion(tagMinorVer))
				{
					returnError('Invalid tag version.');
					return;
				}

				var tagLen = getTagLength(headerBuffer, tagMinorVer);

    			console.log(headerBuffer.toString('utf-8', 0, bytesRead));
    			
    			console.log('Path = ' + fullPath);
    			console.log('Tag length = ' + tagLen);

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
		switch (frameID)
		{
		case 'TAL':
		case 'TALB':
		case 'TT2':
		case 'TIT2':
		case 'TP1':
		case 'TPE1':
			return true;
		}

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
		var frameID = tagData.toString('utf8', offset, offset + 4);
		offset += 4;

		if (frameID.charCodeAt(3) == 0)
			frameID = frameID.substring(0, 3);

		var frameSize = tagData.readUInt32BE(offset);
		offset += 4;

		var frameFlags = tagData.readUInt16BE(offset);
		offset += 2;

		var frameData;

		if (!isIgnoreFrame(frameID))
		{
			console.log(frameID);

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
			return false;
		}

		return true;
	}

	function processTagData(tag, frameID, frameData, callback)
	{
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
		}

		callback();
	}

	function readTagFrames(tagData, callback)
	{
		var tag = {};
		var offset = 0;

		function processFrameDataDone()
		{
			if (offset + 10 >= tagData.length)
			{
				tagData = null;

				callback(null, tag);
				return;
			}

            setTimeout(getTagFrame, 0, tagData, offset, readTagFrameDone);
		}

		function readTagFrameDone(frameID, frameSize, frameData)
		{
			offset += frameHeaderSize + frameSize;
			processTagData(tag, frameID, frameData, processFrameDataDone);
		}

		getTagFrame(tagData, offset, readTagFrameDone);
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
