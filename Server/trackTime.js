var fs = require('fs');

var id3TagPadding = 10;

function trackTime(fd, tagOffset)
{
	this.fd = fd;
	this.frameHeader = null;
	this.tagOffset = tagOffset;

	////////////////////////////////////////////////////////////////////////////
	// Helpers 

	function returnError(errorMsg)
	{
		var error = { msg: errorMsg }
    	this.callback(error);
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

	////////////////////////////////////////////////////////////////////////////
	// Flow

	function getTimeString(bitRate)
	{
		var stat = fs.statSync(fullPath);
		var time = Math.floor((stat.size - tagSize) / ((bitRate * 1000) / 8));

		var minutes = Math.floor(time / 60);
		var seconds = time - (minutes * 60);

		return minutes + ':' + seconds;
	}
}

trackTime.prototype.getTrackTime = function(callback)
{
	this.frameHeader = new Buffer(4);
	fs.read(this.fd, this.frameHeader, 0, 4, this.tagOffset + id3TagPadding,  
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

			callback(trackTime);
		});
}

module.exports = trackTime;
