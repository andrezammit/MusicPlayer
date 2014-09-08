var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.dialogs = (function()
{
	function initDialogs()
	{
		var closeDialogButtons = $(".dialogs").find(".closeDialog");
		
		closeDialogButtons.click(
			function()
			{
				getDialogContainer().fadeOut();
				$(this).parent().fadeOut();
			});
	}

	function getDialogContainer()
	{
		return $(".dialogs").find("#dialogContainer");
	}

	function editSong(songInfo)
	{
		var editSongDlg = $(".dialogs").find("#editSong");

		editSongDlg.find("#artist").val(songInfo.artist);
		editSongDlg.find("#albumArtist").val(songInfo.albumArtist);
		editSongDlg.find("#album").val(songInfo.album);
		editSongDlg.find("#year").val(songInfo.year);
		editSongDlg.find("#title").val(songInfo.song);
		editSongDlg.find("#track").val(songInfo.track);
		
		var blobkURL = musicPlayer.getBlobURLFromData(songInfo.artwork);
		editSongDlg.find("#editArtwork").attr('src', blobkURL);

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

		editSong: function(songInfo)
		{
			editSong(songInfo);
		},
	};
})();