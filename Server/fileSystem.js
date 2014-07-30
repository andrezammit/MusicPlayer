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
    var fileStat = fs.statSync(fullPath);

    if (fileStat === null)
        return;

    if (fileStat.isDirectory())
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
    var listSize = fileList.length;

    var tagList = [];
    var thisBunch = 0;

    function getTagDone(tag)
    {
        tagList.push(tag);
        console.log(tag);

        if (++filesDone == listSize)
        {
            callback(tagList);
            return;
        }

        if (filesDone % bunchOfTags == 0)
            setTimeout(getSomeTags, 0, filesDone);
    };

    function getSomeTags(startIndex)
    {
        var remainingFiles = listSize - startIndex;
        thisBunch = startIndex + Math.min(remainingFiles, bunchOfTags);

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

    new tagParser().getTag(fullPath, 
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

module.exports.scan = scan;
module.exports.extractTags = extractTags;
