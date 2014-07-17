var player = require('player');

var playTrack = function(fullPath)
{
   var mp3Player = new player(fullPath);

    mp3Player.play(
        function(error, player)
        {
            console.log('playend!');
        });
}