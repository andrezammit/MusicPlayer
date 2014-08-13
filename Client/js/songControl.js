var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.songControl = (function()
{
	var _nextTrackElement = null;
	var _nextSongPreloaded = false;

	function updateControlButtons()
	{
		var playButton = $('#playButton');
		var audioElement = musicPlayer.getAudioElement();
		
		if (audioElement.paused)
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

		var trackTime = musicPlayer.getTrackTime();

		var totalTime = $("#totalTime");
		totalTime.html(trackTime);
	}

	function onPause()
	{
		updateControlButtons();
		musicPlayer.updateNowPlayingTrack();
	}

	function getFormattedTime(totalSeconds)
	{
		var minutes = Math.floor(totalSeconds / 60);

		var minsInSecs = minutes * 60;
		var seconds = Math.floor(totalSeconds) - minsInSecs;

		return minutes + ':' + seconds;
	}

	function onTimeUpdate()
	{
		var audioElement = musicPlayer.getAudioElement();

		var progSeconds = Math.ceil(audioElement.currentTime);
		var progPercent = Math.ceil(audioElement.currentTime / audioElement.duration * 100);

		if (progPercent > 75 && !_nextSongPreloaded)
		{
			_nextSongPreloaded = true;
			preLoadNextTrack();
		}

		var formattedTime = getFormattedTime(audioElement.currentTime);

		var currentTime = $("#currentTime");
		currentTime.html(formattedTime);
	}

	function onTrackEnded()
	{
		_nextSongPreloaded = false;

		if (!_nextTrackElement)
			return;

		var audioElement = $("#currentPlaying");
		
		audioElement.replaceWith(_nextTrackElement);
		audioElement = _nextTrackElement;

		_nextTrackElement = null;

		playSong();
	}

	function preLoadNextTrack()
	{
		var nextTrackID = musicPlayer.getNextTrackID();

		// If the track ID is -1 then it's the end of the album.
		if (nextTrackID == -1)
			return;

		createTempAudioElement(nextTrackID);	
	}

	function createTempAudioElement(nextTrackID)
	{
		var audioElement = musicPlayer.getAudioElement();

		_nextTrackElement = $(audioElement).clone();

		_nextTrackElement.attr('trackID', nextTrackID);

		_nextTrackElement.attr('autoplay', false);
		_nextTrackElement.attr('preload', 'auto');
		_nextTrackElement.attr('src', 'http://' + window.location.hostname + ':3002/' + nextTrackID + '.mp3');

		bindAudioElementEvents(_nextTrackElement);
	}

	function bindAudioElementEvents(audioElement)
	{
		if (!audioElement)
			audioElement = $(musicPlayer.getAudioElement());

		audioElement.bind('timeupdate', onTimeUpdate);
		audioElement.bind('ended', onTrackEnded);

		audioElement.bind('pause', onPause);
		audioElement.bind('play', onPlay);
	}

	function playSong(trackID)
	{
		var audioElement = musicPlayer.getAudioElement();

		if (trackID)
		{
			$(audioElement).attr('trackID', trackID);

			audioElement.src = 'http://' + window.location.hostname + ':3002/' + trackID + '.mp3';			
			audioElement.load();
		}
		else
		{
			trackID = parseInt($(audioElement).attr('trackID'));
		}

		musicPlayer.setCurrentTrackID(trackID);

		audioElement.play();
	}

	return {
		togglePlay: function()
		{
			var audioElement = musicPlayer.getAudioElement();

			if (audioElement.paused)
			{
				audioElement.play();
			}
			else
			{
				audioElement.pause();
			}
		},

		playSong: function(trackID)
		{
			playSong(trackID);
		},

		setupAudioElement: function(callback)
		{
			var audioElement = musicPlayer.getAudioElement();
    		audioElement.volume = 0.1;

    		bindAudioElementEvents();

			if (callback)
				callback();
		},
	};
}());