var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.menus = (function()
{
	function hideMenu(menu)
	{
		$(".menus").hide();
		
		menu.trigger('menuClosed');
		menu.hide();
	}

	function offsetMenu(offsetElement, menu)
	{
		var offset = $(offsetElement)[0].getBoundingClientRect();

		menu.css('top', offset.bottom);
		menu.css('left', offset.right - menu.width());
	}

	function showMenu(offsetElement, menu)
	{
		offsetElement.trigger('menuOpened');
		
		$(".menus").show();
		menu.show();
	}

	function showTrackMenu(offsetElement, id)
	{
		var trackMenu = $(".menus").find("#trackMenu");
		offsetMenu(offsetElement, trackMenu);

		var editItem = trackMenu.find("#edit");
		var deleteItem = trackMenu.find("#delete");

		(function(id)
		{
			editItem.off('click');
			deleteItem.off('click');

			trackMenu.off('menuClosed');

			editItem.click(
				function()
				{
					hideMenu(trackMenu);
					musicPlayer.editSong(id);

				});

			deleteItem.click(
				function()
				{
					hideMenu(trackMenu);
					musicPlayer.deleteSong(id);
				});

			trackMenu.on('menuClosed',
				function()
				{
					offsetElement.trigger('menuClosed');
				});
		})(id);

		showMenu(offsetElement, trackMenu);
	}

	function showAlbumMenu(offsetElement, arist, album)
	{
		var albumMenu = $(".menus").find("#albumMenu");
		offsetMenu(offsetElement, albumMenu);

		var editItem = albumMenu.find("#edit");
		var deleteItem = albumMenu.find("#delete");

		(function()
		{
			editItem.off('click');
			deleteItem.off('click');

			albumMenu.off('menuClosed');

			editItem.click(
				function()
				{
					hideMenu(albumMenu);
					musicPlayer.editAlbum(artist, album);

				});

			deleteItem.click(
				function()
				{
					hideMenu(albumMenu);
					musicPlayer.deleteAlbum(artist, album);
				});

			albumMenu.on('menuClosed',
				function()
				{
					offsetElement.trigger('menuClosed');
				});
		})();

		showMenu(offsetElement, albumMenu);
	}

	function showAddMenu(offsetElement)
	{
		var addMenu = $(".menus").find("#addMenu");

		offsetMenu(offsetElement, addMenu);

		var addFileItem = addMenu.find("#addFile");
		var addFolderItem = addMenu.find("#addFolder");

		(function()
		{
			addFileItem.off('click');
			addFolderItem.off('click');

			addMenu.off('menuClosed');

			addFileItem.click(
				function()
				{
					hideMenu(addMenu);
					musicPlayer.addSongs();
				});

			addFolderItem.click(
				function()
				{
					hideMenu(addMenu);
					musicPlayer.addFolders();
				});

			addMenu.on('menuClosed',
				function()
				{
					offsetElement.trigger('menuClosed');
				});
		})();

		showMenu(offsetElement, addMenu);
	}

	return {
		showTrackMenu: function(offsetElement, id)
		{
			showTrackMenu(offsetElement, id);
		},

		showAlbumMenu: function(offsetElement, aritst, album)
		{
			showAlbumMenu(offsetElement, artist, album);
		},

		showAddMenu: function(offsetElement)
		{
			showAddMenu(offsetElement);
		},
	};
})();