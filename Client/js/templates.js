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
		_clone.attr("artist", _artist);
		_clone.attr("album", _album);

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
	var _artwork;
	var _albumArtist;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		var albumLink = _clone.find(".albumLink");
				
		(function(album)
		{
			albumLink.click(
				function()
				{
					musicPlayer.chooseAlbum(_albumArtist, _album, albumLink[0]);
				});

			albumLink.hover(
				function()
				{
					musicPlayer.onAlbumHover(_albumArtist, _album, _year);
				},
				function()
				{
					musicPlayer.onAlbumOut();
				});

		})();

		var albumArtwork = _clone.find(".albumImageSmall");

		albumArtwork.attr('src', 'data:image/png;base64,' + _artwork);
		albumArtwork.attr('alt', _albumArtist + ' - ' + _album);

		return _clone;
	}

	return {
		getElement: function()
		{
			return getElement();
		},

		setInfo: function(albumArtist, album, artwork, year)
		{
			_year = year;
			_album = album;
			_artwork = artwork;
			_albumArtist = albumArtist;
		},
	};
}