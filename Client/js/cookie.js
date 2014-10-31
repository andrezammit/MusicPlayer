var MusicPlayer = window.MusicPlayer || {};

MusicPlayer.cookieHelpers = (function()
{
	function setCookie(name, value) 
	{
		localStorage.setItem(name, value);

	    // var date = new Date();
	    // date.setTime(date.getTime() + (duration * 24 * 60 * 60 * 1000));

	    // var expires = 'expires=' + date.toUTCString();
	    // document.cookie = name + '=' + value + '; ' + expires;
	}

	function getCookie(name) 
	{
		return localStorage.getItem(name);

	    // var tmpName = name + '=';
	    // var data = document.cookie.split(';');
	    
	    // for (var cnt = 0; cnt < data.length; cnt++) 
	    // {
	    //     var entry = data[cnt];

	    //     while (entry.charAt(0) == ' ') 
	    //     	entry = entry.substring(1);
	        
	    //     if (entry.indexOf(tmpName) != -1) 
	    //     	return entry.substring(tmpName.length, entry.length);
	    // }

	    // return null;
	}

	return {
		setCookie: function(name, value, duration)
		{
			return setCookie(name, value, duration);
		},

		getCookie: function(name)
		{
			return getCookie(name);
		},
	};
})();