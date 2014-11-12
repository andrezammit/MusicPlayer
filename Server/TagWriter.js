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

	function getUnicodeStringCount(tag)
	{
		var unicodeStrings = 0;

		if (isUnicodeString(tag.artist))
			unicodeStrings++;

		if (isUnicodeString(tag.album))
			unicodeStrings++;

		if (isUnicodeString(tag.song))
			unicodeStrings++;

		if (isUnicodeString(tag.albumArtist))
			unicodeStrings++;

		if (isUnicodeString(tag.track))
			unicodeStrings++;

		if (isUnicodeString(tag.year))
			unicodeStrings++;

		return unicodeStrings;
	}

	function getUnicodeCharCount(tag)
	{
		var unicodeChars = 0;

		if (isUnicodeString(tag.artist))
			unicodeChars += tag.artist.length;

		if (isUnicodeString(tag.album))
			unicodeChars += tag.album.length;

		if (isUnicodeString(tag.song))
			unicodeChars += tag.song.length;

		if (isUnicodeString(tag.albumArtist))
			unicodeChars += tag.albumArtist.length;

		if (isUnicodeString(tag.track))
			unicodeChars += tag.track.length;

		if (isUnicodeString(tag.year))
			unicodeChars += tag.year.length;

		return unicodeChars;
	}

	function isUnicodeString(string)
	{
		if (Buffer.byteLength(string) != string.length)
			return true;

		return false;
	}

	function getTagSize(tag)
	{
		var strings = 6;
		var tagSize = 0;
		
		tagSize += tag.artist.length;
		tagSize += tag.album.length;
		tagSize += tag.song.length;
		tagSize += tag.albumArtist.length;
		tagSize += tag.track.length;
		tagSize += tag.year.length;

		// Add encoding bytes.
		tagSize += 1 * strings;

		// Add frame headers size.
		tagSize += frameHeaderSize * strings;

		// Add tag header.
		tagSize += tagHeaderSize;

		// Add space for any Unicode strings.
		var unicodeStrings = getUnicodeStringCount(tag);

		if (unicodeStrings > 0)
		{
			var unicodeChars = getUnicodeCharCount(tag);
			tagSize += unicodeChars;

			// Add BOM for Unicode strings.
			tagSize += 2 * unicodeStrings;
		}

		// Add padding.
		tagSize += 10;

		if (tag.artwork)
		{
			var mimeType = getArtworkType(tag.artwork.mimeType);

			tagSize += frameHeaderSize + 
				4 +							// Artwork info.
				mimeType.length +			// Mime type definition.
				tag.artwork.buffer.length;	// Artwork data.
		}

		return tagSize;
	}

	function getBufferSize(tag)
	{
		var tagSize = getTagSize(tag);
		var bufferSize = tagSize;

		bufferSize -= 10;								// Remove padding space.

		if (tag.artwork)
			bufferSize -= tag.artwork.buffer.length;	// Remove artwork space.

		return bufferSize;
	}

	function writeFrame(buffer, frameID, data)
	{
		var encodedFrame = isEncodedFrame(frameID);
		var unicodeString = encodedFrame && isUnicodeString(data);

		var frameSize = data.length;
		var dataSize = frameSize;

		if (unicodeString)
		{
			// Add space for 2 bytes per character.
			frameSize += data.length;
			dataSize = frameSize;

			// Add space for BOM.
			frameSize += 2;
		}

		if (encodedFrame)
			frameSize++;

		buffer.write(frameID, _bufferOffset);						// Frame ID.
		_bufferOffset += 4;

		buffer.writeUInt32BE(frameSize, _bufferOffset);				// Frame size.
		_bufferOffset += 4;

		buffer.writeUInt16BE(0, _bufferOffset);						// Flags.
		_bufferOffset += 2;

		var encodingType = 'ascii';

		if (encodedFrame)
		{
			var encodingByte = 0;

			if (unicodeString)
			{
				encodingByte = 1;
				encodingType = 'utf16le';
			}

			buffer.writeUInt8(encodingByte, _bufferOffset);			// Encoding byte.
			_bufferOffset += 1;

			if (unicodeString)
			{
				buffer.writeUInt16BE(65534, _bufferOffset);
				_bufferOffset += 2;
			}
		}

		buffer.write(data, _bufferOffset, dataSize, encodingType);	// Data.
		_bufferOffset += dataSize;
	}

	function getArtworkType(mimeType)
	{
		switch (mimeType)
		{
		case 'image/png':
			return 'PNG';

		default:
		case 'image/jpeg':
			return 'JFIF';
		}
	}

	function writeArtworkFrame(frameID, data)
	{
		var mimeType = getArtworkType(data.mimeType);
		var frameSize = data.buffer.length + 4 + mimeType.length;

		_newTagBuffer.write(frameID, _bufferOffset);				// Frame ID.
		_bufferOffset += 4;

		_newTagBuffer.writeUInt32BE(frameSize, _bufferOffset);		// Frame size.
		_bufferOffset += 4;

		_newTagBuffer.writeUInt16BE(0, _bufferOffset);				// Flags.
		_bufferOffset += 2;

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

		_newTagBuffer = Buffer.concat([_newTagBuffer, data.buffer], _newTagBuffer.length + data.buffer.length);		// Data.
		_bufferOffset += data.buffer.length;

		console.log('Artwork length: ' + data.buffer.length);
	}

	function writePadding()
	{
		var paddingBuffer = new Buffer(10);
		paddingBuffer.fill(0);

		_newTagBuffer = Buffer.concat([_newTagBuffer, paddingBuffer], _newTagBuffer.length + paddingBuffer.length);	// Padding.
	}

	function copyMissingTagData()
	{
		if (_newTag.album == null)
			_newTag.album = _oldTag.album;

		if (_newTag.song == null)
			_newTag.song = _oldTag.song;

		if (_newTag.albumArtist == null)
			_newTag.albumArtist = _oldTag.albumArtist;

		if (_newTag.year == null)
			_newTag.year = _oldTag.year;
		
		if (_newTag.artist == null)
			_newTag.artist = _oldTag.artist;

		if (_newTag.track == null)
			_newTag.track = _oldTag.track;

		if (_newTag.artwork == null)
			_newTag.artwork = _oldTag.artwork;

		_newTag.path = _oldTag.path;
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

		writePadding();
	}

	////////////////////////////////////////////////////////////////////////////
	// Flow

	this.saveTag = function(fullPath, newTag, callback)
	{
		_fullPath = fullPath;
		_callback = callback;

		_newTag = newTag;

		console.log('Saving ID3 tag to: ' + fullPath);

		new tagParser(true, false).getTag(fullPath, 
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

			  	console.log("tmpPath: " + tmpPath);
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
			});
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
