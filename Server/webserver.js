var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var qs = require('querystring');
var connect = require('connect');
var compression = require('compression');

var fileSystem = require('./fileSystem');

var app = connect();
app.use(compression());

extensions = 
{
    ".html" : "text/html",
    ".css" : "text/css",
    ".js" : "application/javascript",
    ".png" : "image/png",
    ".gif" : "image/gif",
    ".jpg" : "image/jpeg",
    ".mp3" : "audio/mpeg",
    ".woff" : "application/font-woff",
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

	var fullPath = 'Client' + requestPath;

	fs.readFile(fullPath, 
		function (error, data) 
		{
			if (error)
			{
				callback(getFileNotFoundResponse(requestPath), "text/html");
				return;
			}

			callback(data, mimeType);
		});
}

function processArtworkRequest(request, callback)
{
	var album = getDataFromURL(request.url);
	var artworkFile = fileSystem.getArtworkFolder() + album + '.jpg';

	fs.readFile(artworkFile, 
		function (error, data) 
		{
			if (error)
			{
				returnDefaultArtwork(callback);
				return;
			}

			callback(data, 'image/jpeg');
		});
}

function processOtherRequest(request, callback)
{
	var url_parts = url.parse(request.url, true);
	var requestPath = url_parts.pathname;

	switch(requestPath)
	{
	case '/getArtwork':
		processArtworkRequest(request, callback);
		return;
	}

	callback('Invalid request.', 'text/html');
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

	if (extension)
	{
		processFileRequest(request, callback);
		return;
	}

	processOtherRequest(request, callback);
}

app.use(
	function(request, response)
	{
    	console.log(request.url);

    	getHTML(request,
    		function (data, mimeType)
    		{
    			response.writeHead(200, { 'Content-Type': mimeType });
    			response.write(data);  
    			response.end();		
    		});
	});

function returnDefaultArtwork(callback)
{
	var artworkPath = 'Client/images/defaultArtwork.png';

	fs.readFile(artworkPath, 
		function (error, data) 
		{
			if (error)
			{
				callback(getFileNotFoundResponse(artworkPath), "text/html");
				return;
			}

			callback(data, 'image/png');
		});
}

function getDataFromURL(url)
{
	var pos = url.search('\\?');

	if (pos == -1)
		return null;

	return url.substr(pos + 1)
}

http.createServer(app).listen(3000, '0.0.0.0');