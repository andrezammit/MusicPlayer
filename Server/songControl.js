var songLoaded = false;
var audioTag = null;

function playSong(id)
{
	audioTag.src = 'http://localhost:3002/' + id + '.mp3';
	
  audioTag.addEventListener('canplay', 
		function()
		{
			songLoaded = true;
			audioTag.play();
		});

  audioTag.addEventListener('pause', onPause);
	audioTag.addEventListener('play', onPlay);
}

function onPlay()
{
  updateControlButtons();
}

function onPause()
{
  updateControlButtons();
}

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

  updateStopButton();
}

function togglePlay()
{
	if (audioTag.paused)
	{
		audioTag.play();
	}
	else
	{
		audioTag.pause();
	}
}
