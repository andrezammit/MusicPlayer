var webSock = null;

function createWebSocket(onMessageCallback)
{
    webSock = new WebSocket('ws://localhost:3001/');

	webSock.onopen = onWebSockOpen;
	webSock.onmessage = onMessageCallback;
}

function onWebSockOpen()
{
	console.log('Connected!');
}

function sendQuery(query)
{
	webSock.send(JSON.stringify(query));
}