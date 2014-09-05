var MusicPlayer = window.MusicPlayer || {};

function TrackEntry(templateElement)
{
	var _id;
	var _song;
	var _time;
	var _track;

	var _album;
	var _artist;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		_clone.data("artist", _artist);
		_clone.data("album", _album);

		_clone.find(".track").html(_track);
		_clone.find(".song").html(_song);
		_clone.find(".time").html(_time);

		var playLink = _clone.find(".playButtonSmall");

		(function(trackID)
		{
			playLink.click(
				function()
				{
					musicPlayer.playSong(_id);
				});

		})(_id);

		return _clone;
	}

	return {
		getElement: function()
		{ 
			return getElement();
		},

		setInfo: function(track, artist, album)
		{
			_id = track._id;
			_song = track.song;
			_time = track.time;
			_track = track.track;

			_artist = artist;
			_album = album;
		},
	};
}

function AlbumEntry(templateElement)
{
	var _year;
	var _album;
	var _blobURL;
	var _albumArtist;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		var albumArtwork = _clone.find(".albumImageSmall");

		(function()
		{
			albumArtwork.bind('load', 
				function() 
				{
					_clone.css('opacity', 1)
				});

			_clone.click(
				function(event)
				{
					musicPlayer.chooseAlbum(event);
				});

			_clone.mouseover(
				function(event)
				{
					musicPlayer.onAlbumHover(event);
				});
		})();

		if (_blobURL)
			albumArtwork.attr('src', _blobURL);
		
		albumArtwork.attr('alt', _albumArtist + ' - ' + _album);

		_clone.data("artist", _albumArtist);
		_clone.data("album", _album);
		_clone.data("year", _year);

		return _clone;
	}

	return {
		getElement: function()
		{
			return getElement();
		},

		setInfo: function(albumArtist, album, blobURL, year)
		{
			_year = year;
			_album = album;
			_blobURL = blobURL;
			_albumArtist = albumArtist;
		},
	};
}