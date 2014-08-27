var fs = require('fs');

var id3TagPadding = 10;

function TrackTime(fd, fullPath, tagOffset)
{
	var _fd = fd;
	
	var _frameHeader = null;
	var _vbrHeader = null;

	var _fullPath = fullPath;
	var _tagOffset = tagOffset + id3TagPadding;
	
	var _callback = null;
	
	var _mpegVersion = 0;
	var _layer = 0;
	var _bitRateIndex = 0;
	var _samplingRate = 0;
	var _paddingBit = 0;
	var _channelMode = 0;

	var _bitRate = 0;
	var _samplesPerFrame = 0;

	var _isVBR = false;

	var _vbrOffset = 0;
	var _vbrFrames = 0;

	////////////////////////////////////////////////////////////////////////////
	// Helpers 

	function returnError(errorMsg)
	{
		var error = { msg: errorMsg }
    	_callback(error);
	}

	function verifyFrame(buffer)
	{
		return buffer[0] == 0xFF;
	}

	function getBitsFromByte(buffer, byteIndex, mask, shift)
	{
		var tmpByte = buffer[byteIndex];
		var tmp = tmpByte & mask;

		return tmp >> shift;
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
		var samplingRateArray =
		[ 
			[44100, 22050, 11025],
			[48000, 24000, 12000],
			[32000, 16000, 8000] 
		]

		var x = _mpegVersion - 1;
		return samplingRateArray[_samplingRateIndex][x];
	}

	function getBitRate()
	{
		var x = 0;

		if (_mpegVersion == 1)
		{
			switch (_layer)
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
			switch (_layer)
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

		return bitRateArray[_bitRateIndex][x];
	}

	function getSamplesPerFrame()
	{
		var samplesPerFrameArray =
		[
			[384,	384,	384],
			[1152,	1152,	1152],
			[1152,	576,	576]
		]

		var y = _layer - 1;
		var x = _mpegVersion - 1;

		return samplesPerFrameArray[y][x];
	}

	function verifyVBRFrame(vbrHeader)
	{
		xingTag = vbrHeader.toString('utf8', 0, 4);

		if (xingTag != 'Xing')
			return false;

		return true;
	}

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.getTrackTime = function(callback)
	{
		_callback = callback;

		_frameHeader = new Buffer(4);

		fs.read(_fd, _frameHeader, 0, 4, _tagOffset,  
			function(error, bytesRead)
			{
				if (error)
				{
					returnError("Error reading mp3 frame.")
					return;
				}

				if (!verifyFrame(_frameHeader))
				{
					returnError("Invalid mp3 frame.")
					return;
				}

				_mpegVersion = getMPEGVersion(_frameHeader);
				_layer = getLayer(_frameHeader);
				_bitRateIndex = getBitrateIndex(_frameHeader);
				_samplingRateIndex = getSamplingRateIndex(_frameHeader);
				_paddingBit = getPaddingBit(_frameHeader);
				_channelMode = getChannelMode(_frameHeader);

				_bitRate = getBitRate();
				_samplingRate = getSamplingRate();
				_samplesPerFrame = getSamplesPerFrame();

				readVBRHeader(readVBRHeaderDone)
			});
	}

	function readVBRHeader(callback)
	{
		_vbrHeader = new Buffer(120)

		var vbrHeaderPos = _tagOffset + 36;
		fs.read(_fd, _vbrHeader, 0, 120, vbrHeaderPos, 
			function(error, bytesRead)
			{
				if (error)
				{
					returnError("Error reading mp3 VBR frame.")
					return;
				}

				if (!verifyVBRFrame(_vbrHeader))
				{
					callback(false);
					return;
				}

				_vbrOffset = 4;
				_isVBR = true;

				var vbrFlags = getVBRFlags();
				_vbrOffset += 4;

				if (isFrameCountAvail(vbrFlags))
				{
					_vbrFrames = getFrameCount();
					_vbrOffset += 4;
				}

				_vbrHeader = null;

				callback();
			});
	}

	function getVBRFlags()
	{
		return _vbrHeader.readUInt32BE(_vbrOffset);
	}

	function isFrameCountAvail(vbrFlags)
	{
		return vbrFlags & 0x01;
	}

	function getFrameCount()
	{
		return _vbrHeader.readUInt32BE(_vbrOffset);
	}

	function readVBRHeaderDone()
	{
		getTotalTime(getTimeAsString);
	}

	function getTotalTime(callback)
	{
		var time = 0;

		if (_isVBR)
		{
			time = _vbrFrames * (_samplesPerFrame / _samplingRate);
			callback(time);
			
			return;
		}

		fs.stat(_fullPath,
			function(error, stats)
			{
				time = (stats.size - _tagOffset) / ((_bitRate * 1000) / 8);
				callback(time);
			});
	}

	function getTimeAsString(time)
	{
		time = Math.floor(time);

		var minutes = Math.floor(time / 60);
		var seconds = time - (minutes * 60);

		if (seconds < 10)
			seconds = '0' + seconds;

		var trackTime = minutes + ':' + seconds;
		_callback(null, trackTime);
	}
}

module.exports = TrackTime;
