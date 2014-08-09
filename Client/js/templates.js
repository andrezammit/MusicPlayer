
function TrackEntry(templateElement)
{
	var _id;
	var _song;
	var _time;
	var _track;

	var _clone = $(templateElement).clone();

	function getElement()
	{
		_clone.find(".track").html(_track);
		_clone.find(".song").html(_song);
		_clone.find(".time").html(_time);

		var playLink = _clone.find(".playButtonSmall");

		(function(trackID)
		{
			playLink.click(
				function()
				{
					songControl.playSong(_id);
				});

		})(_id);

		return _clone;
	}

	return {
		getElement: function()
		{ 
			return getElement();
		},

		setInfo: function(id, track, song, time)
		{
			_id = id;
			_song = song;
			_time = time;
			_track = track;
		},
	};
}

function AlbumEntry(templateElement)
{
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
					musicPlayer.onAlbumHover(_albumArtist, _album);
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

		setInfo: function(albumArtist, album, artwork)
		{
			_album = album;
			_artwork = artwork;
			_albumArtist = albumArtist;
		},
	};
}