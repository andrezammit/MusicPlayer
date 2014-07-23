var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var qs = require('querystring');
var database = require('./database');

extensions = 
{
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "application/javascript",
    ".png" : "image/png",
    ".gif" : "image/gif",
    ".jpg" : "image/jpeg"
};

function getFileNotFoundResponse(requestPath)
{
	return '<html>File not found.<br />' + requestPath;
}

function getAJAXFailedResponse(requestPath)
{
	return '<html>AJAX request failed.<br />' + requestPath;
}

function getNoTagsResponse(requestPath)
{
	return '<html>No mp3 files.<br />' + requestPath;
}

function getRequestData(request, callback)
{
	if (request.method == 'POST') 
	{
		var bodyData = '';

	    request.on('data', 
	    	function (data) 
	    	{
				bodyData += data;

				// Too much POST data, kill the connection!
				if (bodyData.length > 1e6)
					request.connection.destroy();
			});
	
		request.on('end', 
			function () 
			{
				var postData = qs.parse(bodyData);
				callback(postData)
			});
	}
	else
	{
		callback(null);
	}
}

function processAJAXRequest(request, data, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	switch (requestPath)
	{
	case '/getTags':
		{
			var offset = data['offset'];
			var tagsToGet = data['tagsToGet'];

			database.getTags(offset, tagsToGet, 
				function(docs)
				{
					if (!docs)
					{
						callback(getNoTagsResponse(requestPath), 'text/html');
						return;
					}

					var replyData = { tagCount: docs.length, tagData: docs };

					var json = JSON.stringify(replyData);
					callback(json, 'application/json');
				});
		}
		break;

	case '/getTagCount':
		{
			database.getTagCount(
				function(count)
				{
					var replyData = { tagCount: count };

					var json = JSON.stringify(replyData);
					callback(json, 'application/json');
				});
		}
		break;
	}
}

function processFileRequest(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	var extension = path.extname(requestPath);
	var mimeType = extensions[extension];

	if (!mimeType)
	{
		callback(getFileNotFoundResponse(requestPath), 'text/html');
		return;
	}

	var fullPath = '.' + requestPath;

	if (!fs.existsSync(fullPath))
	{
		callback(getFileNotFoundResponse(requestPath), "text/html");
		return;
	}

	fs.readFile(fullPath, 
		function (err, data) 
		{
			callback(data, mimeType);
		});
}

function getHTML(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	if (requestPath == '/')
	{
		request.url = '/index.html';
		requestPath = '/index.html';
	}

	var extension = path.extname(requestPath);

	if (!extension)
	{
		getRequestData(request, 
			function(data)
			{
				processAJAXRequest(request, data, callback);
			});

		return;
	}

	processFileRequest(request, callback);
}

function processRequest(request, response)
{
    	console.log(request.url);

    	getHTML(request,
    		function (data, mimeType)
    		{
    			console.log(data);
    			console.log(data.length);

    			response.writeHead(200, {'Content-Type' : mimeType, 'Content-Length' : data.length });
    			response.write(data);  
    			response.end();		
    		});

		//fs.readFile('./index.html', function (err, html) {
}

http.createServer(processRequest).listen(3000, '127.0.0.1');