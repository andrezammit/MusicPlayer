var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.connect = (function()
{
	var _webSock = null;

	var _onOpenCallback = null;
	var _onMessageCallback = null;

	function isSocketConnected()
	{
		if (!_webSock)
			return false;

		if (_webSock.readyState == 1)
			return true;

		return false;
	}

	function isSocketClosed()
	{
		if (!_webSock)
			return true;

		if (_webSock.readyState == 2 ||
			_webSock.readyState == 3)
			return true;

		return false;
	}

	function waitForSocketConnection(callback)
	{
		var retries = 0;

	    setTimeout(
	        function () 
	        {
	            if (isSocketConnected()) 
	            {
	            	retries = 0;

	                if (callback)
	                    callback();

	                return;
	            } 
	            else 
	            {
	            	if (retries == 50) // Wait for 5 seconds
	            	{
	            		console.log("Connection failed");
	            		return;
	            	}

	                console.log("Waiting for connection...");

	                retries++;
	                waitForSocketConnection(callback);
	            }
	        }, 100);
	}

	function createWebSocket(callback, onMessageCallback)
	{
		_onOpenCallback = callback;
		_onMessageCallback = onMessageCallback;

		_webSock = new WebSocket('ws://' + window.location.hostname + ':3001/');

		_webSock.onopen = _onOpenCallback;
		_webSock.onmessage = _onMessageCallback;
	}

	function sendQuery(query)
	{
		console.log('Sending query: ' +  query.command);
		_webSock.send(JSON.stringify(query));
	}

	return {
		createWebSocket: function(callback, onMessageCallback) 
		{
			createWebSocket(callback, onMessageCallback);
		},

		sendQuery: function(command, queryData)
		{
			var query = { command: command, data: queryData };

			if (!isSocketConnected())
			{
				if (isSocketClosed())
					createWebSocket(_onOpenCallback, _onMessageCallback);
				
				waitForSocketConnection(
					function()
					{
						sendQuery(query);
					});

				return;
			}

			sendQuery(query);
		},

	};
}());