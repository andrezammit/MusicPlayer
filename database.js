var dbEngine = require('tingodb')();

var db;
var collection;

function saveTag(tag, callback)
{
    var tmpArtist = tag.albumArtist || tag.artist;

    console.log('Saving: ' + tmpArtist + ' - ' + tag.track + ' - ' + tag.album);

    var doc = { artist: tag.artist, albumArtist: tag.albumArtist, track: tag.track, album: tag.album, path: tag.path };

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
	//clearDatabase(clearDatabaseDone);
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
					callback(listSize);
			});
	}
}

function getTagCount(callback)
{
    collection.count(
        function(error, count)
        {
            callback(count);
        });
}

function getAllTags(callback)
{
	var didCallback = false;

    collection.find().toArray(
        function(error, docs) 
        {
    		if (!didCallback)
    		{
                callback(docs);
    			didCallback = true;
            }
        });
}

function getTags(offset, tagsToGet, callback)
{
    collection.find().skip(offset).limit(tagsToGet).toArray(
        function(error, docs) 
        {
            callback(docs);
        });
}

function getFileFromID(id, callback)
{
    collection.find({ _id: id }).toArray(
        function(error, docs)
        {
            callback(docs[0].path);
        });
}

function getAllAlbums(callback)
{
    var albums = [];

    function isAlbumInArray(album)
    {
        for (cnt = 0; cnt < albums.length; cnt++)
        {
            var tmpAlbum = albums[cnt];

            if (album.albumArtist != tmpAlbum.albumArtist)
                return false;

            if (album.album != tmpAlbum.album)
                return false;
            
            return true;
        }        
    }

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(doc[cnt]))
                    continue;

                albums.push(docs);
            }
        });
}

setupDatabase(setupDatabaseDone);

module.exports.getTags = getTags;
module.exports.saveTags = saveTags;
module.exports.getAllTags = getAllTags;
module.exports.getTagCount = getTagCount;
module.exports.getFileFromID = getFileFromID;
