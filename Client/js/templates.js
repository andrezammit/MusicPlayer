var MusicPlayer = window.MusicPlayer || {};

var menus = MusicPlayer.menus;

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
		var menuLink = _clone.find(".menuLink");

		(function(trackID)
		{
			var menuOpen = false;

			playLink.click(
				function()
				{
					musicPlayer.playSong(_id);
				});

			menuLink.click(
				function()
				{
					menus.showTrackMenu(_clone, _id);
				});

			_clone.mouseover(
				function(event)
				{
					menuLink.show();
				});

			_clone.mouseout(
				function(event)
				{
					if (menuOpen)
						return;

					menuLink.hide();
				});

			_clone.bind('menuOpened', 
				function()
				{
					menuOpen = true;

					menuLink.show();
					menuLink.toggleClass('menuOpen');
					
					_clone.toggleClass('selected');
				});

			_clone.bind('menuClosed', 
				function()
				{
					menuOpen = false;

					menuLink.hide();
					menuLink.toggleClass('menuOpen');
					
					_clone.toggleClass('selected');
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

		var encodedURL = encodeURI(_albumArtist + '_' + _album)
		var imageURL = 'getArtwork?' + encodedURL;

		albumArtwork.attr('src', imageURL);
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

function FileEntry(templateElement)
{
	var _file = null;
	var _clone = $(templateElement).clone();

	function getElement()
	{
		var imgPath = 'images/file.png';

		if (_file.folder)
			imgPath = 'images/folder.png';

		_clone.find(".fileName").html(_file.name);
		_clone.find(".fileIconImg").attr('src', imgPath);

		_clone.data("file", _file);

		(function()
		{
			_clone.click(
				function(event)
				{
					$(".fileEntry.selected").toggleClass("selected");
					_clone.toggleClass("selected");
					
					$("#filePicker").trigger("itemClick");
				});

			_clone.dblclick(
				function(event)
				{
					$("#filePicker").trigger("itemDblClick");
				});
		})();

		return _clone;
	}

	return {
		getElement: function()
		{
			return getElement();
		},

		setInfo: function setInfo(file)
		{
			_file = file;
		}
	}; 
}