var fs = require('fs');
var path = require('path');
var format = require('util').format

var tagParser = require('./TagParser');

var bunchOfTags = 300;

function scan(dir, callback)
{
    getFileList(dir, 
        function(fullFileList)
        {
            callback(fullFileList)
        });
};

function getFileList(dir, callback)
{
    var filesDone = 0;
    var fullFileList = [];

    function readyCheck(fileList)
    {
        filesDone++;
        
        if (filesDone == fileList.length)
            callback(fullFileList);        
    }

    function addFile(fileList, index)
    {
        var fileName = fileList[index];
        var fullPath = dir + '\\' + fileName;

        fs.stat(fullPath,
            function(error, stats)
            {
                if (!stats)
                    return;

                if (stats.isDirectory())
                {
                    getFileList(fullPath, 
                        function(tmpResults)
                        {
                            fullFileList = fullFileList.concat(tmpResults);
                            readyCheck(fileList);
                        });
                }
                else
                {
                    var fileExt = path.extname(fullPath);

                    if (fileExt === '.mp3')
                        fullFileList.push(fullPath);

                    readyCheck(fileList);
                }
            });
    }

    fs.readdir(dir, 
        function(error, fileList)
        {
            for (var cnt = 0; cnt < fileList.length; cnt++)
                addFile(fileList, cnt);
        });
}

function extractTags(fileList, progressCallback, callback) 
{
    var filesDone = 0;
    var filesStarted = 0;

    var listSize = fileList.length;

    var tagList = [];
    var thisBunch = 0;

    function getTagDone(tag)
    {
        filesDone++;

        tagList.push(tag);

        if (progressCallback)
            progressCallback(filesDone, fileList.length, tag.path);

        if (filesDone == listSize)
        {
            callback(tagList);
            return;
        }

        setTimeout(getTag, 100, fileList[filesStarted++], getTagDone);
    };

    function getSomeTags(startIndex)
    {
        var remainingFiles = listSize - startIndex;
        thisBunch = startIndex + Math.min(remainingFiles, bunchOfTags);

        filesStarted = thisBunch;

        for (var cnt = startIndex; cnt < thisBunch; cnt++)
            setTimeout(getTag, 100, fileList[cnt], getTagDone);
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
                callback(null, folder, fileEntries);
            });

        return;
    }

    fs.readdir(folder,
        function(error, fileList)
        {
            if (error)
            {
                if (path != '')
                {
                    getFolderContents('', filter, showFiles, callback);
                }
                else
                {
                    callback(error);
                }

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

            callback(null, folder, fileEntries);
        });
}

module.exports.scan = scan;
module.exports.extractTags = extractTags;
module.exports.getFileList = getFileList;
module.exports.getFolderContents = getFolderContents;
