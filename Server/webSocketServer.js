var ws = require('ws').Server;
var database = require('./database');

var wsServer = new ws({ port: 3001 });

function onWSConnection(webSock)
{
	console.log('New web socket connection.');

	webSock.on('message', processRequest);

	function processRequest(message)
	{
		var query = JSON.parse(message);

		switch (query.call)
		{
		case 'getTags':
			{
				database.getTags(query.offset, query.tagsToGet, 
					function(docs)
					{
						if (!docs)
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

						var reply = { command: 'getAlbumsReply', albumCount: docs.length, albumData: docs };
						sendData(reply);
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

						var reply = { command: 'getTracksReply', trackCount: docs.length, trackList: docs };
						sendData(reply);
					});
			}
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

wsServer.on('connection', onWSConnection);
wsServer.on('close', onWSClose);
