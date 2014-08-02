var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.songControl = (function()
{
	var songLoaded = false;
	var audioTag = null;

	function updateControlButtons()
	{
		var playButton = $('#playButton');
		
		if (audioTag.paused)
		{
			playButton.text('Play');
		}
		else
		{
			playButton.text('Pause');
		}
	};

	function onPlay()
	{
		updateControlButtons();
	}

	function onPause()
	{
		updateControlButtons();
	}

	return {
		togglePlay: function()
		{
			if (audioTag.paused)
			{
				audioTag.play();
			}
			else
			{
				audioTag.pause();
			}
		},

		playSong: function(id)
		{
			audioTag.src = 'http://' + window.location.hostname + ':3002/' + id + '.mp3';
			audioTag.load();
			
		  	audioTag.addEventListener('canplay', 
				function()
				{
					songLoaded = true;
					audioTag.play();
				});

		 	audioTag.addEventListener('pause', onPause);
			audioTag.addEventListener('play', onPlay);
		},

		setAudioTag: function()
		{
    		audioTag = $("#currentPlaying")[0];
		},
	};
}());