var fs = require('fs');
var mm = require('musicmetadata');
var player = require('player');
var dbEngine = require('tingodb')();
var format = require('util').format
var path = require('path');
var async = require('async');

// var walk = function(callback, dir)
// {
//     fs.readdir(dir, 
//         function(error, fileList)
//         {
//             if (fileList == null)
//                 return;

//             var fileIndex = 0;
//             while (fileEntry = fileList[fileIndex++])
//             {
//                 var fullPath = dir + '\\' + fileEntry;
//                 var fileStat = fs.statSync(fullPath);
         
//                 if (fileStat === null)
//                     return;

//                 console.log(fullPath);

//                 if (fileStat.isDirectory())
//                 {
//                     walk(null, fullPath);
//                 }
//                 else
//                 {
//                     var tmpFullPath = fullPath;
//                     var tmpFileEntry = fileEntry;

//                     var pathFolders = tmpFullPath.split(path.sep);
//                     var tmpAlbumName = pathFolders[pathFolders.length - 2];

//                     var readStream = fs.createReadStream(fullPath);
//                     var parser = mm(readStream);

//                     parser.on('metadata',
//                         function (result) 
//                         {
//                             var artist = result["albumartist"];
//                             var album = result["album"];

//                             if (artist.toString() === '')
//                                 artist = result["artist"];

//                             if (album.toString() === '')
//                                 album = tmpAlbumName;

//                             if (artist.toString() === '' || album.toString() === '')
//                             {
//                                 console.log(fullPath);
//                                 console.log(result);
//                             }
//                             else
//                             {
//                                 console.log(artist + " - " + album);

//                                 var doc = {artist: artist.toString(), album: album.toString(), path: fullPath};
//                                 collection.insert(doc, {w:1}, 
//                                     function(err, result) 
//                                     {
//                                         if (err)
//                                             console.log(err);
//                                     });
//                             }
//                         });
                    
//                     parser.on('done', function (err) 
//                     {
//                         readStream.destroy();

//                         if (err)
//                             console.log(err);
//                     });

//                     break;
//                 }
//             }

//             if (callback)
//                 callback(null);
//         });
// };

var saveFileToDB = function(artist, track, album, fullPath)
{
    console.log(artist + " - " + track + ' - ' + album);

    var doc = {artist: artist.toString(), album: album.toString(), path: fullPath};
    collection.insert(doc, {w:1}, 
        function(err, result) 
        {
            if (err)
                console.log(err);
        });
}

var getID3Tag = function(fullPath)
{
    var fileExt = path.extname(fullPath);

    if (fileExt !== '.mp3')
        return;

    var readStream = fs.createReadStream(fullPath);
    var parser = mm(readStream);

    parser.on('metadata',
        function (result) 
        {
            var artist = result["albumartist"];
            var album = result["album"];
            var track = result["track"];

            if (artist.toString() === '')
                artist = result["artist"];

            saveFileToDB(artist, track, album, fullPath);
        });
    
    parser.on('done', function (err) 
    {
        readStream.destroy();

        if (err)
            console.log(err);
    });
}

var processFile = function(dir, fileList, fileIndex, callback)
{
    var fileEntry = fileList[fileIndex++];

    if (!fileEntry)
    {
        callback();
        return;
    }

    var fullPath = dir + '\\' + fileEntry;
    var fileStat = fs.statSync(fullPath);

    if (fileStat === null)
        return;

    if (fileStat.isDirectory())
    {
        walk(fullPath, 
            function()
            {
                processFile(dir, fileList, fileIndex, callback);
            });
    }
    else
    {
        getID3Tag(fullPath);
        processFile(dir, fileList, fileIndex, callback);
    }
}

var walk = function(dir, callback)
{
    fs.readdir(dir, 
        function(error, fileList)
        {
            if (error)
            {
                callback(error)
                return;
            }

            var fileIndex = 0;
            processFile(dir, fileList, fileIndex, callback);
        });
};

                   // var mp3Player = new player(fullPath);

                   //  // play now and callback when playend
                   //  mp3Player.play(
                   //      function(err, player)
                   //      {
                   //          console.log('playend!');
                   //      });

                   //  return;

var done = function(err, results) 
{
    console.log('-------------------------------------------------------------');
    console.log('finished.');
    console.log('-------------------------------------------------------------');
};

var db;
var collection;

var setupDatabase = function(callback)
{
    db = new dbEngine.Db('', {});
    collection = db.collection('Settings'); 

    callback(null);
}

var clearDatabase = function(callback)
{
    collection.remove();

            // collection.findOne({hello:'world_safe2'}, 
            //     function(err, item) 
            //     {
            //         console.log(item);
            //     });

    // collection.dist('album', 
    //     function(err, docs) 
    //     {
    //     });
    
    callback(null);
}

var getMp3Files = function(callback)
{
    collection.find().toArray(
        function(err, docs) 
        {
            callback(docs)
        });
}

walk('H:\\Music\\Music', done);

setupDatabase(done);

// async.series([
//     function(callback)
//     {
//         setupDatabase(callback);
//     },
//     function(callback)
//     {
//         clearDatabase(callback);
//     },
//     function(callback)
//     {
//         walk(callback, 'H:\\Music\\Music');
//     }], 
//     done);

module.exports.getMp3Files = getMp3Files;