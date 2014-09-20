var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.menus = (function()
{
	function hideMenu(menu)
	{
		$(".menus").hide();
		
		menu.trigger('menuClosed');
		menu.hide();
	}

	function showTrackMenu(offsetElement, id)
	{
		var offset = $(offsetElement)[0].getBoundingClientRect();
		var trackMenu = $(".menus").find("#trackMenu");

		trackMenu.css('top', offset.bottom);
		trackMenu.css('left', offset.right - trackMenu.width());

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

		offsetElement.trigger('menuOpened')

		$(".menus").show();
		trackMenu.show();
	}

	return {
		showTrackMenu: function(offsetElement, id)
		{
			showTrackMenu(offsetElement, id);
		},
	};
})();