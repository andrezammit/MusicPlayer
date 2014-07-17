var http = require('http');
var database = require('./database');

var getHTML = function(request, callback)
{
	database.getAllTags(
		function(docs)
		{
			var html = '<html>';
		
			html += '<head>';
			html += '<title>MusicPlayer</title>';
			html += '</head>';
			
			html += '<body>';

			var listSize = docs.length;
			for (var cnt = 0; cnt < listSize; cnt++)
			{
				var tag = docs[cnt];

				html += tag.artist + ' - ' + tag.track + ' - ' + tag.album;
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