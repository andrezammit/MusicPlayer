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
		
		getDialogContainer().fadeIn();
		editSongDlg.fadeIn();
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