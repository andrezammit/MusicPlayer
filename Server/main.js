var fileSystem = require('./fileSystem');
var database = require('./database');
var webServer = require('./webserver');
var webSocketServer = require('./webSocketServer');
var mp3Server = require('./mp3Server');

function saveTagsDone(tagCount)
{
    console.log('Done saving ' + tagCount + ' ID3 tags to database.');
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

//fileSystem.scan('H:\\Music\\Music', scanDone);
//fileSystem.scan('H:\\Music\\Music\\Foo Fighters', scanDone);

// new tagParser(true).getTag('H:\\Music\\Music\\Foo Fighters\\In Your Honor [Disc 1]\\1-01 In Your Honor.mp3', getTagDone);

// function getTagDone(error, tag)
// {
//     console.log(tag);
// }

