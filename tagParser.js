var fs = require('fs');

var tagHeaderSize = 10;
var frameHeaderSize = 10;

function getTag(fullPath, callback)
{	
	function returnError(error)
	{
		var error = { msg: status.message }
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

	function readTagHeader(fd, callback)
	{
		var buffer = new Buffer(tagHeaderSize);
		fs.read(fd, buffer, 0, tagHeaderSize, 0, 
			function(error, bytesRead) 
			{
				if (error)
				{
					returnError(error);
					return;
				}

				tagLen = buffer.readUInt32BE(6);

    			console.log(buffer.toString('utf-8', 0, bytesRead));
    			console.log('Tag length = ' + tagLen);

    			callback(tagLen);
    		});
	}

	function readTagData(fd, tagLen, callback)
	{
		var buffer = new Buffer(tagLen);
		fs.read(fd, buffer, 0, tagLen, 10, 
			function(error, bytesRead) 
			{
				if (error)
				{
					returnError(error);
					return;
				}

				callback(buffer);
			});
	}

	function isEncodedFrame(frameID)
	{
		switch (frameID)
		{
		case 'TALB':
		case 'TIT2':
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
			return 'ISO-8859-1';

		case 1:
			return 'UTF-16';

		case 2:
			return 'UTF-16BE';

		case 3: 
			return 'UTF-8';
		}
	}

	function getTagFrame(tagData, offset, callback)
	{
		var frameID = tagData.toString('utf8', offset, offset + 4);
		offset += 4;

		var frameSize = tagData.readUInt32BE(offset);
		offset += 4;

		var frameFlags = tagData.readUInt16BE(offset);
		offset += 2;

		var dataSize = frameSize;

		var frameEncoding = 'UTF-8';
		if (isEncodedFrame(frameID))
		{
			var frameEncodingByte = tagData.readUInt8(offset);
			
			offset += 1;
			dataSize -= 1;

			//frameEncoding = getFrameEncodingType(frameEncodingByte);
		}

		var frameData = tagData.toString(frameEncoding, offset, offset + dataSize);

		callback(frameID, frameSize, frameData);
	}

	function processTagData(tag, frameID, frameData, callback)
	{
		switch (frameID)
		{
		case 'TALB':
			tag.album = frameData;
			break;

		case 'TIT2':
			tag.track = frameData;
			break;

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
			if (offset >= tagData.length)
			{
				callback(tag);
				return;
			}

			getTagFrame(tagData, offset, readTagFrameDone)
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
