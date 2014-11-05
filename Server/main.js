var fileSystem = require('./fileSystem');
var database = require('./database');
var webServer = require('./webserver');
var webSocketServer = require('./webSocketServer');
var mp3Server = require('./mp3Server');
var tagWriter = require('./TagWriter');

var fs = require('fs');
var open = require('open');

function createDir(path)
{
     fs.mkdir(path,
        function(error)
        {
            if (!error)
                return;

            // Check if directory already exists.
            if (error.errno == 47)
                return;

            console.log(error);
        });
}

(function initialize()
{
    var artworkDir = fileSystem.getArtworkFolder();
    var databaseDir = fileSystem.getDatabaseFolder();

    console.log('Artwork:' + artworkDir);
    console.log('Database' + databaseDir);

    createDir(artworkDir);
    createDir(databaseDir);

    open('http://localhost:3000/');
})();
