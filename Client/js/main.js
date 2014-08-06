var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var msgHandlers = {};

	var chosenAlbumTag = null;
	
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

	function resizeArtwork(artworkTag)
	{
		if (!artworkTag)
			return;

		var parentTag = $(artworkTag).parent();
		var parentWidth = parentTag.width() - 20;

		parentWidth = Math.min(parentWidth, 800);
		parentWidth = Math.max(parentWidth, 200);

		var maxWidth = parentWidth; 				// Max width for the image
        var maxHeight = parentTag.height();			// Max height for the image
        
        var ratio = 0;  							// Used for aspect ratio
        
        var width = artworkTag.width();    			// Current image width
        var height = artworkTag.height();  			// Current image height

		ratio = maxWidth / width;   				// get ratio for scaling image
		
		artworkTag.css('width', maxWidth); 			// Set new width
		artworkTag.css('height', height * ratio);  	// Scale height based on ratio

		ratio = maxHeight / height; 				// get ratio for scaling image

		artworkTag.css('height', maxHeight);   		// Set new height
		artworkTag.css('width', width * ratio);    	// Scale width based on ratio
	}

	function resizeAlbumContainer(callback)
	{
		var albumContainer = $("#albumsContainer");
		var albumTemplate = $(".templates").find("#albumEntry");
		var albumContainerParent = albumContainer.parent();		

		var albumsToFit = Math.floor(albumContainerParent.width() / albumTemplate.width());

		var containerWidth = albumsToFit * albumTemplate.width();
		albumContainer.css('width', containerWidth);

		if (callback)
			callback();
	}

	function showAlbumTracks(trackList)
	{
		var trackContainer = $('#tracks');
		trackContainer.empty();

		for (cnt = 0; cnt < trackList.length; cnt++)
		{
			(function(track)
			{
				if (!track)
					return;

				var newTrack = $(".templates").find('#trackEntry').clone();

				newTrack.find("#track").html(track.track);
				newTrack.find("#song").html(track.song);
				newTrack.find("#time").html(track.time);

				var playLink = newTrack.find("#playButtonSmall");

				(function(trackID)
				{
					playLink.click(
						function()
						{
							songControl.playSong(trackID);
						});

				})(track._id);

				trackContainer.append(newTrack);

			}(trackList[cnt]));
		}

		var albumImage = $(chosenAlbumTag).find('img');

		html = '<img src="' + albumImage.attr('src') + '" id="albumImageLarge" />';
		$("#artwork").html(html);

		$("#albums").css('webkitFilter', 'blur(20px)');

		$("#albumViewContainer").show();
		$("#albumView").slideToggle(400, 
			function()
			{
				resizeArtwork($("#albumImageLarge"));
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
		var albumContainer = $('#albums');
		albumContainer.empty();

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			(function(album)
			{
				if (!album)
					return;

				var newAlbum = $(".templates").find('#albumEntry').clone();

				var albumLink = newAlbum.find("#albumLink");
				
				(function(album)
				{
					albumLink.click(
						function()
						{
							musicPlayer.chooseAlbum(album.albumArtist, album.album, albumLink[0]);
						});

					albumLink.hover(
						function()
						{
							musicPlayer.onAlbumHover(album.albumArtist, album.album);
						},
						function()
						{
							musicPlayer.onAlbumOut();
						});

				})(album);

				var albumArtwork = newAlbum.find("#albumImageSmall");

				albumArtwork.attr('src', 'data:image/png;base64,' + album.artwork);
				albumArtwork.attr('alt', album.albumArtist + ' - ' + album.album);

				albumContainer.append(newAlbum);

			}(albumList[cnt]));
		} 

		resizeAlbumContainer(
			function()
			{
				$("#loadingScreen").fadeOut();
			});
	}

	function onAlbumOut()
	{
		var headerTag = $("#albumName");
		
		headerTag.fadeOut(40,
			function()
			{
				headerTag.text('MusicPlayer');
				headerTag.fadeIn();
			});
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
			var headerTag = $("#albumName");
		
			headerTag.fadeOut(40,
				function()
				{
					headerTag.text(artist + ' - ' + album);
					headerTag.fadeIn();
				});
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
			$("#albums").css('webkitFilter', 'blur(0px)');

			$("#albumView").slideToggle(400, 
				function()
				{
					$("#albumViewContainer").toggle();
				});
		},
	};
}());