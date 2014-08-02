var dbEngine = require('tingodb')();

var db;
var collection;

function saveTag(tag, callback)
{
    var tmpArtist = tag.albumArtist || tag.artist;

    console.log('Saving: ' + tmpArtist + ' - ' + tag.song + ' - ' + tag.album + ' - ' + tag.track + ' - ' + tag.time + ' - ' + tag.year);

    var doc = { artist: tag.artist, albumArtist: tag.albumArtist, song: tag.song, album: tag.album, track: parseInt(tag.track), time: tag.time, year: parseInt(tag.year), path: tag.path };

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

function isAlbumInArray(albumList, album, callback)
{
    for (var cnt = 0; cnt < albumList.length; cnt++)
    {
        var tmpAlbum = albumList[cnt];

        if (album.albumArtist != tmpAlbum.albumArtist)
            continue;

        if (album.album == tmpAlbum.album)
            return cnt;
    }

    return -1;        
}

function getAlbumCount(callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]) > -1)
                    continue;

                albums.push(docs[cnt]);
            }

            callback(albums.length);
        });
}

function getAllAlbums(callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1 } ).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]) > -1)
                    continue;

                albums.push(doc[cnt]);
            }
        });
}

function getAlbums(offset, albumsToGet, callback)
{
    var albums = [];

    collection.find( { }, { albumArtist: 1, album: 1, year: 1 } ).sort({ year: 1 }).toArray(
        function(error, docs)
        {
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                var index = isAlbumInArray(albums, docs[cnt]);

                if (index > -1)
                {
                    // Check if the currently entry has a later year.
                    if (albums[index].year < docs[cnt].year)
                    {
                        // Remove the previous entry so that we can add the new one.
                        albums.splice(index, 1);

                        // Add the item again at the back of the array so it will remain sorted.
                    }
                    else
                    {
                        continue;
                    }
                }

                albums.push(docs[cnt]);
            }

            callback(albums.slice(offset, offset + albumsToGet))
        });
}

function getAlbumTracks(albumArtist, album, callback)
{
    collection.find({ albumArtist: albumArtist, album: album }).sort({ track: 1 }).toArray(
        function(error, docs)
        {
            callback(docs);
        });
}

setupDatabase(setupDatabaseDone);

module.exports.getTags = getTags;
module.exports.saveTags = saveTags;
module.exports.getAlbums = getAlbums;
module.exports.getAllTags = getAllTags;
module.exports.getTagCount = getTagCount;
module.exports.getAlbumCount = getAlbumCount;
module.exports.getFileFromID = getFileFromID;
module.exports.getAlbumTracks = getAlbumTracks;
