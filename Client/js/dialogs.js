var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.dialogs = (function()
{
	function initDialogs()
	{
		var closeDialogButtons = $(".dialogs").find(".closeDialog, .cancelBtn");
		
		closeDialogButtons.click(
			function()
			{
				getDialogContainer().fadeOut();
				
				var parents = $(this).parentsUntil($("#dialogContainer"));
				var dialog = parents[parents.length - 1];

				$(dialog).fadeOut();
			});
	}

	function getDialogContainer()
	{
		return $(".dialogs").find("#dialogContainer");
	}

	function editSong(songInfo, callback)
	{
		var editSongDlg = $(".dialogs").find("#editSong");

		editSongDlg.find("#artist").val(songInfo.artist);
		editSongDlg.find("#albumArtist").val(songInfo.albumArtist);
		editSongDlg.find("#album").val(songInfo.album);
		editSongDlg.find("#year").val(songInfo.year);
		editSongDlg.find("#title").val(songInfo.song);
		editSongDlg.find("#track").val(songInfo.track);
		
		var blobURL = musicPlayer.getBlobURLFromData(songInfo.artwork);
		editSongDlg.find("#editArtwork").attr('src', blobURL);

		editSongDlg.find(".okBtn").click(
			function()
			{
				var newTag = {};

				var artistField = editSongDlg.find("#artist");

				if (songInfo.artist != artistField.html)
					newTag.artist = artistField.html;

				var albumArtistField = editSongDlg.find("#albumArtist");

				if (songInfo.albumArtist != albumArtistField.html)
					newTag.albumArtist = albumArtistField.html;

				var albumField = editSongDlg.find("#album");

				if (songInfo.album != albumField.html)
					newTag.album = albumField.html;

			});

		$("body").css('overflow', 'hidden');

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				editSongDlg.fadeIn();
			});
	}

	return {
		initDialogs: function()
		{
			initDialogs();
		},

		editSong: function(songInfo, callback)
		{
			editSong(songInfo, callback);
		},
	};
})();