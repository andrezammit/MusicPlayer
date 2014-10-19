var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var songControl = MusicPlayer.songControl;
	var dialogs = MusicPlayer.dialogs;
	var menus = MusicPlayer.menus;

	var msgHandlers = {};

	var _currentTrackID = -1;

	var _albumTracks = [];
	var _currentAlbumTracks = [];
	var _expandedAlbumEntries = [];

	var _albumViewOpen = false;
	var _currentVolume = 1;

	(function()
	{
		$(window).resize(
			function()
			{
				resizeDialogs();
				resizeAlbumContainer();
				resizeTextToFit($("#albumName"));
				resizeArtwork($("#albumImageLarge"));

				clearAnyExpandedAlbums();
	   		});
	})();

	function onWebSockOpen()
	{
		console.log('Connected!');
	}

	function onWebSockMessage(event)
	{
		var reply = JSON.parse(event.data);

		if (reply.error)
		{
			alert(reply.error);
			return;
		}

		var callback = msgHandlers[reply.command];

		if (!callback)
		{
			alert('Invalid reply data.');
			return;
		}

		var replyData = reply.data;
		callback(replyData);
	}

	function initialize()
	{
		startGettingAlbums();
        setupHandlers();

        songControl.setupAudioElement();
		updateNowPlayingTrack();
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
			    	var parent = $(".menuOpen");
			     	parent.trigger('menuClosed');

			     	container.children().hide();
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

		$("#addMusic").click(
			function()
			{
				menus.showAddMenu($(this));
			});

		$(".menuBarBtn").bind('menuOpened', 
			function()
			{
				$(this).toggleClass('menuOpen');
			});

		$(".menuBarBtn").bind('menuClosed', 
			function()
			{
				$(this).toggleClass('menuOpen');
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
				var img = $("#volumeKnobImg")[0];

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
			var queryData = { };
			connect.sendQuery('getAlbumCount', queryData);
		}

		msgHandlers['getAlbumCountReply'] = function(data)
		{
			_albumCount = data.albumCount;

			_progressCallback(_albumProgress, _albumCount);
			getAlbums();
		}

		function getAlbums()
		{
			if (_albumCount == 0)
			{
				_callback();
				return;
			}

			var albumsRemaning = _albumCount - _albumOffset;
			var albumsToGet = Math.min(20, albumsRemaning);

			var queryData = { offset: _albumOffset, albumsToGet: albumsToGet };
			connect.sendQuery('getAlbums', queryData);
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
			var queryData = { artist: artist, album: album };
			connect.sendQuery('getTracks', queryData);
		}

		msgHandlers['getTracksReply'] = function(data)
		{
			callback(event, data);
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
		//artworkTag.css('width', width * ratio);    	// Scale width based on ratio

		//$("#tracks").css('height', maxHeight);

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
		var albumView = $("#albumView");

		var width = parseInt(anchor.css('width')) - parseInt(header.css('padding-left'));

		header.css('margin-left', anchor.css('margin-left'));
		header.css('width', width);
		
		albumName.css('max-width', width - 100);

		albumView.css('margin-left', anchor.css('margin-left'));
		albumView.css('width', width);

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
		var imageURL = 'images/defaultArtwork.png';

		if (replyData.artwork)
			imageURL = getBlobURLFromData(replyData.artwork.buffer);

		albumImage.attr('src', imageURL);
		albumImage.attr('alt', replyData.artist + ' - ' + replyData.album);

		clearAnyExpandedAlbums();
		onAlbumHover(event, false);

		var albumView = $("#albumView");
		
		_albumViewOpen = true;

		albumView.css('top', '103px');
		albumView.css('bottom', '80px');

		updateNowPlayingTrack();

		$("body").css('overflow', 'hidden');
		$("#addMusic").css('opacity', '0');

		resizeArtwork($("#albumImageLarge"));

		setTimeout(
			function()
			{
				var albums = $("#albums");
				albums.css('webkitFilter', 'blur(20px)');
			}
			, 700);
	}

	function updateProgress(progress, tagCount)
	{
		var html = progress + ' out of ' + tagCount + ' received.';
		$("#progress").html(html); 
	}

	function startGettingAlbums()
	{
		$("#loadingScreen").show();

		$("#appName").css('opacity', '1');
		$("#loadingImage").css('opacity', '1');

		getAllAlbums(displayAlbums, updateProgress);
	}

	function displayAlbums(albumList)
	{
		var albumTemplate = $(".templates").find('.albumEntry')[0];
		var albumContainer = $('#albums');

		if (albumList == null)
		{
			$("#loadingScreen").fadeOut();
			return;
		}

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			(function(album)
			{
				if (!album)
					return;

				if (album.artwork && album.artwork.buffer)
					album.blobURL = getBlobURLFromData(album.artwork.buffer);

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
			var menuOpen = false;

			albumEntryHover.mouseout(
				function(event)
				{
					if (menuOpen)
						return;

					onAlbumOut(event);
				});

			albumEntryHover.click(
				function(event)
				{
					var index = _expandedAlbumEntries.indexOf(albumEntryHover);
					
					var albumEntry = _expandedAlbumEntries[index].data('albumEntry');
					albumEntry.click();
				});

			albumEntryHover.bind('contextmenu', 
				function(event)
				{
					var artist = albumEntry.data('artist');
					var album = albumEntry.data('album');
					
					menus.showAlbumMenu(albumEntryHover, artist, album);

					return false;
				});

			albumEntryHover.bind('menuOpened', 
				function()
				{
					menuOpen = true;
  					albumEntryHover.toggleClass('menuOpen');
				});

			albumEntryHover.bind('menuClosed', 
				function()
				{
					menuOpen = false;
  					albumEntryHover.toggleClass('menuOpen');

					clearAnyExpandedAlbums();
				});
		})();

		_expandedAlbumEntries.push(albumEntryHover);
		$("body").append(albumEntryHover);

		albumEntryHover.data('originalPos', divPosition);

		albumEntryHover.css('left', divPosition.left);
		albumEntryHover.css('top', divPosition.top);

		albumEntryHover.show(0);

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
		if (_albumViewOpen == true)
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

		if (_albumViewOpen == true)
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
		var albumView = $("#albumView");
		albumView.css('top', 'calc(100% + 103px)');
		albumView.css('bottom', 'calc(-100% + 80px)');

		$("body").css('overflow', 'auto');
		$("#addMusic").css('opacity', '0.3');

		_albumViewOpen = false;

		setTimeout(
			function()
			{
				$("#albums").css('webkitFilter', 'blur(0px)');
			},
			700);
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

		if (getLastTrackID() == -1)
		{
			$("#bkButton").addClass("disabled");
		}
		else
		{
			$("#bkButton").removeClass("disabled");
		}

		if (_currentTrackID == -1)
		{
			$("#playButton").addClass("disabled");
		}
		else
		{
			$("#playButton").removeClass("disabled");
		}

		if (getNextTrackID() == -1)
		{
			$("#fwButton").addClass("disabled");
		}
		else
		{
			$("#fwButton").removeClass("disabled");
		}
	}

	function updateControlBarBackBtn(seconds)
	{
		if (seconds > 5)
		{
			$("#bkButton").removeClass("disabled");
			return;
		}

		if (getLastTrackID() == -1)
		{
			$("#bkButton").addClass("disabled");
		}
		else
		{
			$("#bkButton").removeClass("disabled");
		}
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

		var mimeStart = dataURL.indexOf(':') + 1;
		var mimeEnd = dataURL.indexOf(';');

		var mimeType = dataURL.substr(mimeStart, mimeEnd - mimeStart);
		mimeType.trim();

		var dataStart = dataURL.indexOf(';') + 1;
		var data = dataURL.substr(dataStart);

		if (data.substr(0, 7) == 'base64,')
		{
			dataStart += 7;

			var base64 = dataURL.substr(dataStart);
			data = atob(base64);
		}

		return {
			mimeType: mimeType,
			buffer: stringToBuffer(data)
		}
	}

	function getBlobURLFromData(data)
	{
		var dataURL = 'data:image/jpeg;' + data;
		return getBlobURLFromDataURL(dataURL);
	}

	function getBlobURLFromDataURL(dataURL)
	{
		var artworkBuffer = getBufferFromDataURL(dataURL);

		var arrayBuffer = artworkBuffer.buffer;
		var artworkBlob = new Blob([arrayBuffer], { type: artworkBuffer.mimeType });

		return URL.createObjectURL(artworkBlob);
	}

	function editSong(id)
	{
		var queryData = { id: id };
		connect.sendQuery('getSongInfo', queryData);

		msgHandlers['getSongInfoReply'] = function(data)
		{
			dialogs.editSong(data.songInfo,
				function(newTag)
				{
					queryData = { tag: newTag };
					connect.sendQuery('updateSongInfo', queryData);
				});
		}

		msgHandlers['updateSongInfoReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function deleteSong(id)
	{
		dialogs.confirmDelete(id,
			function()
			{
				var queryData = { id: id };
				connect.sendQuery('deleteSong', queryData);
			});

		msgHandlers['deleteSongReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function updateFilePickerDlg(path, showFiles, filter)
	{
		var queryData = { showFiles: showFiles, filter: filter, path: path };
		connect.sendQuery('getFileListing', queryData);  

		msgHandlers['getFileListingReply'] = function(data)
		{
			if (path == '')
			{
				path = 'Computer';
			}
			else if (path.length == 2 && path.charAt(path.length - 1) != '\\')
			{
				// Make sure drive has a backslash after it.
				path += '\\';
			}

			var currentDir = $("#currentDir");
			
			currentDir.val(path);
			currentDir.data('path', path);

			var fileView = $("#fileView");
			var fileTemplate = $(".templates").find('.fileEntry')[0];

			fileView.empty();

			for (var cnt = 0; cnt < data.fileList.length; cnt++)
			{
				var file = data.fileList[cnt];

				var fileEntry = new FileEntry(fileTemplate);
				fileEntry.setInfo(file);

				fileView.append(fileEntry.getElement());
			}

			$("#selectedFile").val('');
		}
	}

	function addSongs()
	{
		dialogs.filePicker(true, ['.mp3'],
			function(selectedFile)
			{
				if (!selectedFile)
					return;

				var selectedItems = [];
				selectedItems.push(selectedFile);

				var queryData = { itemList: selectedItems };
				connect.sendQuery('addFiles', queryData);

				console.log(selectedFile);
			});

		msgHandlers['addFilesReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function addFolders()
	{
		dialogs.filePicker(false, null,
			function(selectedItem)
			{
				if (!selectedItem)
					return;

				var selectedItems = [];
				selectedItems.push(selectedItem);

				var queryData = { itemList: selectedItems };
				connect.sendQuery('addFolders', queryData);

				console.log(selectedItem);
			});

		msgHandlers['addFoldersReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function editAlbum(artist, album)
	{
		var queryData = { artist: artist, album: album };
		connect.sendQuery('getAlbumInfo', queryData);

		msgHandlers['getAlbumInfoReply'] = function(data)
		{
			console.log(data.commonTag);

			dialogs.editAlbum(data.commonTag, 
				function(newTag)
				{
					console.log(newTag);

					queryData = { artist: artist, album: album, tag: newTag };
					connect.sendQuery('updateAlbumInfo', queryData);
				});
		}

		msgHandlers['updateAlbumInfoReply'] = function(data)
		{
			location.reload(true);
		}
	}

	function deleteAlbum(artist, album)
	{
		var queryData = { artist: artist, album: album };
		connect.sendQuery('deleteAlbum', queryData);

		msgHandlers['deleteAlbumReply'] = function(data)
		{
			location.reload(true);
		}
	}

	return {
		connectWebSocket: function() 
		{
			connect.createWebSocket(onWebSockOpen, onWebSockMessage);
		},

		initialize: function()
		{
			initialize();
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

		deleteSong: function(id)
		{
			deleteSong(id);
		},

		getBlobURLFromData: function(data)
		{
			return getBlobURLFromData(data);
		},

		getBufferFromDataURL: function(dataURL)
		{
			return getBufferFromDataURL(dataURL);
		},

		resizeDialogs: function()
		{
			return resizeDialogs();
		},

		updateFilePickerDlg: function(path, showFiles, filter)
		{
			return updateFilePickerDlg(path, showFiles, filter);
		},

		addSongs: function()
		{
			return addSongs();
		},

		addFolders: function()
		{
			return addFolders();
		},

		editAlbum: function(artist, album)
		{
			return editAlbum(artist, album);
		},

		deleteAlbum: function(artist, album)
		{
			return deleteAlbum(artist, album);
		},

		updateControlBarBackBtn: function(seconds)
		{
			updateControlBarBackBtn(seconds);
		},
	};
}());