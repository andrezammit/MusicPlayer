var fs = require('fs');
var mm = require('musicmetadata');
var player = require('player');
var dbEngine = require('tingodb')();
var format = require('util').format
var path = require('path');
var async = require('async');

var db;
var collection;

var processFile = function(dir, fileList, fileIndex, results, callback)
{
    var fileEntry = fileList[fileIndex++];

    if (!fileEntry)
    {
        callback(null, results);
        return;
    }

    var fullPath = dir + '\\' + fileEntry;
    var fileStat = fs.statSync(fullPath);

    if (fileStat === null)
        return;

    if (fileStat.isDirectory())
    {
        walk(fullPath, 
            function(error, tmpResults)
            {
                results = results.concat(tmpResults);
                processFile(dir, fileList, fileIndex, results, callback);
            });
    }
    else
    {
        var fileExt = path.extname(fullPath);

        if (fileExt === '.mp3')
            results.push(fullPath);
        
        processFile(dir, fileList, fileIndex, results, callback);
    }
}

var walkCallback = function(error, results) 
{
    if (error)
        console.log(error);

    console.log('Finished file listing.');

    if (results)
    {
        console.log('Found ' + results.length + ' files.');
        console.log('Adding to database...');
    }

    var resultIndex = 0;
    var resultSize = results.length;

    while (filePath = results[resultIndex++])
    {
        getID3Tag(filePath, 
            function()
            {
                if (--resultSize !== 0)
                    return;

                console.log("Done extracting ID3 tags and saving to DB.");
            });
    }
};

var walk = function(dir, callback)
{
    var results = [];

    fs.readdir(dir, 
        function(error, fileList)
        {
            if (error)
            {
                callback(error)
                return;
            }

            var fileIndex = 0;
            processFile(dir, fileList, fileIndex, results, callback);
        });
};

var saveFileToDB = function(artist, track, album, fullPath, callback)
{
    console.log(artist + " - " + track + ' - ' + album);

    var doc = {artist: artist.toString(), album: album.toString(), path: fullPath};
    collection.insert(doc, {w:1}, 
        function(error, result) 
        {
            if (error)
                console.log(error);

            callback();
        });
}

var playTrack = function(fullPath)
{
   var mp3Player = new player(fullPath);

    mp3Player.play(
        function(error, player)
        {
            console.log('playend!');
        });

    return;
}

var getID3Tag = function(fullPath, results, resultIndex, callback)
{
    var fileExt = path.extname(fullPath);

    if (fileExt !== '.mp3')
        return;

    console.log(fullPath);

    var readStream = fs.createReadStream(fullPath);
    var parser = new mm(readStream);

    parser.on('metadata',
        function (result) 
        {
            var artist = result["albumartist"];
            var album = result["album"];
            var track = result["title"];

            if (artist.toString() === '')
                artist = result["artist"];

            saveFileToDB(artist, track, album, fullPath, callback);
        });
    
    parser.on('done', function (error) 
    {
        readStream.destroy();

        if (error)
            console.log(error);
    });
}

var setupDatabaseCallback = function()
{
    console.log('Finished setting up database.');
}

var clearDatabaseCallback = function()
{
    console.log('Finished clearing database.');
}

var setupDatabase = function(callback)
{
    db = new dbEngine.Db('', {});
    collection = db.collection('Settings'); 

    if (callback)
        callback();
}

var clearDatabase = function(callback)
{
    collection.remove();

    if (callback)
        callback();
}

var getMp3Files = function(callback)
{
    collection.find().toArray(
        function(error, docs) 
        {
            callback(docs)
        });
}

setupDatabase(setupDatabaseCallback);
clearDatabase(clearDatabaseCallback);

walk('H:\\Music\\Music', walkCallback);

module.exports.getMp3Files = getMp3Files;