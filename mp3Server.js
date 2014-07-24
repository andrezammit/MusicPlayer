var fs = require('fs');
var http = require('http');
var database = require('./database');

function processRequest(request, response)
{
	function getFileFromIDDone(filePath)
	{
		var stat = fs.statSync(filePath);

		if (!stat)
			return;

		fs.readFile(filePath, readFileDone);
	}

	function readFileDone(error, file)
	{
		var range = request.headers.range; 
		var parts = range.replace('bytes=', '').split('-'); 

		var partialStart = parts[0]; 
		var partialEnd = parts[1]; 

		var fileSize = file.length; 

		var start = parseInt(partialStart, 10); 
		var end = partialEnd ? parseInt(partialEnd, 10) : fileSize - 1;

		var header = {};

		header['Content-Range'] = 'bytes ' + start + '-' + end + '/' + fileSize;
		header['Accept-Ranges'] = 'bytes';
		header['Content-Length'] = (end - start) + 1;
		header['Transfer-Encoding'] = 'chunked';
		header['Connection'] = 'close';

		response.writeHead(206, header); 
		response.write(file.slice(start, end) + '0', 'binary');
		response.end();
	}

	var id = request.url.substr(1);
	console.log('Request for ID: ' + id);

	if (!request.headers.range)
		return;
		
	database.getFileFromID(id, getFileFromIDDone);
}

http.createServer(processRequest).listen(3002, '127.0.0.1');