var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.cookieHelpers = (function()
{
	function setCookie(name, value) 
	{
		localStorage.setItem(name, value);
	}

	function getCookie(name) 
	{
		var value = localStorage.getItem(name);

		if (value == 'null')
			return null;

		return value;
	}

	return {
		setCookie: function(name, value)
		{
			return setCookie(name, value);
		},

		getCookie: function(name)
		{
			return getCookie(name);
		},
	};
})();