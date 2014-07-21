var fileSystem = require('./fileSystem');
var database = require('./database');
var webServer = require('./webserver');

var tagParser = require('./tagParser');

function saveTagsDone()
{
    console.log("Done saving ID3 tags to database.");
}

function extractTagsDone(tagList)
{
    console.log("Done extracting ID3 tags.");
    console.log("Saving tags to database...");

    database.saveTags(tagList, saveTagsDone);
}

function scanDone(error, fileList)
{
	if (error)
	{
        console.log('Error: ' + error);
        return;
    }

	if (!fileList)
	{
        console.log('Error: No files found.');
        return;
    }
    
    console.log('Finished file listing.');
    console.log('Found ' + fileList.length + ' files.');

    console.log('Extracting ID3 tags...');
    fileSystem.extractTags(fileList, extractTagsDone)
}

// tagParser.getTag('H:\\Music\\Music\\COOP3RDRUMM3R\\Drum Covers\\Jay Z, Kanye West, Big Sean - Clique.mp3',
// 	function(error, tag)
// 	{
// 		console.log('Tag: ' + tag.artist);
// 	});


// tagParser.getTag('H:\\Music\\Music\\AC_DC\\Iron Man 2\\01 Shoot To Thrill.mp3',
//     function(error, tag)
//     {
//         console.log(tag);
//     });

fileSystem.scan('H:\\Music\\Music\\Aerosmith', scanDone);