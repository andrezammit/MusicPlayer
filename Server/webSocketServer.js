var ws = require('ws').Server;
var database = require('./database');
var tagParser = require('./TagParser');
var tagWriter = require('./tagWriter');
var fileSystem = require('./fileSystem');

var wsServer = new ws({ port: 3001 });

function onWSConnection(webSock)
{
	console.log('New web socket connection.');

	webSock.on('message', processRequest);

	function processRequest(message)
	{
		var query = JSON.parse(message);

		console.log(query.call);

		switch (query.call)
		{
		case 'getTags':
			{
				database.getTags(query.offset, query.tagsToGet, 
					function(docs)
					{
						if (docs && docs.length > 0)
						{
							var reply = { command: 'getTagsReply', error: getNoTagsResponse() };
							sendData(reply);

							return;
						}

						var reply = { command: 'getTagsReply', tagCount: docs.length, tagData: docs };
						sendData(reply);
					});
			}
			break;

		case 'getTagCount':
			{
				database.getTagCount(
					function(count)
					{
						var reply = { command: 'getTagCountReply', tagCount: count };
						sendData(reply);
					});
			}
			break;

		case 'getAlbumCount':
			{
				database.getAlbumCount(
					function(count)
					{
						var reply = { command: 'getAlbumCountReply', albumCount: count };
						sendData(reply);
					});
			}
			break;

		case 'getAlbums':
			{
				database.getAlbums(query.offset, query.albumsToGet, 
					function(docs)
					{
						if (!docs)
						{
							var reply = { command: 'getAlbumsReply', error: getNoTagsResponse() };
							sendData(reply);

							return;
						}

						var albumsDone = 0;
						for (var cnt = 0; cnt < docs.length; cnt++)
						{
							getCachedArtwork(docs[cnt], 
								function(tag, artwork)
								{
									if (artwork)
									{
										tag.artwork = { buffer: artwork.data, mimeType: artwork.type };

										if (tag.artwork.buffer)
											tag.artwork.buffer = bufferToBinary(tag.artwork.buffer);
									}

									albumsDone++;

									if (albumsDone == docs.length)
										sendGetAlbumsReply();						
								})
						}

						function sendGetAlbumsReply()
						{
							var reply = { command: 'getAlbumsReply', albumCount: docs.length, albumData: docs };
							sendData(reply);
						}
					});
			}
			break;

		case 'getTracks':
			{
				database.getAlbumTracks(query.albumArtist, query.album, 
					function(docs)
					{
						if (!docs)
						{
							var reply = { command: 'getTracksReply', error: getNoTagsResponse() };
							sendData(reply);

							return;
						}

						new tagParser(true, false).getTag(docs[0].path, 
							function(error, tag)
							{
								if (tag.artwork)
									tag.artwork.buffer = bufferToBinary(tag.artwork.buffer);

								var replyData = { artist: query.albumArtist, album: query.album, trackList: docs, artwork: tag.artwork };

								var reply = { command: 'getTracksReply', replyData: replyData };
								sendData(reply);
							});
					});
			}
			break;

		case 'getSongInfo':
			{
				database.getFileFromID(query.id, 
					function(filePath)
					{
						new tagParser(true, false).getTag(filePath, 
							function(error, tag)
							{
								if (tag.artwork)
									tag.artwork.buffer = bufferToBinary(tag.artwork.buffer);

								var reply = { command: 'getSongInfoReply', songInfo: tag };
								sendData(reply);
							});
					});
			}
			break;

		case 'updateSongInfo':
			{
				updateSongInfo(query.id, query.tag, 
					function()
					{
						var reply = { command: 'updateSongInfoReply', error: 0 };
						sendData(reply);
					});
			}
			break;

		case 'getFileListing':
			{
				fileSystem.getFolderContents(query.path, query.filter, query.showFiles, 
					function(error, fileList)
					{
						var reply = { command: 'getFileListingReply', fileList: fileList, error: error };
						sendData(reply);
					});	
			}
			break;

		case 'addFiles':
			{
				addFiles(query.itemList,
					function()
					{
						var reply = { command: 'addFilesReply', savedFiles: query.itemList.length };
						sendData(reply);
					});
			}
			break;

		case 'addFolders':
			{
				addFolders(query.itemList,
					function()
					{
						var reply = { command: 'addFoldersReply', savedFiles: query.itemList.length };
						sendData(reply);
					})	
			}

		case 'deleteSong':
			{
				database.deleteTag(query.id,
					function()
					{
						var reply = { command: 'deleteSongReply', error: 0 };
						sendData(reply);
					});
			}
			break;

		case 'getAlbumInfo':
			{
				database.getAlbumTracks(query.artist, query.album, 
					function(docs)
					{
						if (!docs)
						{
							var reply = { command: 'getAlbumInfoReply', error: getNoTagsResponse() };
							sendData(reply);

							return;
						}

						var tagList = [];
						var artwork = {};

						for (var cnt = 0; cnt < docs.length; cnt++)
						{
							var includeArtwork = cnt == 0;

							new tagParser(includeArtwork, false).getTag(docs[cnt].path, 
								function(error, tag)
								{					
									if (tag.artwork)
										artwork.buffer = bufferToBinary(tag.artwork.buffer);

									tagList.push(tag);

									if (tagList.length == docs.length)
									{
										var commonTag = getCommonTag(tagList, artwork);
										var reply = { command: 'getAlbumInfoReply', commonTag: commonTag };

										sendData(reply);
									}
								});
						}
					});
			}
			break;

		case 'updateAlbumInfo':
			{
				database.getAlbumTracks(query.artist, query.album, 
					function(docs)
					{
						if (!docs)
						{
							var reply = { command: 'updateAlbumInfoReply', error: getNoTagsResponse() };
							sendData(reply);

							return;
						}

						var songsDone = 0;

						function updateSongInfoDone()
						{
							songsDone++;

							if (songsDone == docs.length)
							{
								var reply = { command: 'updateAlbumInfoReply' };
								sendData(reply);
							}
							else
							{
								updateSongInfo(docs[songsDone]._id, query.tag, updateSongInfoDone);
							}
						}

						updateSongInfo(docs[songsDone]._id, query.tag, updateSongInfoDone);
					});
			}
			break;

		case 'deleteAlbum':
			{
				database.deleteAlbum(query.artist, query.album,
					function()
					{
						var reply = { command: 'deleteAlbumReply' };
						sendData(reply);
					});
			}
			break;
		}
	}	

	function sendData(data)
	{
		webSock.send(JSON.stringify(data));
	}
}

function onWSClose(code, message)
{
	console.log('Connection closed. Message: ' + message + ' Code: ' + code);
}

function getNoTagsResponse()
{
	return 'No mp3 files found.';
}

function getNoArtworkResponse()
{
	return 'No artwork for this album.';
}

function getNoMoreTracksReply()
{
	return 'No more tracks in this album.';
}

function getCachedArtwork(tag, callback)
{
	database.getCachedArtwork(tag.artworkHash, 
		function(artwork)
		{
			callback(tag, artwork);
		});
}

function getAlbumArtwork(tag, callback)
{
	database.getAlbumTracks(tag.albumArtist, tag.album,
		function(docs)
		{
			if (!docs)
			{
				callback();
				return;
			}

			var index = 0;
			(function getArtworkFromFile(index)
			{
				if (index >= docs.length)
				{
					callback();
					return;
				}

				new tagParser(false, true).getTag(docs[index].path, 
					function(error, tmpTag)
					{
						if (error || !tmpTag.artworkSmall)
						{
							getArtworkFromFile(++index);
							return;
						}

						var artwork = { data: bufferToBinary(tmpTag.artworkSmall), type: tmpTag.artworkType };
						callback(tag, artwork);
					});
			})(index);
		});
}

function bufferToBinary(buffer)
{
	return buffer.toString('binary');
}

function addFiles(fileList, callback)
{
	var filesDone = 0;

	for (var cnt = 0; cnt < fileList.length; cnt++)
	{
		new tagParser(false, true, true, true).getTag(fileList[cnt].fullPath,
			function(error, tag)
			{
				database.saveTag(tag, 
					function()
					{
						filesDone++;

						if (filesDone == fileList.length)
							callback();
					});
			});
	}
}

function addFolders(folderList, callback)
{
	var fileList = [];
	var foldersDone = 0;

	for (var cnt = 0; cnt < folderList.length; cnt++)
	{
		fileSystem.scan(folderList[cnt].fullPath,
			function(error, results)
			{
				foldersDone++;
				fileList = fileList.concat(results);

				if (foldersDone == folderList.length)
					scanDone(null, fileList);
			});
	}

	function saveTagsDone(tagCount)
	{
	    console.log('Done saving ' + tagCount + ' ID3 tags to database.');
	    callback();
	}

	function extractTagsDone(tagList)
	{
	    console.log("Done extracting ID3 tags.");
	    console.log("Saving tags to database...");

	    database.saveTags(tagList, saveTagsDone);
	}

	function scanDone(error, fileList)
	{
		if (error)
		{
	        console.log('Error: ' + error);
	        return;
	    }

		if (!fileList)
		{
	        console.log('Error: No files found.');
	        return;
	    }
	    
	    console.log('Finished file listing.');
	    console.log('Found ' + fileList.length + ' files.');

	    console.log('Extracting ID3 tags...');
	    fileSystem.extractTags(fileList, extractTagsDone)
	}
}

function getCommonTag(tagList, artwork)
{
	if (tagList.length == 0)
		return null;

	var baseTag = tagList[0];
	baseTag.artwork = artwork;

	delete baseTag.song;
	delete baseTag.track;
	delete baseTag.path;
	delete baseTag.time;

	if (tagList.length < 2)
		return baseTag;

	for (var cnt = 0; cnt < tagList.length; cnt++)
	{
		var tag = tagList[cnt];

		if (baseTag.artist != tag.artist)
			delete baseTag.artist;

		if (baseTag.album != tag.album)
			delete baseTag.album;

		if (baseTag.albumArtist != tag.albumArtist)
			delete baseTag.albumArtist;

		if (baseTag.year != tag.year)
			delete baseTag.year;
	}

	return baseTag;
}

function getObjectCopy(obj)
{
	return JSON.parse(JSON.stringify(obj));
}

function getBufferFromDataURL(dataURL)
{
	var mimeStart = dataURL.indexOf(':') + 1;
	var mimeEnd = dataURL.indexOf(';');

	var mimeType = dataURL.substr(mimeStart, mimeEnd - mimeStart);
	mimeType.trim();

	var base64Tag = ';base64,';

	var dataStart = dataURL.indexOf(base64Tag) + base64Tag.length;
	var base64 = dataURL.substr(dataStart);

	return { buffer: new Buffer(base64, 'base64'), mimeType: mimeType };
}

function updateSongInfo(id, newTag, callback)
{
	var newTag = getObjectCopy(newTag);   

	if (newTag.artworkURL)
		newTag.artwork = getBufferFromDataURL(newTag.artworkURL);

	database.getFileFromID(id,
		function(filePath)
		{
			var tmpWriter = new tagWriter();

			tmpWriter.saveTag(filePath, newTag,
				function(error)
				{
					new tagParser(true, true, false, true).getTag(filePath, 
						function(error, tag)
						{
						    if (error)
						    {
						        console.log(error);
						        return;
						    }

						    database.updateTag(id, tag,
						    	function(error)
						    	{
						    		callback();
						    	});
    					});
				});
		});
}

function getBufferFromObject(object)
{
	var keys = Object.keys(object);

	var bufferSize = keys.length;
	var buffer = new Buffer(bufferSize);

	for (var cnt = 0; cnt < keys.length; cnt++)
		buffer[cnt] = object[keys[cnt]];

	return buffer;
}

wsServer.on('connection', onWSConnection);
wsServer.on('close', onWSClose);