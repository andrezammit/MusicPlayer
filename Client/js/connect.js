var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.connect = (function()
{
	var webSock = null;

	return {
		createWebSocket: function(callback, onMessageCallback) 
		{
			webSock = new WebSocket('ws://' + window.location.hostname + ':3001/');

			webSock.onopen = callback;
			webSock.onmessage = onMessageCallback;
		},

		sendQuery: function(query)
		{
			webSock.send(JSON.stringify(query));
		},
	};
}());