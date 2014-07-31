var msgHandlers = {};

function connectWebSocket()
{
	createWebSocket(onWebSockMessage);
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
		sendQuery(query);
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
		sendQuery(query);
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
		sendQuery(query);
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
		sendQuery(query);
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

function chooseAlbum(artist, album)
{
	getAlbumTracks(artist, album, showAlbumTracks);
}

function getAlbumTracks(artist, album, callback)
{
	getTracks();

	function getTracks()
	{
		var query = { call: 'getTracks', albumArtist: artist, album: album };
		sendQuery(query);
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

		html += '<a href="javascript:void(0)" onclick="playSong(' + track._id + ')"><img src="images/play.png" width="16px" height="16px" alt="Play" /></a>';
		html += track.track + ' - ' + track.artist + ' - ' + track.song;
		html += '<br />';
	} 

	$("#albumView").html(html);
}

function updateProgress(progress, tagCount)
{
	var html = progress + ' out of ' + tagCount + ' received.';
	$("#progress").html(html); 
}

function startGettingTags()
{
	var loadingHtml = "<img src='images/loading.gif' width='32px' height='32px' alt='loading...' />";
	$("#result").html(loadingHtml);

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

		html += '<a href="javascript:void(0)" onclick="playSong(' + tag._id + ')"><img src="images/play.png" width="16px" height="16px" alt="Play" /></a>';
		html += tag.artist + ' - ' + tag.album + ' - ' + tag.track;
		html += '<br />';
	} 

	$("#result").html(html);
}

function startGettingAlbums()
{
	var loadingHtml = "<img src='images/loading.gif' width='32px' height='32px' alt='loading...' />";
	$("#result").html(loadingHtml);

	getAllAlbums(displayAlbums, updateProgress);
}

function displayAlbums(albumList)
{
	var html = '';

	for (cnt = 0; cnt < albumList.length; cnt++)
	{
		var album = albumList[cnt];

		if (!album)
			continue;

		html += '<a href="javascript:void(0)" onclick="chooseAlbum(&quot;' + album.albumArtist + '&quot;, &quot;' + album.album + '&quot;)">';
		html += album.albumArtist + ' - ' + album.album;
		html += '</a><br />';
	} 

	$("#result").html(html);
}


