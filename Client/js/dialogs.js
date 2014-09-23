var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.dialogs = (function()
{
	function initDialogs()
	{
		var closeDialogButtons = $(".dialogs").find(".closeDialog, .cancelBtn");
		
		closeDialogButtons.click(
			function()
			{
				var parents = $(this).parentsUntil($("#dialogContainer"));
				var dlg = parents[parents.length - 1];

				closeDialog($(dlg));
			});
	}

	function closeDialog(dlg)
	{
		dlg.fadeOut(400,
			function()
			{
				getDialogContainer().fadeOut(400);
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

		editSongDlg.find(".okBtn").off('click');
		editSongDlg.find(".okBtn").click(
			function()
			{
				var newTag = {};

				var artistField = editSongDlg.find("#artist");

				if (songInfo.artist != artistField.val())
					newTag.artist = artistField.val();

				var albumArtistField = editSongDlg.find("#albumArtist");

				if (songInfo.albumArtist != albumArtistField.val())
					newTag.albumArtist = albumArtistField.val();

				var albumField = editSongDlg.find("#album");

				if (songInfo.album != albumField.val())
					newTag.album = albumField.val();

				var yearField = editSongDlg.find("#year");

				if (songInfo.year != yearField.val())
					newTag.year = yearField.val();

				var titleField = editSongDlg.find("#title");

				if (songInfo.song != titleField.val())
					newTag.song = titleField.val();

				var trackField = editSongDlg.find("#track");

				if (songInfo.track != trackField.val())
					newTag.track = trackField.val();

				closeDialog(editSongDlg);
				callback(newTag);
			});

		$("body").css('overflow', 'hidden');

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				editSongDlg.fadeIn(400);
			});
	}

	function confirmDelete(id, callback)
	{
		$("body").css('overflow', 'hidden');

		var confirmDeletegDlg = $(".dialogs").find("#confirmDelete");

		confirmDeletegDlg.find(".okBtn").off('click');
		confirmDeletegDlg.find(".okBtn").click(
			function()
			{
				callback();
			});

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				confirmDeletegDlg.fadeIn(400);
			});
	}

	function filePicker(callback)
	{
		musicPlayer.updateFilePickerDlg('');

		$("body").css('overflow', 'hidden');

		var filePickerDlg = $(".dialogs").find("#filePicker");

		filePickerDlg.find(".okBtn").off('click');
		filePickerDlg.find(".okBtn").click(
			function()
			{
				callback();
			});

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				filePickerDlg.fadeIn(400);
			});
	}

	return {
		initDialogs: function()
		{
			initDialogs();
		},

		editSong: function(id, songInfo, callback)
		{
			editSong(id, songInfo, callback);
		},

		confirmDelete: function(id, callback)
		{
			confirmDelete(id, callback);
		},

		filePicker: function(callback)
		{
			filePicker(callback);
		},
	};
})();