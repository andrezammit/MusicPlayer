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
		var offsetElement = $(offsetElement);
		var trackMenu = $(".menus").find("#trackMenu");

		var top = offsetElement.offset().top + offsetElement.height();
		var right = ($(window).width() - (offsetElement.offset().left + offsetElement.outerWidth()));
		
		trackMenu.css('top', top);
		trackMenu.css('right', right);

		trackMenu.find("#edit").click(
			function()
			{
				hideMenu(trackMenu);
				musicPlayer.editSong(id);

			});

		trackMenu.on('menuClosed',
			function()
			{
				offsetElement.trigger('menuClosed');
			})

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