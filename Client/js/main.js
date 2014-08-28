var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var songControl = MusicPlayer.songControl;

	var msgHandlers = {};

	var _currentTrackID = null;

	var _albumTracks = [];
	var _currentAlbumTracks = [];

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

		$("#fwButton").click(
			function()
			{
				songControl.playNextSong();
			});

		$("#bkButton").click(
			function()
			{
				songControl.playLastSong();
			});

		$("#seekBar").change( 
			function() 
			{ 
            	var audioElement = getAudioElement();
            	audioElement.currentTime = $(this).val(); 
        	});

		function onVolumeChange(value)
		{
	    	console.log('Volume: ' + value);

	    	var audioElement = getAudioElement();
	    	audioElement.volume = value / 100;
		}

 		$(".knob").knob(
 		{
 			release: onVolumeChange,
            change: onVolumeChange,
          
            draw: function () 
            {
				var img = document.getElementById("volumeKnobImg");

				this.g.save();

				this.g.translate(this.w / 2, this.h / 2);
		
				this.g.rotate(-125 * Math.PI / 180);
				this.g.rotate(this.cv * Math.PI / 72);

				this.g.drawImage(img, -img.width / 2, -img.height / 2);

				this.g.restore();

                this.cursorExt = 0.3;

                var a = this.arc(this.cv)  // Arc
                    , pa                   // Previous arc
                    , r = 1;

                this.g.lineWidth = this.lineWidth;

                this.g.beginPath();
                this.g.strokeStyle = r ? this.o.fgColor : this.fgColor ;
                this.g.arc(this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, a.s, a.e, a.d);
                this.g.stroke();

                return false;
            }
        });

	}

	function getAudioElement()
	{
		return $("#currentPlaying")[0];
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
			callback(data.replyData);
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
		header.css('margin-left', anchor.css('margin-left'));
		header.css('width', anchor.css('width'));

		var albumViewContainer = $("#albumViewContainer");
		albumViewContainer.css('margin-left', anchor.css('margin-left'));
		albumViewContainer.css('width', anchor.css('width'));

		if (callback)
			callback();
	}

	function showAlbumTracks(replyData)
	{
		var trackTemplate = $(".templates").find('.trackEntry')[0];

		if (!trackTemplate)
			return;

		var trackContainer = $('#tracks');
		var trackList = replyData.trackList;

		_albumTracks = [];
		trackContainer.empty();

		for (cnt = 0; cnt < trackList.length; cnt++)
		{
			(function(track)
			{
				if (!track)
					return;

				var newTrack = new TrackEntry(trackTemplate);
				newTrack.setInfo(track, replyData.artist, replyData.album);
			
				var newTrackElement = newTrack.getElement();

				_albumTracks.push([track._id, newTrackElement]);
				trackContainer.append(newTrackElement);

			}(trackList[cnt]));
		}

		var albumImag = $("#albumImageLarge");

		albumImag.attr('src', 'data:image/jpeg;base64,' + replyData.artwork);
		albumImag.attr('alt', replyData.artist + ' - ' + replyData.album);

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
				newAlbum.setInfo(album.albumArtist, album.album, album.artwork, album.year);

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

	function onAlbumHover(artist, album, year)
	{
		var headerTag = $("#albumName, #albumYear");
		
		headerTag.fadeOut(40,
			function()
			{
				var albumText = artist;

				if (album)
					albumText += ' - ' + album;

				$("#albumName").text(albumText);

				var yearText = '';

				if (year)
					yearText = year;

				$("#albumYear").text(yearText);

				headerTag.fadeIn();
			});
	}

	function onAlbumOut()
	{
		// If an album is open we don't want to change the header.

		if ($("#albumViewContainer").is(":visible"))
			return;

		onAlbumHover("MusicPlayer")
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
		for (var cnt = 0; cnt < _albumTracks.length; cnt++)
		{
			if (_albumTracks[cnt][0] == trackID)
			{
				callback(_albumTracks[cnt][1]);
				return;
			}
		}
	}

	function updateNowPlayingTrack()
	{
		for (var cnt = 0; cnt < _albumTracks.length; cnt++)
		{
			var trackID = _albumTracks[cnt][0];
			var trackElement = _albumTracks[cnt][1];

			var playImage = trackElement.find(".playButtonSmallImg");
			var audioElement = getAudioElement();

			if (audioElement.paused || trackID != _currentTrackID)
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

		updateControlBarInfo();
	}

	function updateControlBarInfo()
	{
		getTrackElement(_currentTrackID, 
			function(trackElement)
			{
				var song = trackElement.find(".song").html();
				var artist = trackElement.attr("artist");
				var album = trackElement.attr("album");

				var songInfo = song + '<br />' + artist + '<br />' + album;

				$("#songInfo").html(songInfo);
			});
	}

	function isTrackInCurrentAlbum(trackID)
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == trackID)
				return true;
		}

		return false;
	}

	function getNextTrackID()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] != _currentTrackID)
				continue;
			
			if (cnt + 1 == _currentAlbumTracks.length)
				break;

			return _currentAlbumTracks[cnt + 1][0]; 		
		}

		return -1;
	}

	function getLastTrackID()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] != _currentTrackID)
				continue;
			
			if (cnt == 0)
				break;

			return _currentAlbumTracks[cnt - 1][0]; 		
		}

		return -1;
	}

	function playSong(trackID)
	{
		if (trackID == _currentTrackID)
		{
			songControl.togglePlay();
			return;
		}

		if (!isTrackInCurrentAlbum(trackID))
			_currentAlbumTracks = _albumTracks;

		songControl.playSong(trackID);
	}

	function getTrackSeconds()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == _currentTrackID)
			{
				var trackElement = _currentAlbumTracks[cnt][1];
				var trackTime = trackElement.find(".time").html();

				var result = trackTime.split(':');
				var seconds = parseInt(result[0]) * 60 + parseInt(result[1]);

				return parseInt(seconds);
			}
		}

		return 0;
	}

	function getTrackTime()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == _currentTrackID)
			{
				var trackElement = _currentAlbumTracks[cnt][1];
				return trackElement.find(".time").html();
			}
		}

		return '';
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

		onAlbumHover: function(artist, album, year)
		{
			onAlbumHover(artist, album, year);
		},

		onAlbumOut: function()
		{
			onAlbumOut();
		},

		chooseAlbum: function(artist, album)
		{
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

		setupAudioElement: function()
		{
    		songControl.setupAudioElement();
		},

		setCurrentTrackID: function(trackID)
		{
			_currentTrackID = trackID;
		},

		getCurrentTrackID: function()
		{
			return _currentTrackID;
		},

		playSong: function(trackID)
		{
			playSong(trackID);
		},

		getAudioElement: function()
		{
			return getAudioElement();
		},

		getNextTrackID: function()
		{
			return getNextTrackID();
		},

		getLastTrackID: function()
		{
			return getLastTrackID();
		},

		getTrackTime: function()
		{
			return getTrackTime();
		},

		getTrackSeconds: function()
		{
			return getTrackSeconds();
		},
	};
}());