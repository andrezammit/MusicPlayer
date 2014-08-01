var webSock = null;

function createWebSocket(callback, onMessageCallback)
{
    webSock = new WebSocket('ws://localhost:3001/');

	webSock.onopen = callback;
	webSock.onmessage = onMessageCallback;
}

function sendQuery(query)
{
	webSock.send(JSON.stringify(query));
}