var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var qs = require('querystring');

extensions = 
{
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "application/javascript",
    ".png" : "image/png",
    ".gif" : "image/gif",
    ".jpg" : "image/jpeg",
    ".mp3" : "audio/mpeg"
};

function getFileNotFoundResponse(requestPath)
{
	return '<html>File not found.<br /> File: ' + requestPath;
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

	var fullPath = '../Client' + requestPath;

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
    			console.log(mimeType);

    			response.writeHead(200, {'Content-Type' : mimeType, 'Content-Length' : data.length });
    			response.write(data);  
    			response.end();		
    		});
}

http.createServer(processRequest).listen(3000, '0.0.0.0');