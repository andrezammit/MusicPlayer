var fs = require('fs');
var trackTime = require('./trackTime');

var minTagMinorVer = 1;
var maxTagMinorVar = 4;

var minTagSize = 3;

var ver22HeaderSize = 6;
var ver23HeaderSize = 10;

var sevenBitMask = 0x7F;
var byteSize = 8;

var tagHeaderSize = 10;
var frameHeaderSize = 10;

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

function tagParser()
{
	_tagSize = 0;
	_tagOffset = 0;
	_tagMinorVer = 3;

	_fd = null;

	_tag = { };

	_callback = null;

	_dataBuffer = null;
	_headerBuffer = null;

	////////////////////////////////////////////////////////////////////////////
	// Helpers 

	function returnError(errorMsg)
	{
		var error = { msg: errorMsg }
    	_callback(error);
	}

	function verifyTagHeader()
	{
		if (_headerBuffer.length < minTagSize)
			return false;

		var tagID = _headerBuffer.toString('utf8', 0, 3);

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

	function setTagDefaults()
	{
		switch (tagMinorVer)
		{
			case 2:
				this._frameHeaderSize = ver22HeaderSize;
				break;

			case 3:
			case 4:
			default:
				_frameHeaderSize = ver23HeaderSize;
				break;
		}
	}

	function setTagSize()
	{
		if (tagMinorVer > 3)
		{
			_tagSize = _headerBuffer.readUInt32BE(6);
		}
		else
		{
			var tmpSize = _headerBuffer.readUInt32BE(6);

			var tmpValue = tmpSize & sevenBitMask;
			for (byteCount = 1; byteCount < 4; byteCount++)
			{
				var tmpByte = (sevenBitMask << (byteSize * byteCount));
				tmpValue = ((tmpSize & tmpByte) >> byteCount) + tmpValue;
			}

			_tagSize = tmpValue;
		}
	}

	function isTagReady()
	{
		if (!_tag.artist || 
			!_tag.track || 
			!_tag.album || 
			!_tag.albumArtist)
			return false;

		return true;
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

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.getTag = function(fullPath, callback)
	{
		_tag.path = fullPath;
		_callback = callback;

		fs.open(fullPath, 'r', 
			function(status, fd) 
	    	{
	    		if (status) 
	    		{
	    			returnError(status.error);
	        		return;
	        	}

	        	_fd = fd;
	    		readTag();
	    	});
	}

	function readTag()
	{
		readTagHeader(readTagHeaderDone);
	}

	function readTagHeader(callback)
	{
		_headerBuffer = new Buffer(tagHeaderSize);
		fs.read(_fd, _headerBuffer, 0, tagHeaderSize, 0, 
			function(error, bytesRead) 
			{
				if (error)
				{
					returnError(error);
					return;
				}

				if (!verifyTagHeader())
				{
					returnError('Invalid tag header.');
					return;
				}

				tagMinorVer = _headerBuffer.readUInt8(3);

				if (!verifyTagVersion())
				{
					returnError('Invalid tag version.');
					return;
				}

				setTagDefaults();
				setTagSize();

    			_headerBuffer = null;
    			callback();
    		});
	}

	function readTagHeaderDone()
	{
		readTagData(readTagDataDone);
	}

	function readTagData(callback)
	{
		_dataBuffer = new Buffer(_tagSize);
		fs.read(_fd, _dataBuffer, 0, _tagSize, tagHeaderSize, 
			function(error, bytesRead) 
			{
				if (error)
				{
					_dataBuffer = null;
					returnError(error);

					return;
				}

				callback();
			});
	}

	function readTagDataDone()
	{
		readTagFrames();
	}

	function readTagFrames()
	{
		getTagFrame(getTagFrameDone);
	}

	function getTagFrame(callback)
	{
		var frameID;
		var frameSize = 0;

		if (tagMinorVer > 2)
		{
			frameID = _dataBuffer.toString('utf8', _tagOffset, _tagOffset + 4);
			_tagOffset += 4;

			frameSize = _dataBuffer.readUInt32BE(_tagOffset);
			_tagOffset += 4;

			var frameFlags = _dataBuffer.readUInt16BE(_tagOffset);
			_tagOffset += 2;
		}
		else
		{
			frameID = _dataBuffer.toString('utf8', _tagOffset, offset + 3);
			_tagOffset += 3;

			for (cnt = 0; cnt < 3; cnt++)
				frameSize += _dataBuffer[offset + cnt] << byteSize * (2 - cnt);

			_tagOffset += 3;
		}

		frameID = trimNullChar(frameID);

		var frameData;

		if (!isIgnoreFrame(frameID))
		{
			var dataSize = frameSize;

			var frameEncoding = 'utf8';
			if (isEncodedFrame(frameID))
			{
				var frameEncodingByte = _dataBuffer.readUInt8(_tagOffset);
				
				_tagOffset += 1;
				dataSize -= 1;

				frameEncoding = getFrameEncodingType(frameEncodingByte);
			}

			frameData = _dataBuffer.toString(frameEncoding, _tagOffset, _tagOffset + dataSize);
		}

		callback(frameID, frameSize, frameData);
	}

	function getTagFrameDone(frameID, frameSize, frameData)
	{
		if (!frameID || frameID.charCodeAt(0) == 0)
		{
			// stop reading the tag if we read a blank frameID.
			_tagOffset = _dataBuffer.length;
		}	
		else
		{
			_tagOffset += frameHeaderSize + frameSize;
		}

		processFrameData(frameID, frameData, processFrameDataDone);
	}

	function processFrameData(frameID, frameData, callback)
	{
		frameData = trimNullChar(frameData)

		switch (frameID)
		{
		case 'TAL':
		case 'TALB':
			_tag.album = frameData;
			break;

		case 'TT2':
		case 'TIT2':
			_tag.track = frameData;
			break;

		case 'TP1':
		case 'TPE1':
			_tag.artist = frameData;
			break;

		case 'TP2':
		case 'TPE2':
			_tag.albumArtist = frameData;
			break;
		}

		callback();
	}

	function processFrameDataDone()
	{
		if (isTagReady() || 
			_tagOffset + _frameHeaderSize >= _dataBuffer.length)
		{
			_dataBuffer = null;

			if (!_tag.albumArtist)
				_tag.albumArtist = _tag.artist;

			_trackTime = new trackTime(_fd, _tagSize);
			_trackTime.getTrackTime(getTrackTimeDone);

			return;
		}

        setTimeout(getTagFrame, 0, getTagFrameDone);
	}

	function getTrackTimeDone(error, time)
	{	
		fs.closeSync(_fd);
		
		if (error)
		{
			_callback(error);
			return;
		}

		_tag.time = time;

		// We have everything, return from getTag.
		_callback(null, _tag);
	}
}

module.exports = tagParser;