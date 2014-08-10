var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.songControl = (function()
{
	var _songLoaded = false;
	var _audioElement = null;

	function updateControlButtons()
	{
		var playButton = $('#playButton');
		
		if (_audioElement.paused)
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
		musicPlayer.updateNowPlayingTrack();
	}

	function onPause()
	{
		updateControlButtons();
		musicPlayer.updateNowPlayingTrack();
	}

	return {
		togglePlay: function()
		{
			if (_audioElement.paused)
			{
				_audioElement.play();
			}
			else
			{
				_audioElement.pause();
			}
		},

		playSong: function(trackID)
		{
			musicPlayer.setCurrentTrackID(trackID);

			_audioElement.src = 'http://' + window.location.hostname + ':3002/' + trackID + '.mp3';
			_audioElement.load();
			
		  	_audioElement.addEventListener('canplay', 
				function()
				{
					songLoaded = true;
					_audioElement.play();
				});

		 	_audioElement.addEventListener('pause', onPause);
			_audioElement.addEventListener('play', onPlay);
		},

		setAudioElement: function(audioElement)
		{
    		_audioElement = audioElement;
		},
	};
}());