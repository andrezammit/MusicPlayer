var fileSystem = require('./fileSystem');
var database = require('./database');
var webServer = require('./webserver');
var webSocketServer = require('./webSocketServer');
var mp3Server = require('./mp3Server');
var tagWriter = require('./TagWriter');

var fs = require('fs');
var open = require('open');

(function initialize()
{
    fs.mkdir('artwork');
    open('http://localhost:3000/');
})();
