var fs = require('fs');
var path = require('path');
var format = require('util').format

var tagParser = require('./TagParser');

var bunchOfTags = 300;

function processFile(dir, fileList, fileIndex, results, callback)
{
    var fileEntry = fileList[fileIndex++];

    if (!fileEntry)
    {
        callback(null, results);
        return;
    }

    var fullPath = dir + '\\' + fileEntry;

    fs.stat(fullPath,
        function(error, stats)
        {
            if (!stats)
                return;

            if (stats.isDirectory())
            {
                scan(fullPath, 
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
        });
}

function scan(dir, callback)
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

function extractTags(fileList, callback) 
{
    var filesDone = 0;
    var filesStarted = 0;

    var listSize = fileList.length;

    var tagList = [];
    var thisBunch = 0;

    function getTagDone(tag)
    {
        tagList.push(tag);

        if (++filesDone == listSize)
        {
            callback(tagList);
            return;
        }

        setTimeout(getTag, 0, fileList[filesStarted++], getTagDone);
    };

    function getSomeTags(startIndex)
    {
        var remainingFiles = listSize - startIndex;
        thisBunch = startIndex + Math.min(remainingFiles, bunchOfTags);

        filesStarted = thisBunch;

        for (var cnt = startIndex; cnt < thisBunch; cnt++)
            setTimeout(getTag, 0, fileList[cnt], getTagDone);
    }

    getSomeTags(0);
};

function getTag(fullPath, callback)
{
    var fileExt = path.extname(fullPath);

    if (fileExt !== '.mp3')
        return;

    new tagParser(false, true, true, true).getTag(fullPath, 
        function(error, tag)
        {
            if (error)
            {
                console.log(error);
                return;
            }

            callback(tag);
        });
}

function getDriveLetters(callback)
{
    var fileEntries = [];
    var drives = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];

    for (var cnt = 0; cnt < drives.length; cnt++)
    {
        var drive = drives[cnt];
        drive += ':\\';

        var stats = null;

        try
        {
            stats = fs.statSync(drive);
        }
        catch (ex)
        {
        }

        if (stats)
        {
            var fileEntry = { name: drive, fullPath: drive, folder: true };
            fileEntries.push(fileEntry);
        }
    }

    callback(fileEntries);
}

function getFolderContents(folder, filter, showFiles, callback)
{
    if (folder == '')
    {
        getDriveLetters(
            function(fileEntries)
            {
                callback(null, fileEntries);
            });

        return;
    }

    fs.readdir(folder,
        function(error, fileList)
        {
            if (error)
            {
                callback(error, null);
                return;
            }

            var fileEntries = [];

            for (var cnt = 0; cnt < fileList.length; cnt++)
            {
                var fullPath = folder;

                if (fullPath.charAt(fullPath.length - 1) != '\\')
                    fullPath += '\\';

                fullPath += fileList[cnt];

                var stats = null;

                try
                {
                    stats = fs.statSync(fullPath);
                }
                catch (ex)
                {
                    continue;
                }

                if (!stats.isDirectory() && !showFiles)
                    continue;
                
                if (!stats.isDirectory() && filter)
                {
                    var fileExt = path.extname(fullPath);

                    if (filter.indexOf(fileExt) == -1)
                    continue;
                }

                var fileEntry = { name: fileList[cnt], fullPath: fullPath, folder: stats.isDirectory() };
                fileEntries.push(fileEntry);
            }

            callback(null, fileEntries);
        });
}

module.exports.scan = scan;
module.exports.extractTags = extractTags;
module.exports.getFolderContents = getFolderContents;
