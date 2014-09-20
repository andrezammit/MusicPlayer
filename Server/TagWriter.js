var fs = require('fs');
var tmp = require('tmp');

var tagParser = require('./TagParser');

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
		{
			tagSize += frameHeaderSize + 
				7 +					// Artwork info.
				tag.artwork.length;	// Artwork data.
		}

		return tagSize;
	}

	function getBufferSize(tag)
	{
		var tagSize = getTagSize(tag);
		var bufferSize = tagSize;

		if (tag.artwork)
			bufferSize -= tag.artwork.length;

		return bufferSize;
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

	function writeArtworkFrame(frameID, data)
	{
		var frameSize = data.length + 7;

		_newTagBuffer.write(frameID, _bufferOffset);				// Frame ID.
		_bufferOffset += 4;

		_newTagBuffer.writeUInt32BE(frameSize, _bufferOffset);		// Frame size.
		_bufferOffset += 4;

		_newTagBuffer.writeUInt16BE(0, _bufferOffset);				// Flags.
		_bufferOffset += 2;

		var mimeType = 'PNG';

		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Encoding byte.
		_bufferOffset += 1;

		_newTagBuffer.write(mimeType, _bufferOffset);				// MIME type.
		_bufferOffset += mimeType.length;

		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Zero terminator.
		_bufferOffset += 1;

		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Picture type.
		_bufferOffset += 1;

		var description = '';

		_newTagBuffer.write(description, _bufferOffset);			// Description type.
		_bufferOffset += description.length;

		_newTagBuffer.writeUInt8(0, _bufferOffset);					// Zero terminator.
		_bufferOffset += 1;

		_newTagBuffer = Buffer.concat([_newTagBuffer, data], _newTagBuffer.length + data.length);		// Data.
		_bufferOffset += data.length;

		console.log('Artwork length: ' + data.length);
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

		var tagSize = 0;
		var tmpTagSize = getTagSize(_newTag);

		for (var byte = 0; byte < 4; byte++)
		{
			var tmp = tmpTagSize & 0x7F << (7 * byte);
			tmpTagSize -= tmp;

			tagSize += tmp << byte;
		}

		_newTagBuffer.writeUInt32BE(tagSize, _bufferOffset);		// Size.
		_bufferOffset += 4;
	}

	function prepareData()
	{
		writeFrame(_newTagBuffer, 'TAL', _newTag.album);
		writeFrame(_newTagBuffer, 'TT2', _newTag.song);
		writeFrame(_newTagBuffer, 'TP1', _newTag.artist);
		writeFrame(_newTagBuffer, 'TP2', _newTag.albumArtist);
		writeFrame(_newTagBuffer, 'TRK', _newTag.track);
		writeFrame(_newTagBuffer, 'TYE', _newTag.year);

		if (_newTag.artwork)
			writeArtworkFrame('PIC', _newTag.artwork);
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
				{
					callback(error);
					return;
				}

				_oldTag = tag;
				_oldTagSize = tag.tagSize;

				getTagDone();
			});
	}

	function getTagDone()
	{
		copyMissingTagData();

		_newTagBuffer = new Buffer(getBufferSize(_newTag));
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
