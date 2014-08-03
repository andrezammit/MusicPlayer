var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.engine = (function()
{
	var connect = MusicPlayer.connect;
	var msgHandlers = {};

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

	function getAllTags(callback, progress)
	{
		var _tagList = [];

		var _tagCount = 0;
		var _tagOffset = 0;
		var _tagProgress = 0;

		var _callback = callback;
		var _progress = progress;

		getTagCount();

		function getTagCount()
		{
			var query = { call: 'getTagCount' };
			connect.sendQuery(query);
		}

		msgHandlers['getTagCountReply'] = function(data)
		{
			_tagCount = data.tagCount;

			progress(_tagProgress, _tagCount);
			getTags();
		}

		function getTags()
		{
			var tagsRemaning = _tagCount - _tagOffset;
			var tagsToGet = Math.min(100, tagsRemaning);

			var query = { call: 'getTags', offset: _tagOffset, tagsToGet: tagsToGet };
			connect.sendQuery(query);
		}

		msgHandlers['getTagsReply'] = function(data)
		{
			_tagOffset += data.tagCount;
			
			_tagProgress += data.tagCount;
			_tagList = _tagList.concat(data.tagData);

			_progress(_tagProgress, _tagCount);

			if (_tagOffset >= _tagCount)
			{
				_callback(_tagList);
				return;
			}

			getTags();
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

	function showAlbumTracks(trackList)
	{
		var html = '';

		for (cnt = 0; cnt < trackList.length; cnt++)
		{
			var track = trackList[cnt];

			if (!track)
				continue;

			html += '<a href="javascript:void(0)" id="playButton" onclick="songControl.playSong(' + track._id + ')"><img src="images/play.png" width="16px" height="16px" alt="Play" /></a>';
			html += '<div id="track">' + track.track + '</div><div id="song">' + track.song + '</div><div id="time">' + track.time + '</div>';
			html += '<br />';
		} 

		$("#tracks").html(html);
		$("#albumViewContainer").show();
		$("#albumView").slideToggle();
	}

	function updateProgress(progress, tagCount)
	{
		var html = progress + ' out of ' + tagCount + ' received.';
		$("#progress").html(html); 
	}

	function startGettingTags()
	{
		var loadingHtml = "<img src='images/loading.gif' width='32px' height='32px' alt='loading...' />";
		
		$("#loadingScreen").html(loadingHtml);
		$("#loadingScreen").show();

		getAllTags(displayTags, updateProgress);
	}

	function displayTags(tagList)
	{
		var html = '';

		for (cnt = 0; cnt < tagList.length; cnt++)
		{
			var tag = tagList[cnt];

			if (!tag)
				continue;

			html += '<a href="javascript:void(0)" onclick="songControl.playSong(' + tag._id + ')"><img src="images/play.png" width="16px" height="16px" alt="Play" /></a>';
			html += tag.artist + ' - ' + tag.album + ' - ' + tag.track;
			html += '<br />';
		} 

		$("#albums").html(html);
		$("#loadingScreen").hide();
	}

	function startGettingAlbums()
	{
		$("#loadingScreen").show();

		getAllAlbums(displayAlbums, updateProgress);
	}

	function onAlbumHover(tag)
	{
		var headerTag = $("#header");
		
		headerTag.fadeOut(40,
			function()
			{
				headerTag.html(tag.innerHTML);
				headerTag.fadeIn();
			});
	}

	function displayAlbums(albumList)
	{
		var html = '';

		for (cnt = 0; cnt < albumList.length; cnt++)
		{
			var album = albumList[cnt];

			if (!album)
				continue;

			html += '<div id="album">';
			html += '<a href="javascript:void(0)" onmouseover="musicPlayer.onAlbumHover(this)" onclick="musicPlayer.chooseAlbum(&quot;' + album.albumArtist + '&quot;, &quot;' + album.album + '&quot;)">';
			html += album.albumArtist + ' - ' + album.album;
			html += '</a>';
			html += '</div>';
		} 

		$("#albums").html(html);
		$("#loadingScreen").fadeOut();
	}

	return {
		connectWebSocket: function() 
		{
			connect.createWebSocket(onWebSockOpen, onWebSockMessage);
		},

		onAlbumHover: function(tag)
		{
			var headerTag = $("#header");
		
			headerTag.fadeOut(40,
				function()
				{
					headerTag.html(tag.innerHTML);
					headerTag.fadeIn();
				});
		},

		chooseAlbum: function(artist, album)
		{
			getAlbumTracks(artist, album, showAlbumTracks);
		},

		closeTracks: function()
		{
			$("#albumView").slideToggle(400, 
				function()
				{
					$("#albumViewContainer").toggle();
				});
		},
	};
}());