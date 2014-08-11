var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var songControl = MusicPlayer.songControl;

	var msgHandlers = {};

	var _audioElement = null;
	var _currentTrackID = null;
	var chosenAlbumTag = null;

	var albumTracks = [];

	(function()
	{
		$(window).resize(
			function()
			{
				resizeArtwork($("#albumImageLarge"));
				resizeAlbumContainer();
	   		});
	})();

	function onWebSockOpen()
	{
		console.log('Connected!');
		startGettingAlbums();
	}

	function onWebSockMessage(event)
	{
		var data = JSON.parse(event.data);
		var callback = msgHandlers[data.command];

		if (!callback)
		{
			alert('Invalid reply data.');
			return;
		}

		callback(data);
	}

	function setupHandlers()
	{
		$("#closeTracksLink").click(
			function()
			{
				musicPlayer.closeTracks();
			});

		$("#playButton").click(
			function()
			{
				songControl.togglePlay();
			});
	}

	function getAllAlbums(callback, progressCallback)
	{
		var _albumList = [];

		var _albumCount = 0;
		var _albumOffset = 0;
		var _albumProgress = 0;

		var _callback = callback;
		var _progressCallback = progressCallback;

		getAlbumCount();

		function getAlbumCount()
		{
			var query = { call: 'getAlbumCount' };
			connect.sendQuery(query);
		}

		msgHandlers['getAlbumCountReply'] = function(data)
		{
			_albumCount = data.albumCount;

			_progressCallback(_albumProgress, _albumCount);
			getAlbums();
		}

		function getAlbums()
		{
			var albumsRemaning = _albumCount - _albumOffset;
			var albumsToGet = Math.min(100, albumsRemaning);

			var query = { call: 'getAlbums', offset: _albumOffset, albumsToGet: albumsToGet };
			connect.sendQuery(query);
		}

		msgHandlers['getAlbumsReply'] = function(data)
		{
			_albumOffset += data.albumCount;
			
			_albumProgress += data.albumCount;
			_albumList = _albumList.concat(data.albumData);

			_progressCallback(_albumProgress, _albumCount);

			if (_albumOffset >= _albumCount)
			{
				_callback(_albumList);
				return;
			}

			getAlbums();
		}
	}

	function getAlbumTracks(artist, album, callback)
	{
		getTracks();

		function getTracks()
		{
			var query = { call: 'getTracks', albumArtist: artist, album: album };
			connect.sendQuery(query);
		}

		msgHandlers['getTracksReply'] = function(data)
		{
			callback(data.trackList);
		}
	}

	function resizeArtwork(artworkTag, callback)
	{
		if (!artworkTag)
			return;

		var parentTag = $(artworkTag).parent();
		var imageSide = Math.min(parentTag.width() - 20, parentTag.height() - 16);

		imageSide = Math.min(imageSide, 800);
		imageSide = Math.max(imageSide, 200);

		var maxWidth = imageSide; 					// Max width for the image
        var maxHeight = imageSide;					// Max height for the image
        
        var ratio = 0;  							// Used for aspect ratio
        
        var width = artworkTag.width();    			// Current image width
        var height = artworkTag.height(); 			// Current image height

		ratio = maxWidth / width;   				// get ratio for scaling image
		
		artworkTag.css('width', maxWidth); 			// Set new width
		artworkTag.css('height', height * ratio);  	// Scale height based on ratio

		ratio = maxHeight / height; 				// get ratio for scaling image

		artworkTag.css('height', maxHeight);   		// Set new height
		artworkTag.css('width', width * ratio);    	// Scale width based on ratio

		if (callback)
			callback();
	}

	function resizeAlbumContainer(callback)
	{
		var albumContainer = $("#albumsContainer");
		var albumTemplate = $(".templates").find(".albumEntry");
		var albumContainerParent = albumContainer.parent();		

		var albumsToFit = Math.floor(albumContainerParent.width() / albumTemplate.width());

		var containerWidth = albumsToFit * albumTemplate.width();
		albumContainer.css('width', containerWidth);

		alignHeaderText(albumContainer, callback)
	}

	function alignHeaderText(anchor, callback)
	{
		var header = $("#header");
		header.css('padding-left', anchor.css('margin-left'));

		if (callback)
			callback();
	}

	function showAlbumTracks(trackList)
	{
		var trackTemplate = $(".templates").find('.trackEntry')[0];

		if (!trackTemplate)
			return;

		var trackContainer = $('#tracks');
		
		albumTracks = [];
		trackContainer.empty();

		for (cnt = 0; cnt < trackList.length; cnt++)
		{
			(function(track)
			{
				if (!track)
					return;

				var newTrack = new TrackEntry(trackTemplate);
				newTrack.setInfo(track._id, track.track, track.song, track.time);
			
				var newTrackElement = newTrack.getElement();

				if (cnt == trackList.length - 1)
				{
					// Add 8px to the bottom so that the div aligns exactly with the artwork padding.
					newTrackElement.css('padding-bottom', '8px');
				}

				albumTracks.push([track._id, newTrackElement]);
				trackContainer.append(newTrackElement);

			}(trackList[cnt]));
		}

		var albumImage = $(chosenAlbumTag).find('img');

		html = '<img src="' + albumImage.attr('src') + '" id="albumImageLarge" />';
		$("#artwork").html(html);

		$.when($("#albumViewContainer").show(),
			$("#albumView").slideToggle(400)).done(
			function()
			{
				updateNowPlayingTrack();

				$("body").css('overflow', 'hidden');
				$("#albums").css('webkitFilter', 'blur(20px)')

				resizeArtwork($("#albumImageLarge"), 
					function()
					{
						$("#albumImageLarge").fadeIn();
					});
			});
	}

	function updateProgress(progress, tagCount)
	{
		var html = progress + ' out of ' + tagCount + ' received.';
		$("#progress").html(html); 
	}

	function startGettingAlbums()
	{
		$("#loadingScreen").show();

		getAllAlbums(displayAlbums, updateProgress);
	}

	function displayAlbums(albumList)
	{
		var albumTemplate = $(".templates").find('.albumEntry')[0];

		var albumContainer = $('#albums');
		albumContainer.empty();

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			(function(album)
			{
				if (!album)
					return;

				var newAlbum = new AlbumEntry(albumTemplate);
				newAlbum.setInfo(album.albumArtist, album.album, album.artwork);

				var newAlbumElement = newAlbum.getElement();
				albumContainer.append(newAlbumElement);

			}(albumList[cnt]));
		} 

		resizeAlbumContainer(
			function()
			{
				$("#loadingScreen").fadeOut();
			});
	}

	function onAlbumHover(artist, album)
	{
		var headerTag = $("#albumName");
		
		headerTag.fadeOut(40,
			function()
			{
				headerTag.text(artist + ' - ' + album);
				headerTag.fadeIn();
			});
	}

	function onAlbumOut()
	{
		// If an album is open we don't want to change the header.

		if ($("#albumViewContainer").is(":visible"))
			return;

		var headerTag = $("#albumName");
		
		headerTag.fadeOut(40,
			function()
			{
				headerTag.text('MusicPlayer');
				headerTag.fadeIn();
			});
	}

	function closeTracks()
	{
		$("body").css('overflow', 'auto');
		$("#albums").css('webkitFilter', 'blur(0px)');

		$("#albumView").slideToggle(400, 
			function()
			{
				$("#albumViewContainer").toggle();
			});
	}

	function getTrackElement(trackID, callback)
	{
		for (var cnt = 0; cnt < albumTracks.length; cnt++)
		{
			if (albumTracks[cnt][0] == trackID)
			{
				callback(albumTracks[cnt][1]);
				return;
			}
		}
	}

	function updateNowPlayingTrack()
	{
		for (var cnt = 0; cnt < albumTracks.length; cnt++)
		{
			var trackID = albumTracks[cnt][0];
			var trackElement = albumTracks[cnt][1];

			var playImage = trackElement.find(".playButtonImage");

			if (_audioElement.paused || trackID != _currentTrackID)
			{
				trackElement.css('background', 'rgba(255, 255, 255, 0)');

				playImage.attr('src', 'images/play.png');
				playImage.attr('alt', 'Play');
			}
			else
			{
				trackElement.css('background', 'rgba(255, 255, 255, 0.2)');

				playImage.attr('src', 'images/pause.png');
				playImage.attr('alt', 'Pause');
			}
		}
	}

	function playSong(trackID)
	{
		if (trackID == _currentTrackID)
		{
			songControl.togglePlay();
			return;
		}

		songControl.playSong(trackID);
	}

	return {
		connectWebSocket: function() 
		{
			connect.createWebSocket(onWebSockOpen, onWebSockMessage);
		},

		setupHandlers: function()
		{
			setupHandlers();
		},

		onAlbumHover: function(artist, album)
		{
			onAlbumHover(artist, album);
		},

		onAlbumOut: function()
		{
			onAlbumOut();
		},

		chooseAlbum: function(artist, album, tag)
		{
			chosenAlbumTag = tag;
			getAlbumTracks(artist, album, showAlbumTracks);
		},

		closeTracks: function()
		{
			closeTracks();
		},

		updateNowPlayingTrack: function()
		{
			updateNowPlayingTrack();
		},

		setAudioElement: function()
		{
    		_audioElement = $("#currentPlaying")[0];
    		songControl.setAudioElement(_audioElement);
		},

		setCurrentTrackID: function(trackID)
		{
			_currentTrackID = trackID;
		},

		playSong: function(trackID)
		{
			playSong(trackID);
		},
	};
}());