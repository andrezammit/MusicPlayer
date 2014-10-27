var fs = require('fs');
var dbEngine = require('tingodb')();

var db;
var collection;

function cacheArtwork(tag, callback)
{
    if (!tag.artworkSmall)
    {
        callback(tag)
        return;
    }

    var artworkFile = tag.albumArtist + '_' + tag.album + '.jpg';
    artworkFile = encodeURI(artworkFile);

    var artworkPath = 'artwork\\' + artworkFile;
    
    fs.writeFile(artworkPath, tag.artworkSmall.buffer, { encoding: 'binary' },
        function(error)
        {
            callback(tag);
        });
}

function saveTag(tag, callback)
{
    var tmpArtist = tag.albumArtist || tag.artist;

    console.log('Saving: ' + tmpArtist + ' - ' + tag.song + ' - ' + tag.album + ' - ' + tag.track + ' - ' + tag.time + ' - ' + tag.year);

    var doc = { artist: tag.artist, albumArtist: tag.albumArtist, song: tag.song, album: tag.album, track: parseInt(tag.track), time: tag.time, year: parseInt(tag.year), path: tag.path };

    collection.insert(doc, { w: 1 }, 
        function(error, result) 
        {
            if (error)
                console.log(error);

            callback();
        });
}

function clearArtworkIfOnlyReference(id, callback)
{
    collection.find({ _id: id }, { albumArtist: 1, album: 1 }).toArray(
        function(error, docs)
        {
            if (!docs)
                return;

            if (docs.length == 0)
                return;

            var albumArtist = docs[0].albumArtist;
            var album = docs[0].album;

            var artworkPath = 'artwork\\' + albumArtist + '_' + album;

            collection.find({ albumArtist: albumArtist, album: album }).count(
                function(error, count)
                {
                    if (count <= 1)
                        fs.unlink(artworkPath);

                    callback();
                });
        });
}

function updateTag(id, tag, callback)
{
    clearArtworkIfOnlyReference(id, 
        function()
        {
            var tmpArtist = tag.albumArtist || tag.artist;

            cacheArtwork(tag, 
                function(tag)
                {
                    console.log('Updating: ' + tmpArtist + ' - ' + tag.song + ' - ' + tag.album + ' - ' + tag.track + ' - ' + tag.time + ' - ' + tag.year);

                    var doc = { artist: tag.artist, albumArtist: tag.albumArtist, song: tag.song, album: tag.album, track: parseInt(tag.track), time: tag.time, year: parseInt(tag.year), path: tag.path };

                    collection.update({ _id: parseInt(id) }, { $set: doc }, { w: 1 },
                        function(error, result) 
                        {
                            if (error)
                                console.log(error);

                            callback();
                        });
                });
        });
}

function deleteTag(id, callback)
{
    clearArtworkIfOnlyReference(id,
        function()
        {
            collection.remove({ _id: id }, { w: 1 },
                function(error, removed)
                {
                    callback();
                });
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

function openCollections()
{
    collection = db.collection('Settings'); 

    collection.ensureIndex({ _id: 1 }, { unique: true });
}

function setupDatabase(callback)
{
    db = new dbEngine.Db('', {});
    openCollections();

    db.close(
        function()
        {
            db = new dbEngine.Db('', {});
            openCollections();

            if (callback)
                callback();
        });
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
        var tmpTag = tagList[cnt];

        cacheArtwork(tmpTag,
            function(tmpTag)
            {
                saveTag(tmpTag,
                    function()
                    {
                        if (++tagsSaved == listSize)
                            callback(listSize);
                    });
            })
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
            if (!docs)
                return;

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

    collection.find({ }, { albumArtist: 1, album: 1 }).toArray(
        function(error, docs)
        {
            if (!docs)
            {
                callback(albums.length);
                return;
            }
            
            for (var cnt = 0; cnt < docs.length; cnt++)
            {
                if (isAlbumInArray(albums, docs[cnt]) > -1)
                    continue;

                albums.push(docs[cnt]);
            }

            callback(albums.length);
        });
}

function getAlbums(offset, albumsToGet, callback)
{
    var albums = [];

    collection.find({ }, { albumArtist: 1, album: 1, year: 1 }).sort({ albumArtist: 1, year: 1, album: 1 }).toArray(
        function(error, docs)
        {
            if (!docs)
            {
                callback();
                return;
            }

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

function deleteAlbum(artist, album, callback)
{
    collection.remove({ artist: artist, album: album }, { w: 1 },
        function(error, removed)
        {
            var artworkFile = artist + '_' + album + '.jpg';
            artworkFile = encodeURI(artworkFile);

            var artworkPath = 'artwork\\' + artworkFile;
            fs.unlink(artworkPath);

            callback();
        });
}

setupDatabase(setupDatabaseDone);

module.exports.getTags = getTags;
module.exports.saveTag = saveTag;
module.exports.saveTags = saveTags;
module.exports.deleteTag = deleteTag;
module.exports.updateTag = updateTag;
module.exports.getAlbums = getAlbums;
module.exports.getAllTags = getAllTags;
module.exports.deleteAlbum = deleteAlbum;
module.exports.getTagCount = getTagCount;
module.exports.getAlbumCount = getAlbumCount;
module.exports.getFileFromID = getFileFromID;
module.exports.getAlbumTracks = getAlbumTracks;
