var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var songControl = MusicPlayer.songControl;
	var dialogs = MusicPlayer.dialogs;
	var menus = MusicPlayer.menus;

	var msgHandlers = {};

	var _currentTrackID = null;

	var _albumTracks = [];
	var _currentAlbumTracks = [];
	var _expandedAlbumEntries = [];

	var _currentVolume = 1;

	(function()
	{
		$(window).resize(
			function()
			{
				resizeDialogs();
				resizeArtwork($("#albumImageLarge"));
				resizeAlbumContainer();
	   		});
	})();

	function onWebSockOpen()
	{
		console.log('Connected!');
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
		dialogs.initDialogs();

		$(".menus").mouseup(
			function (event)
			{
		    	var container = $(".menus");

			    if (container.is(event.target))
			    {
			    	var menu = $(".menuOpen");
			     	
			     	menu.trigger('menuClosed');
			     	menu.hide();

			        container.hide();
			    }
			});
	

/*		window.onscroll = function(event) 
		{
			console.log(window.scrollY);
    	};*/

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

	    	_currentVolume = audioElement.volume;
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

	function resizeDialogs()
	{
		var height = $("#dialogContainer").height();
		$(".modalContent").css('max-height', height - 175);
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
			var albumsToGet = Math.min(20, albumsRemaning);

			var query = { call: 'getAlbums', offset: _albumOffset, albumsToGet: albumsToGet };
			connect.sendQuery(query);
		}

		msgHandlers['getAlbumsReply'] = function(data)
		{
			_albumOffset += data.albumCount;
			
			_albumProgress += data.albumCount;
			_albumList = _albumList.concat(data.albumData);

			_progressCallback(_albumProgress, _albumCount);
			_callback(data.albumData);

			if (_albumOffset >= _albumCount)
				return;

			getAlbums();
		}
	}

	function getAlbumTracks(event, callback)
	{
		if (!event)
			callback();

		var albumEntry = $(event.currentTarget);

		var album = albumEntry.data('album');
		var artist = artist = albumEntry.data('artist')

		getTracks();

		function getTracks()
		{
			var query = { call: 'getTracks', albumArtist: artist, album: album };
			connect.sendQuery(query);
		}

		msgHandlers['getTracksReply'] = function(data)
		{
			callback(event, data.replyData);
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

		$("#tracks").css('height', maxHeight);

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
		var albumName = $("#albumName");
		var albumViewContainer = $("#albumViewContainer");

		var width = parseInt(anchor.css('width')) - parseInt(header.css('padding-left'));

		header.css('margin-left', anchor.css('margin-left'));
		header.css('width', width);
		
		albumName.css('max-width', width - 100);

		albumViewContainer.css('margin-left', anchor.css('margin-left'));
		albumViewContainer.css('width', width);

		if (callback)
			callback();
	}

	function showAlbumTracks(event, replyData)
	{
		if (!event || !replyData)
			return;

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

				_albumTracks.push([track._id, newTrackElement, track]);
				trackContainer.append(newTrackElement);

			}(trackList[cnt]));
		}

		var albumImage = $("#albumImageLarge");

		if (replyData.artwork)
		{
			var blobURL = getBlobURLFromData(replyData.artwork);
			albumImage.attr('src', blobURL);
		}

		albumImage.attr('alt', replyData.artist + ' - ' + replyData.album);

		clearAnyExpandedAlbums();

		onAlbumHover(event, false);

		$.when($("#albumViewContainer").show(),
			$("#albumView").slideToggle(500)).done(
			function()
			{
				updateNowPlayingTrack();

				$("#albums").css('webkitFilter', 'blur(20px)');
				$("body").css('overflow', 'hidden');

				resizeArtwork($("#albumImageLarge"), 
					function()
					{
						$("#albumImageLarge").show();
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

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			(function(album)
			{
				if (!album)
					return;

				if (album.artwork)
					album.blobURL = getBlobURLFromData(album.artwork);

				var newAlbum = new AlbumEntry(albumTemplate);
				newAlbum.setInfo(album.albumArtist, album.album, album.blobURL, album.year);

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

	function resizeTextToFit(element, callback)
	{
		element.textfill(
			{
				maxFontPixels: 50,
				explicitWidth: parseInt($("#albumName").css('max-width')),
				explicitHeight: 60,
				complete: 
					function()
					{
						if (callback)
							callback();
					}
			});
	}

	function expandAlbumEntry(event)
	{
		if (!event)
			return;

		var albumEntry = $(event.currentTarget);
		var albumEntryHover = albumEntry.clone();

		albumEntryHover.attr('class', 'albumEntryHover');
		albumEntryHover.data('albumEntry', albumEntry);

		var divPosition = albumEntry.offset();
		albumEntryHover.offset(divPosition);

		var albumImageSmall = albumEntryHover.find(".albumImageSmall");
		
		(function()
		{
			albumEntryHover.mouseout(
				function(event)
				{
					onAlbumOut(event);
				});

			albumEntryHover.click(
				function(event)
				{
					var index = _expandedAlbumEntries.indexOf(albumEntryHover);
					
					var albumEntry = _expandedAlbumEntries[index].data('albumEntry');
					albumEntry.click();
				});
		})();

		_expandedAlbumEntries.push(albumEntryHover);
		$("body").append(albumEntryHover);

		albumEntryHover.data('originalPos', divPosition);

		albumEntryHover.css('left', divPosition.left);
		albumEntryHover.css('top', divPosition.top);

		albumEntryHover.show();

		var right = divPosition.left + 200 + 5;
		var bottom = divPosition.top + 200 + 5;

		albumEntryHover.css('box-shadow', '0px 0px 20px #000');

		albumEntryHover.css('left', divPosition.left - 5);
		albumEntryHover.css('top', divPosition.top - 5);

		albumEntryHover.css('width', 210);
		albumEntryHover.css('height', 210);
	}

	function clearAnyExpandedAlbums()
	{
		for (var cnt = 0; cnt < _expandedAlbumEntries.length; cnt++)
		{
			var albumEntryHover = _expandedAlbumEntries[cnt];
			deflateAlbumEntry(albumEntryHover);
		}
	}

	function removeAlbumEntryHover(albumEntryHover)
	{
		function findAlbumEntryHover(albumEntryHover)
		{
			for (var cnt = 0; cnt < _expandedAlbumEntries.length; cnt++)
			{
				if (_expandedAlbumEntries[cnt] == albumEntryHover)
					return cnt;
			}

			return -1;
		}

		var index = findAlbumEntryHover(albumEntryHover);

		if (index == -1)
			return;

		_expandedAlbumEntries.splice(index, 1);

		albumEntryHover.remove();
	}

	function deflateAlbumEntry(albumEntryHover)
	{		
		if (albumEntryHover.attr('class') != "albumEntryHover")
			return;

		(function()
		{
			albumEntryHover.one('transitionend', 
				function()
				{
					removeAlbumEntryHover(albumEntryHover);
				});
		})();

		// Check if the element got a chance to expand more than the original size.
		// If the element is still 200x200, it won't have any transition to carry out
		// and the transitionend event will never fire.

		if (albumEntryHover.width() == 200)
		{
			removeAlbumEntryHover(albumEntryHover);
			return;
		}

		var originalPos = albumEntryHover.data('originalPos');

		albumEntryHover.css('left', originalPos.left);
		albumEntryHover.css('top', originalPos.top);

		albumEntryHover.css('width', 200);
		albumEntryHover.css('height', 200);

		albumEntryHover.css('box-shadow', '0px 0px 0px #000');
	}

	function onAlbumHover(event, expandAlbum)
	{
		if ($("#albumViewContainer").is(":visible"))
			return;

		if (!event)
			expandAlbum = false;

		clearAnyExpandedAlbums();

		if (expandAlbum === true)
			expandAlbumEntry(event);
	
		updateHeaderInfo(event);
	}

	function updateHeaderInfo(event)
	{
		var headerTag = $("#albumName, #albumYear");

		var album;
		var artist;
		var year;

		if (event)
		{
			var albumEntry = $(event.currentTarget);

			album = albumEntry.data('album');
			artist = albumEntry.data('artist');
			year = albumEntry.data('year');
		}
		else
		{
			artist = "MusicPlayer";
		}

		headerTag.fadeOut(100,
			function()
			{
				var albumText = artist;

				if (album)
					albumText += ' - ' + album;

				$("#albumName span").text(albumText);

				var yearText = '';

				if (year)
					yearText = year;

				$("#albumYear span").text(yearText);

				resizeTextToFit($("#albumName"),
					function()
					{
						headerTag.fadeIn(300);
					});
			});
	}

	function onAlbumOut(event)
	{
		// If an album is open we don't want to change the header.

		if ($("#albumViewContainer").is(":visible"))
			return;

		if (event)
		{
			var fromElement = $(event.currentTarget);
			deflateAlbumEntry(fromElement);
		}

		onAlbumHover(null, false);
	}

	function closeTracks()
	{
		$("#albumImageLarge").hide();

		$("#albums").css('webkitFilter', 'blur(0px)');
		$("body").css('overflow', 'auto');

		$("#albumView").slideToggle(300, 
			function()
			{
				$("#albumViewContainer").toggle();
			});
	}

	function getTrackObject(trackID, callback)
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == trackID)
			{
				callback(_currentAlbumTracks[cnt]);
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
			var gradientElement = trackElement.find(".trackGradient");

			var audioElement = getAudioElement();

			if (audioElement.paused || trackID != _currentTrackID)
			{
				gradientElement.css('opacity', '0');

				playImage.attr('src', 'images/play.png');
				playImage.attr('alt', 'Play');
			}
			else
			{
				gradientElement.css('opacity', '1');

				playImage.attr('src', 'images/pause.png');
				playImage.attr('alt', 'Pause');
			}
		}

		updateControlBarInfo();
	}

	function updateControlBarInfo()
	{
		getTrackObject(_currentTrackID, 
			function(trackObject)
			{
				var trackInfo = trackObject[2];

				var song = trackInfo.song;
				var artist = trackInfo.albumArtist;
				var album = trackInfo.album;

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

		songControl.fadeOutSong(trackID);
	}

	function getTrackSeconds()
	{
		for (var cnt = 0; cnt < _currentAlbumTracks.length; cnt++)
		{
			if (_currentAlbumTracks[cnt][0] == _currentTrackID)
			{
				var trackInfo = _currentAlbumTracks[cnt][2];
				var trackTime = trackInfo.time;

				var result = trackTime.split(':');
				var seconds = parseInt(result[0]) * 60 + parseInt(result[1]);

				return parseInt(seconds);
			}
		}

		return 0;
	}

	function clearControlBar()
	{
		$("#songInfo").html('');
		$("#currentTime").html('');
	}

	function getBufferFromDataURL(dataURL) 
	{
		function stringToBuffer(sourceStr) 
		{
			var buffer = new ArrayBuffer(sourceStr.length);
			var arrayBuffer = new Uint8Array(buffer);

			for (var cnt = 0; cnt < arrayBuffer.length; cnt++) 
				arrayBuffer[cnt] = sourceStr.charCodeAt(cnt);

			return arrayBuffer;
		}

		var mimeStart = dataURL.indexOf(':')+1;
		var mimeEnd = dataURL.indexOf(';');

		var mimeType = dataURL.substr(mimeStart, mimeEnd - mimeStart);
		mimeType.trim();

		var dataStart = dataURL.indexOf(';') + 1;
		var data = dataURL.substr(dataStart);

		return {
			mimeType: mimeType,
			buffer: stringToBuffer(data)
		}
	}

	function getBlobURLFromData(data)
	{
		var dataURL = 'data:image/jpeg;' + data;
		var artworkBuffer = getBufferFromDataURL(dataURL);

		var arrayBuffer = artworkBuffer.buffer;
		var artworkBlob = new Blob([arrayBuffer], { type: artworkBuffer.mimeType });

		return URL.createObjectURL(artworkBlob);
	}

	function editSong(id)
	{
		var query = { call: 'getSongInfo', id: id };
		connect.sendQuery(query);

		msgHandlers['getSongInfoReply'] = function(data)
		{
			dialogs.editSong(data.songInfo,
				function(tag)
				{
					query = { call: 'updateSongInfo', id: id, tag: tag };
					connect.sendQuery(query);
				});
		}

		msgHandlers['updateSongInfoReply'] = function(data)
		{
			alert('updateSongInfoReply returned with error: ' + data.error);
		}
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

		startGettingAlbums: function()
		{
			startGettingAlbums();
		},

		onAlbumHover: function(event)
		{
			onAlbumHover(event, true);
		},

		onAlbumOut: function(event)
		{
			onAlbumOut(event);
		},

		chooseAlbum: function(event)
		{
			getAlbumTracks(event, showAlbumTracks);
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

		getCurrentVolume: function()
		{
			return _currentVolume;
		},

		clearControlBar: function()
		{
			return clearControlBar();
		},

		editSong: function(id)
		{
			editSong(id);
		},

		getBlobURLFromData: function(data)
		{
			return getBlobURLFromData(data);
		},

		resizeDialogs: function()
		{
			return resizeDialogs();
		},
	};
}());