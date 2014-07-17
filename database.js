var dbEngine = require('tingodb')();

var db;
var collection;

function saveTag(tag, callback)
{
    console.log('Saving: ' + tag.artist + " - " + tag.track + ' - ' + tag.album);

    var doc = { artist: tag.artist, track: tag.track, album: tag.album, path: tag.fullPath };

    collection.insert(doc, {w:1}, 
        function(error, result) 
        {
            if (error)
                console.log(error);

            callback();
        });
}

function setupDatabaseDone()
{
    console.log('Finished setting up database.');
	clearDatabase(clearDatabaseDone);
}

function clearDatabaseDone()
{
    console.log('Finished clearing database.');
}

function setupDatabase(callback)
{
    db = new dbEngine.Db('', {});
    collection = db.collection('Settings'); 

    if (callback)
        callback();
}

function clearDatabase(callback)
{
    collection.remove();

    if (callback)
        callback();
}

function saveTags(tagList, callback)
{
	var tagsSaved = 0;

	var listSize = tagList.length;
	for (var cnt = 0; cnt < listSize; cnt++)
	{
		saveTag(tagList[cnt], 
			function()
			{
				if (++tagsSaved == listSize)
					callback();
			});
	}
}

function getAllTags(callback)
{
    collection.find().toArray(
        function(error, docs) 
        {
            callback(docs)
        });
}

setupDatabase(setupDatabaseDone);

module.exports.saveTags = saveTags;
module.exports.getAllTags = getAllTags;
