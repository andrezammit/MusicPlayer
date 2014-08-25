var fs = require('fs');
var images = require('images');
var lwip = require('lwip');
var tufu = require('tufu');

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

function readUntilNullChar(buffer, offset)
{
	var result = '';

	for (var cnt = offset; cnt < buffer.length; cnt++)
	{
		var currentByte = buffer[cnt];

		if (currentByte == 0)
			break;

		result += String.fromCharCode(currentByte);
	}

	return result;
}

function TagParser(includeArtwork)
{
	if (!includeArtwork)
		includeArtwork = false;

	var _tagSize = 0;
	var _tagOffset = 0;
	var _tagMinorVer = 3;

	var _includeArtwork = includeArtwork;

	var _fd = null;

	var _tag = { };

	var _callback = null;

	var _dataBuffer = null;
	var _headerBuffer = null;

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
		if (_tagMinorVer < minTagMinorVer || 
			_tagMinorVer > maxTagMinorVar)
			return false;

		return true;
	}

	function isEncodedFrame(frameID)
	{
		if (frameID[0] == 'T')
			return true;

		return false;
	}

	function isArtworkFrame(frameID)
	{
		if (frameID == 'APIC' || frameID == 'PIC')
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
		switch (_tagMinorVer)
		{
			case 2:
				_frameHeaderSize = ver22HeaderSize;
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
		if (_tagMinorVer > 3)
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
			!_tag.song || 
			!_tag.album || 
			!_tag.albumArtist ||
			!_tag.track ||
			!_tag.year)
			return false;

		if (_includeArtwork && !_tag.artwork)
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
		case 'TRK':
		case 'TRCK':
		case 'TYE':
		case 'TYER':
			return false;

		case 'PIC':
		case 'APIC':
			if (_includeArtwork)
				return false;
		}

		return true;
	}

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.getTagSize = function()
	{
		return _tagSize;
	}

	this.getTag = function(fullPath, callback)
	{
		console.log('Extracting ID3 tag from: ' + fullPath);

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

				_tagMinorVer = _headerBuffer.readUInt8(3);

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

		if (_tagMinorVer > 2)
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
			frameID = _dataBuffer.toString('utf8', _tagOffset, _tagOffset + 3);
			_tagOffset += 3;

			for (cnt = 0; cnt < 3; cnt++)
				frameSize += _dataBuffer[_tagOffset + cnt] << byteSize * (2 - cnt);

			_tagOffset += 3;
		}

		frameID = trimNullChar(frameID);

		var frameData;

		if (!isIgnoreFrame(frameID))
		{
			var tmpDataSize = frameSize;
			var tmpOffset = _tagOffset;

			var frameEncoding = 'utf8';
			if (isEncodedFrame(frameID))
			{
				var frameEncodingByte = _dataBuffer.readUInt8(_tagOffset);
				
				// Skip the encoding byte.

				tmpDataSize -= 1;
				tmpOffset += 1;

				frameEncoding = getFrameEncodingType(frameEncodingByte);

				if (frameEncodingByte == 1 ||
					frameEncodingByte == 2)
				{
					// Skip the UTF-16 BOM.

					tmpDataSize -=2;
					tmpOffset += 2;
				}
			}
			else if (isArtworkFrame(frameID))
			{
				var encodingByte = _dataBuffer.readUInt8(tmpOffset);
				tmpOffset += 1;
				tmpDataSize -= 1;

				var mimeType = 'PNG';

				if (_tagMinorVer == 2)
				{
					mimeType = _dataBuffer.toString('ascii', tmpOffset, tmpOffset + 3);
					tmpOffset += 3;
					tmpDataSize -= 3;
				}
				else
				{
					mimeType = readUntilNullChar(_dataBuffer, tmpOffset);
					tmpOffset += mimeType.length + 1;
					tmpDataSize -= mimeType.length + 1;
				}

				var pictureType = _dataBuffer.readUInt8(tmpOffset);
				tmpOffset += 1;
				tmpDataSize -= 1;

				var description = readUntilNullChar(_dataBuffer, tmpOffset);

				// assumed that the description is using 1 byte per character and ignoring encodings.
				tmpOffset += description.length + 1;
				tmpDataSize -= description.length + 1;

				_tag.artworkType = mimeType;

				frameEncoding = 'base64';
			}

			frameData = _dataBuffer.toString(frameEncoding, tmpOffset, tmpOffset + tmpDataSize);
		}

		_tagOffset += frameSize;
		callback(frameID, frameData);
	}

	function getTagFrameDone(frameID, frameData)
	{
		if (!frameID || frameID.charCodeAt(0) == 0)
		{
			// stop reading the tag if we read a blank frameID.
			_tagOffset = _dataBuffer.length;
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
			_tag.song = frameData;
			break;

		case 'TP1':
		case 'TPE1':
			_tag.artist = frameData;
			break;

		case 'TP2':
		case 'TPE2':
			_tag.albumArtist = frameData;
			break;

		case 'TRK':
		case 'TRCK':
			{
				tmpTrack = frameData.split('/');
				_tag.track = tmpTrack[0];
			}
			break;

		case 'TYE':
		case 'TYER':
			{
				_tag.year = frameData;
			}
			break;

		case 'PIC':
		case 'APIC':
			{
				_tag.artwork = frameData;
			}
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

			new trackTime(_fd, _tag.path, _tagSize).getTrackTime(getTrackTimeDone);

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

		if (_tag.artwork)
		{
			console.log('Creating artwork thumbnail from: ' + _tag.path);

			var randNumber = Math.floor(Math.random() * (10000));
			var tmpPath = '.\\' + randNumber + '.jpg';

			var buffer = new Buffer(_tag.artwork, 'base64');
			images(buffer).save(tmpPath, 'jpg');

			lwip.open(tmpPath, 
				function(error, image)
				{
					image.batch().resize(200).toBuffer('jpg', 
						function(error, newBuffer)
						{
							_tag.artworkSmall = newBuffer.toString('base64');

							// Delete temporary artwork jpeg.
							fs.unlink(tmpPath);

							console.log('Done extracting ID3 tag from: ' + _tag.path);

							// We have everything, return from getTag.
							_callback(null, _tag);
						});
				});

			return;
		}

		console.log('Done extracting ID3 tag from: ' + _tag.path);

		// We have everything, return from getTag.
		_callback(null, _tag);
	}
}

module.exports = TagParser;