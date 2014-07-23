var ws = require('ws').Server;
var database = require('./database');

var wsServer = new ws({ port: 8080 });

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
						
						updateProgress(docs.length);
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
		}
	}

	function updateProgress(step)
	{
		var notif = { command: 'updateProgress', step: step};
		sendData(notif);
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
