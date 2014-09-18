var fs = require('fs');
var tagParser = require('./TagParser');
var tmp = require('tmp');

var tagHeaderSize = 10;
var frameHeaderSize = 10;

function TagWriter()
{
	var _newTag;
	var _oldTag;

	var _oldTagSize;

	var _fullPath;

	var _callback;

	var _newTagBuffer;
	var _bufferOffset = 0;

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
		var tagSize = tag.artist.length + 1 + 
			tag.album.length + 1 +
			tag.song.length + 1 + 
			tag.albumArtist.length + 1 + 
			tag.track.length + 1 + 
			tag.year.length + 1 +
			frameHeaderSize * 5 + 	// Frame headers. 
			tagHeaderSize +			// Tag header.
			10;						// Padding.

		if (tag.artwork)
			tagSize += frameHeaderSize + 
				6;					// Artwork info.

		return tagSize;
	}

	function writeFrame(buffer, frameID, data)
	{
		var frameSize = data.length;
		var encodedFrame = isEncodedFrame(frameID);

		if (encodedFrame)
			frameSize++;

		buffer.write(frameID, _bufferOffset);				// Frame ID.
		_bufferOffset += 4;

		buffer.writeUInt32BE(frameSize, _bufferOffset);		// Frame size.
		_bufferOffset += 4;

		buffer.writeUInt16BE(0, _bufferOffset);				// Flags.
		_bufferOffset += 2;

		if (encodedFrame)
		{
			buffer.writeUInt8(0, _bufferOffset);			// Encoding byte.
			_bufferOffset += 1;
		}

		buffer.write(data, _bufferOffset);					// Data.
		_bufferOffset += data.length;
	}

	function writeArtworkFrame(buffer, frameID, data)
	{
		var frameSize = data.length;

		buffer.write(frameID, _bufferOffset);				// Frame ID.
		_bufferOffset += 4;

		buffer.writeUInt32BE(frameSize, _bufferOffset);		// Frame size.
		_bufferOffset += 4;

		buffer.writeUInt16BE(0, _bufferOffset);				// Flags.
		_bufferOffset += 2;

		var mimeType = 'PNG';

		buffer.write(mimeType, _bufferOffset);				// MIME type.
		_bufferOffset += mimeType.length;

		buffer.writeUInt8(0, _bufferOffset);				// Zero terminator.
		_bufferOffset += 1;

		buffer.writeUInt8(0, _bufferOffset);				// Picture type.
		_bufferOffset += 1;

		var description = '';

		buffer.write(description, _bufferOffset);			// MIME type.
		_bufferOffset += description.length;

		buffer.writeUInt8(0, _bufferOffset);				// Zero terminator.
		_bufferOffset += 1;

		tmpbuffer = Buffer.concat([buffer, data], buffer.length + data.length);		// Data.
		buffer = tmpbuffer;

		fs.writeFile("./BufferTest.txt", buffer, 
			function(err) {
    if(err) {
        console.log(err);
    } else {
        console.log("The file was saved!");
    }
}); 

		_bufferOffset += data.length;
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
		_newTagBuffer.write('ID3');									// ID3 identifier.
		_bufferOffset += 3;

		_newTagBuffer.writeUInt8(3, _bufferOffset);					// Major version.
		_bufferOffset += 1;
		
		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Minor version.
		_bufferOffset += 1;
		
		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Flags.
		_bufferOffset += 1;

		_newTagBuffer.writeUInt32BE(_newTagBuffer.length, _bufferOffset);		// Size.
		_bufferOffset += 4;
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

		if (_newTag.artwork)
			writeArtworkFrame(_newTagBuffer, 'APIC', _newTag.artwork);
	}

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.saveTag = function(fullPath, newTag, callback)
	{
		_fullPath = fullPath;
		_callback = callback;

		_newTag = newTag;

		console.log('Saving ID3 tag to: ' + fullPath);

		new tagParser(true, false, false, false).getTag(fullPath, 
			function(error, tag)
			{
				if (error)
					callback(error);

				debugger;

				_oldTag = tag;
				_oldTagSize = tag.tagSize;

				getTagDone();
			});
	}

	function getTagDone()
	{
		copyMissingTagData();

		_newTagBuffer = new Buffer(getTagSize(_newTag));
		_newTagBuffer.fill(0);

		prepareHeader();
		prepareData();

		createTempFile();
	}

	function createTempFile()
	{
		tmp.file(
			function(error, tmpPath, fd) 
			{
				debugger;

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
