var fs = require('fs');
var tagParser = require('./TagParser');

var minTagMinorVer = 1;
var maxTagMinorVar = 4;

var minTagSize = 3;

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

function TagWriter()
{
	var _newTag;
	var _oldTag;

	var _oldTagSize;

	var _fullPath;

	var _callback;

	var _newTagBuffer;

	////////////////////////////////////////////////////////////////////////////
	// Helpers 

	function isEncodedFrame(frameID)
	{
		if (frameID[0] == 'T')
			return true;

		return false;
	}

	function getTagSize(tag)
	{
		return tag.artist.length + 1 + 
			tag.album.length + 1 +
			tag.song.length + 1 + 
			tag.albumArtist.length + 1 + 
			tag.track.length + 1 + 
			tag.year.length + 1 +
			tag.artwork.length + 
			70 + 					// Frame headers. 
			10;						// Tag header.
	}

	function writeFrame(buffer, frameID, data)
	{
		var frameSize = tag.album.length;
		var encodedFrame = isEncodedFrame(frameID);

		if (encodedFrame)
			frameSize++;

		buffer.write(frameID);			// Frame ID.
		buffer.write(frameSize);		// Frame size.
		buffer.writeUint8(0);			// Flags.

		if (encodedFrame)
			buffer.writeUint8(0);

		buffer.write(data);				// Data.
	}

	function copyMissingTagData()
	{
		if (!_newTag.album)
			_newTag.album = _oldTag.album;

		if (!_newTag.song)
			_newTag.song = _oldTag.song;

		if (!_newTag.albumArtist)
			_newTag.albumArtist = _oldTag.albumArtist;

		if (!_newTag.year)
			_newTag.year = _oldTag.year;
		
		if (!_newTag.artist)
			_newTag.artist = _oldTag.artist;

		if (!_newTag.track)
			_newTag.track = _oldTag.track;

		if (!_newTag.artwork)
			_newTag.artwork = _oldTag.artwork;
	}

	function prepareHeader()
	{
		var newSize = _newTag.artist.length + 1 + 
			_newTag.album.length + 1 +
			_newTag.song.length + 1 + 
			_newTag.albumArtist.length + 1 + 
			_newTag.track.length + 1 + 
			_newTag.year.length + 1 +
			_newTag.artwork.length;

		_newTagBuffer.write('ID3');					// ID3 identifier.
		_newTagBuffer.writeUInt8(4, 3);				// Major version.
		_newTagBuffer.writeUInt8(0, 4);				// Minor version.
		_newTagBuffer.writeUInt8(0, 5);				// Flags.
		_newTagBuffer.writeUInt32BE(newSize, 6);	// Size.
	}

	function prepareData()
	{
		debugger;

		writeFrame(_newTagBuffer, 'TALB', _newTag.album);
		writeFrame(_newTagBuffer, 'TIT2', _newTag.song);
		writeFrame(_newTagBuffer, 'TPE1', _newTag.artist);
		writeFrame(_newTagBuffer, 'TPE2', _newTag.albumArtist);
		writeFrame(_newTagBuffer, 'TRCK', _newTag.track);
		writeFrame(_newTagBuffer, 'TYER', _newTag.year);
		writeFrame(_newTagBuffer, 'APIC', _newTag.artwork);
	}

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.saveTag = function(fullPath, newTag, callback)
	{
		_fullPath = fullPath;
		_callback = callback;

		_newTag = newTag;

		console.log('Saving ID3 tag to: ' + fullPath);

		new tagParser(true, false, false).getTag(fullPath, 
			function(error, tag)
			{
				if (error)
					callback(error);

				_oldTag = tag;
				_oldTagSize = tag.tagSize;

				getTagDone();
			});
	}

	function getTagDone()
	{
		copyMissingTagData();

		_newTagBuffer = new Buffer(getTagSize(_newTag));

		prepareHeader();
		prepareData();

		createTempFile();
	}

	function createTempFile()
	{
		tmp.file(
			function(error, tmpPath, fd) 
			{
			  	if (error) 
			  		throw error;

			  	createTempFileDone(fd, tmpPath);
			});
	}

	function createTempFileDone(fd, tmpPath)
	{
		writeTagData(fd, tmpPath);
	}

	function writeTagData(fd, tmpPath)
	{
		fs.write(fd, _newTagBuffer, 0, _newTagBuffer.length, 0, 
			function(error, written, buffer)
			{
				if (error)
					throw error;

				writeTagDataDone(fd, tmpPath);
			})
	}

	function writeTagDataDone(fd, tmpPath)
	{
		copySongDataToTemp(fd, tmpPath);
	}

	function copySongDataToTemp(fd, tmpPath)
	{
		var readStream = fs.createReadStream(_fullPath, { start: _oldTagSize });
		var writeStream = fs.createWriteStream(null, { fd: fd, mode: 'r+', start: _newTagBuffer.length });

		readStream.on('open', 
			function()
			{

			});

		readStream.on('data',
			function(chunk)
			{
				writeStream.write(chunk);
			});

		readStream.on('end',
			function()
			{
				writeStream.end(null, null, 
					function()
					{
						copySongDataToTempDone(tmpPath);
					});
			});
	}

	function copySongDataToTempDone(tmpPath)
	{
		copyBackToOriginal(tmpPath);
	}

	function copyBackToOriginal(tmpPath)
	{
		var readStream = fs.createReadStream(tmpPath);
		var writeStream = fs.createWriteStream(_fullPath);

		readStream.on('open', 
			function()
			{

			});

		readStream.on('data',
			function(chunk)
			{
				writeStream.write(chunk);
			});

		readStream.on('end',
			function()
			{
				writeStream.end(null, null, 
					function()
					{
						copyBackToOriginalDone();
					});
			});
	}

	function copyBackToOriginalDone()
	{
		tmp.setGracefulCleanup();
		_callback();
	}
}

module.exports = TagWriter;
