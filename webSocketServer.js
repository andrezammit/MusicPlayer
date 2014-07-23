var ws = require('ws').Server;
var database = require('./database');

var wsServer = new ws({ port: 8080 });

function onWSConnection(ws)
{
	console.log('New web socket connection.');

	ws.on('message', processRequest);

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
							var reply = { replyTo: query.call, error: getNoTagsResponse() };
							sendReply(reply);

							return;
						}

						var reply = { replyTo: query.call, tagCount: docs.length, tagData: docs };
						sendReply(reply);
					});
			}
			break;

		case 'getTagCount':
			{
				database.getTagCount(
					function(count)
					{
						var reply = { replyTo: query.call, tagCount: count };
						sendReply(reply);
					});
			}
			break;
		}
	}

	function sendReply(reply)
	{
		ws.send(JSON.stringify(reply));
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
