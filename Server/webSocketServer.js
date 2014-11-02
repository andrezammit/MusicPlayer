var ws = require('ws').Server;
var database = require('./database');
var tagParser = require('./TagParser');
var tagWriter = require('./tagWriter');
var fileSystem = require('./fileSystem');

var _wsServer = new ws({ port: 3001 });

///////////////////////////////////////////////////////////////////////////////////////////////////
// Websocket message handlers

function onWSConnection(webSock)
{
	console.log('New web socket connection.');
	
	webSock.on('message', 
		function(message)
		{
			onWSMessage(webSock, message);
		});
}

function onWSMessage(socket, message)
{
	var query = JSON.parse(message);
	console.log(query.command);

	var queryData = query.data;

	switch (query.command)
	{
	case 'getTags':
		onGetTags(socket, queryData);
		break;

	case 'getTagCount':
		onGetTagCount(socket, queryData);
		break;

	case 'getAlbumCount':
		onGetAlbumCount(socket, queryData);
		break;

	case 'getAlbums':
		onGetAlbums(socket, queryData);
		break;

	case 'getTracks':
		onGetTracks(socket, queryData);
		break;

	case 'getSongInfo':
		onGetSongInfo(socket, queryData);
		break;

	case 'updateSongInfo':
		onUpdateSongInfo(socket, queryData);
		break;

	case 'getFileListing':
		onGetFileListing(socket, queryData);
		break;

	case 'addFiles':
		onAddFiles(socket, queryData);
		break;

	case 'addFolders':
		onAddFolders(socket, queryData);
		break;

	case 'deleteSong':
		onDeleteSong(socket, queryData);
		break;

	case 'getAlbumInfo':
		onGetAlbumInfo(socket, queryData);
		break;

	case 'updateAlbumInfo':
		onUpdateAlbumInfo(socket, queryData);
		break;

	case 'deleteAlbum':
		onDeleteAlbum(socket, queryData);
		break;
	}
}

function onWSClose(code, message)
{
	console.log('Connection closed. Message: ' + message + ' Code: ' + code);
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Websocket Helpers

function sendError(socket, command, error)
{
	return sendReply(socket, command, null, error);
}

function sendReply(socket, command, data, error)
{
	var reply = { command: command, data: data, error: error };

	try
	{
		socket.send(JSON.stringify(reply));
	}
	catch (ex)
	{
		console.log(ex);
	}
}

function sendProgress(socket, current, total, action, status)
{
	var reply = { command: 'progress', data: { current: current, total: total, action: action, status: status } };
	
	try
	{
		socket.send(JSON.stringify(reply));
	}
	catch (ex)
	{
		console.log(ex);
	}
}

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////
// Client Message Handlers

function onGetTags(socket, queryData)
{
	database.getTags(queryData.offset, queryData.tagsToGet, 
		function(docs)
		{
			if (!docs || docs.length == 0)
			{
				sendError(socket, 'getTagsReply', 'No songs found.');
				return;
			}

			var replyData = { tagCount: docs.length, tagData: docs };
			sendReply(socket, 'getTagsReply', replyData);
		});
}

function onGetTagCount(socket, queryData)
{
	database.getTagCount(
		function(count)
		{
			var replyData = { tagCount: count };
			sendReply(socket, 'getTagCountReply', replyData);
		});
}

function onGetAlbumCount(socket, queryData)
{
	database.getAlbumCount(
		function(count)
		{
			var replyData = { albumCount: count };
			sendReply(socket, 'getAlbumCountReply', replyData);
		});
}

function onGetAlbums(socket, queryData)
{
	database.getAlbums(queryData.offset, queryData.albumsToGet, 
		function(docs)
		{
			if (!docs || docs.length == 0)
			{
				var replyData = { albumCount: 0 };
				sendReply(socket, 'getAlbumsReply', replyData);

				return;
			}

			sendGetAlbumsReply();		

			function sendGetAlbumsReply()
			{
				var replyData = { albumCount: docs.length, albumData: docs };
				sendReply(socket, 'getAlbumsReply', replyData);
			}
		});
}

function onGetTracks(socket, queryData)
{
	database.getAlbumTracks(queryData.artist, queryData.album, 
		function(docs)
		{
			if (!docs || docs.length == 0)
			{
				sendError(socket, 'getTracksReply', 'No tracks found for album ' + queryData.artist + ' - ' + queryData.album + '.');
				return;
			}

			new tagParser(true, false).getTag(docs[0].path, 
				function(error, tag)
				{
					if (!tag)
					{
						sendError(socket, 'getTracksReply', 'Failed to get track information for ' + queryData.artist + ' - ' + queryData.album + '.');
						return;
					}

					if (tag.artwork)
						tag.artwork.buffer = bufferToBinary(tag.artwork.buffer);

					var replyData = { artist: queryData.artist, album: queryData.album, trackList: docs, artwork: tag.artwork };
					sendReply(socket, 'getTracksReply', replyData);
				});
		});
}

function onGetSongInfo(socket, queryData)
{
	database.getFileFromID(queryData.id, 
		function(filePath)
		{
			if (!filePath)
			{
				sendError(socket, 'getSongInfoReply', 'Failed to get song path from ID.');
				return;
			}

			new tagParser(true, false).getTag(filePath, 
				function(error, tag)
				{
					if (!tag)
					{
						sendError(socket, 'getSongInfoReply', 'Failed to get track information for ID: ' + queryData.id + '.');
						return;
					}

					if (tag.artwork)
						tag.artwork.buffer = bufferToBinary(tag.artwork.buffer);

					var replyData = { songInfo: tag };
					sendReply(socket, 'getSongInfoReply', replyData);
				});
		});
}

function onUpdateSongInfo(socket, queryData)
{
	updateSongInfo(queryData.id, queryData.tag, 
		function(error)
		{
			if (error)
			{
				sendError(socket, 'updateSongInfoReply', 'Failed to update song ID: ' + queryData.id + '.');
				return;
			}

			var replyData = { };
			sendReply(socket, 'updateSongInfoReply', replyData);
		});
}

function onGetFileListing(socket, queryData)
{
	fileSystem.getFolderContents(queryData.path, queryData.filter, queryData.showFiles, 
		function(error, path, fileList)
		{
			if (error)
			{
				sendError(socket, 'getFileListingReply', 'Failed to get file listing for ' + queryData.path);
				return;
			}

			var replyData = { path: path, fileList: fileList };
			sendReply(socket, 'getFileListingReply', replyData);
		});	
}

function onAddFiles(socket, queryData)
{	
	addFiles(queryData.itemList,
		function()
		{
			var replyData = { savedFiles: queryData.itemList.length };
			sendReply(socket, 'addFilesReply', replyData);
		});
}

function onAddFolders(socket, queryData)
{
	addFolders(queryData.itemList,
		function()
		{
			var replyData = { savedFolders: queryData.itemList.length };
			sendReply(socket, 'addFoldersReply', replyData);
		});
}

function onDeleteSong(socket, queryData)
{
	database.deleteTag(queryData.id,
		function()
		{
			var replyData = { };
			sendReply(socket, 'deleteSongReply', replyData);
		});
}

function onGetAlbumInfo(socket, queryData)
{
	database.getAlbumTracks(queryData.artist, queryData.album, 
		function(docs)
		{
			if (!docs || docs.length == 0)
			{
				sendError(socket, 'getAlbumInfoReply', 'No tracks found for album ' + queryData.artist + ' - ' + queryData.album + '.');
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

							var replyData = { commonTag: commonTag };
							sendReply(socket, 'getAlbumInfoReply', replyData);
						}
					});
			}
		});
}

function onUpdateAlbumInfo(socket, queryData)
{
	database.getAlbumTracks(queryData.artist, queryData.album, 
		function(docs)
		{
			if (!docs || docs.length == 0)
			{
				sendError(socket, 'updateAlbumInfoReply', 'No tracks found for album ' + queryData.artist + ' - ' + queryData.album + '.');
				return;
			}

			var songsDone = 0;

			function updateSongInfoDone(fileDone)
			{
				songsDone++;
				sendProgress(socket, songsDone, docs.length, 'Updating Album', fileDone)

				if (songsDone == docs.length)
				{
					var replyData = { };
					sendReply(socket, 'updateAlbumInfoReply', replyData);
				}
				else
				{
					updateSongInfo(docs[songsDone]._id, queryData.tag, updateSongInfoDone);
				}
			}

			updateSongInfo(docs[songsDone]._id, queryData.tag, updateSongInfoDone);
		});
}

function onDeleteAlbum(socket, queryData)
{
	database.deleteAlbum(queryData.artist, queryData.album,
		function()
		{
			var replyData = { };
			sendReply(socket, 'deleteAlbumReply', replyData);
		});
}

///////////////////////////////////////////////////////////////////////////////////////////////////

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
			function(fullFileList)
			{
				foldersDone++;
				fileList = fileList.concat(fullFileList);

				if (foldersDone == folderList.length)
					scanDone(fileList);
			});
	}

	function saveTagsDone(tagCount)
	{
	    console.log('Done saving ' + tagCount + ' ID3 tags to database.');
	    callback();
	}

	function extractTagProgress(current, total, status)
	{
		sendProgress(current, total, 'Add Folder', status);
	}

	function extractTagsDone(tagList)
	{
	    console.log("Done extracting ID3 tags.");
	    console.log("Saving tags to database...");

	    database.saveTags(tagList, saveTagsDone);
	}

	function scanDone(fileList)
	{
		if (!fileList)
		{
	        console.log('Error: No files found.');
	        return;
	    }
	    
	    console.log('Finished file listing.');
	    console.log('Found ' + fileList.length + ' files.');

	    console.log('Extracting ID3 tags...');
	    fileSystem.extractTags(fileList, extractTagProgress, extractTagsDone)
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
						    		callback(filePath);
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

_wsServer.on('connection', onWSConnection);
_wsServer.on('close', onWSClose);