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

		var filePickerDlg = $(".dialogs").find("#filePicker");
		closeDialogButtons = filePickerDlg.find(".closeDialog, .cancelBtn");

		closeDialogButtons.click(
			function()
			{
				$("body").css('overflow', 'auto');
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
		
		var blobURL = musicPlayer.getBlobURLFromData(songInfo.artwork.buffer);

		var editArtwork = editSongDlg.find("#editArtwork");
		editArtwork.attr('src', blobURL);
		
		editSongDlg[0].onpaste =  
			function(event)
			{ 
				var items = (event.clipboardData || event.originalEvent.clipboardData).items;

				for (var cnt = 0; cnt < items.length; cnt++)
				{
					var item = items[cnt];

					if (item.kind != 'file')
						continue;

					var blob = item.getAsFile();
  					var reader = new FileReader();
  					
  					reader.onload = function(event)
  					{
  						var dataURL = event.target.result;

  						if (!dataURL)
  							return;

						editArtwork.attr('src', dataURL);
    				};

  					reader.readAsDataURL(blob);
  					break;
				}
			};

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

				var artworkField = editSongDlg.find("#editArtwork");
				var newArtwork = artworkField.attr('src');

				if (blobURL != newArtwork)
					newTag.artworkURL = newArtwork;

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

	function editAlbum(commonTag, callback)
	{
		var editAlbumDlg = $(".dialogs").find("#editAlbum");

		editAlbumDlg.find("#artist").val(commonTag.artist);
		editAlbumDlg.find("#albumArtist").val(commonTag.albumArtist);
		editAlbumDlg.find("#album").val(commonTag.album);
		editAlbumDlg.find("#year").val(commonTag.year);
		
		var blobURL = musicPlayer.getBlobURLFromData(commonTag.artwork.buffer);

		var editArtwork = editAlbumDlg.find("#editArtwork");
		editArtwork.attr('src', blobURL);

		editAlbumDlg[0].onpaste =  
			function(event)
			{ 
				var items = (event.clipboardData || event.originalEvent.clipboardData).items;

				for (var cnt = 0; cnt < items.length; cnt++)
				{
					var item = items[cnt];

					if (item.kind != 'file')
						continue;

					var blob = item.getAsFile();
  					var reader = new FileReader();
  					
  					reader.onload = function(event)
  					{
  						var dataURL = event.target.result;

  						if (!dataURL)
  							return;

						editArtwork.attr('src', dataURL);
    				};

  					reader.readAsDataURL(blob);
  					break;
				}
			};

		editAlbumDlg.find(".okBtn").off('click');
		editAlbumDlg.find(".okBtn").click(
			function()
			{
				var newTag = {};

				var artistField = editAlbumDlg.find("#artist");

				if (songInfo.artist != artistField.val())
					newTag.artist = artistField.val();

				var albumArtistField = editAlbumDlg.find("#albumArtist");

				if (songInfo.albumArtist != albumArtistField.val())
					newTag.albumArtist = albumArtistField.val();

				var albumField = editAlbumDlg.find("#album");

				if (songInfo.album != albumField.val())
					newTag.album = albumField.val();

				var yearField = editAlbumDlg.find("#year");

				if (songInfo.year != yearField.val())
					newTag.year = yearField.val();

				var artworkField = editAlbumDlg.find("#editArtwork");
				var newArtwork = artworkField.attr('src');

				if (blobURL != newArtwork)
					newTag.artworkURL = newArtwork;

				closeDialog(editAlbumDlg);
				callback(newTag);
			});

		$("body").css('overflow', 'hidden');

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				editAlbumDlg.fadeIn(400);
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
				closeDialog(confirmDeletegDlg);
				callback();
			});

		getDialogContainer().fadeIn(400, 
			function()
			{
				musicPlayer.resizeDialogs();
				confirmDeletegDlg.fadeIn(400);
			});
	}

	function filePicker(showFiles, filter, callback)
	{
		musicPlayer.updateFilePickerDlg('', showFiles, filter);

		$("body").css('overflow', 'hidden');

		var filePickerDlg = $(".dialogs").find("#filePicker");

		var dlgTitle = filePickerDlg.find("h3");

		if (showFiles)
		{
			dlgTitle.html("Add File");
		}
		else
		{
			dlgTitle.html("Add Folder");
		}

		filePickerDlg.find("#goUp").off('click');
		filePickerDlg.find("#goUp").click(
			function()
			{
				var newPath = '';
				var currentDir = $("#currentDir").data('path');
				
				// If length is 3 (C:\) then the path is just the drive letter.
				if (currentDir.length == 3)
				{
					newPath = '';
				}
				else
				{
					var pos = currentDir.lastIndexOf('\\');
					newPath = currentDir.slice(0, pos);
				}

				musicPlayer.updateFilePickerDlg(newPath);
			});

		filePickerDlg.find(".okBtn").off('click');
		filePickerDlg.find(".okBtn").click(
			function()
			{
				var selectedFile = filePickerDlg.find(".selected").data('file');
				
				if (showFiles && selectedFile.folder)
				{
					musicPlayer.updateFilePickerDlg(selectedFile.fullPath, showFiles, filter);
					return;
				}

				closeDialog(filePickerDlg);
				callback(selectedFile);

				$("body").css('overflow', 'auto');
			});

		filePickerDlg.off("itemClick");
		filePickerDlg.on("itemClick", 
			function()
			{
				var selectedFile = filePickerDlg.find(".selected").data('file');

				if (!selectedFile)
					return;

				filePickerDlg.find("#selectedFile").val(selectedFile.name);
			});

		filePickerDlg.off("itemDblClick");
		filePickerDlg.on("itemDblClick", 
			function()
			{
				var selectedFile = filePickerDlg.find(".selected").data('file');

				if (selectedFile.folder)
				{
					musicPlayer.updateFilePickerDlg(selectedFile.fullPath, showFiles, filter);
					return;
				}

				filePickerDlg.find(".okBtn").click();
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

		editAlbum: function(commonTag, callback)
		{
			editAlbum(commonTag, callback);
		},

		confirmDelete: function(id, callback)
		{
			confirmDelete(id, callback);
		},

		filePicker: function(showFiles, filter, callback)
		{
			filePicker(showFiles, filter, callback);
		},
	};
})();