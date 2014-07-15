var fs = require('fs');
var http = require('http');

var helpers = require('./helpers');

var getHTML = function(request, callback)
{
	helpers.getMp3Files(
		function(docs)
		{
			var html = '<html>';
		
		html += '<head>';
		html += '<title>MusicPlayer</title>';
		html += '</head>';
		
		html += '<body>';

		var i = 0;
		var mp3File;

		while (mp3File = docs[i++])
		{
			html += mp3File.artist + ' - ' + mp3File.album;
			html += '<br />';
		}

		html += '</body>';

		html += '</html>'

		callback(html);
	});
}

var processRequest = function(request, response)
{
    	console.log(request.url);

    	getHTML(request,
    		function (html)
    		{
    			response.writeHead(200, {'Content-Type': 'text/html'});
    			response.write(html + '');  
    			response.end();		
    		});

		//fs.readFile('./index.html', function (err, html) {
}

http.createServer(processRequest).listen(3000, '127.0.0.1');