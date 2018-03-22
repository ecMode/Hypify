// Extension main script
// Purpose of the extension is to auto query hype machine tracks to see if they exist in spotify
var stylesheetUrl = chrome.extension.getURL("hypestyles.css");

// This is all the JS that will be injected in the document body
var main = function() {
    /**
     * Return outerHTML for the first element in a jQuery object,
     * or an empty string if the jQuery object is empty;  
     */
    $.fn.outerHTML = function() {
        return (this[0]) ? this[0].outerHTML : '';  
    };
    
    /**
     * Utility to wrap the different behaviors between W3C-compliant browsers
     * and IE when adding event handlers.
     *
     * @param {Object} element Object on which to attach the event listener.
     * @param {string} type A string representing the event type to listen for
     *     (e.g. load, click, etc.).
     * @param {function()} callback The function that receives the notification.
     */
    function addListener(element, type, callback) {
        if (element.addEventListener) 
            element.addEventListener(type, callback);
        else if (element.attachEvent) 
            element.attachEvent('on' + type, callback);
    }
    
    /***
     * The name _dlExtGATracker is chosen so as not to conflict with HypeMachine's possible
     * use of Google Analytics object.
     */
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','spotGATracker');
    
    spotGATracker('create', 'UA-46433333-1', 'hypem.com');
    spotGATracker('send', 'pageview');
    
    // Form a single track query - stripping and adding misc
    var getSingleQuery = function (trackInfo) {
		if (trackInfo.className == "base-title") { //bingo
			var tempQuery = trackInfo.innerText;
			var featIndex = tempQuery.substring(0).search(/feat/gi);
			// Remove everything if featured artist w/ parens
			if (featIndex > 0 && tempQuery.substring(featIndex-1, featIndex) == "(")
			tempQuery = tempQuery.substring(0, featIndex-1);
			// Remove everything if featured artist
			else if (featIndex > 0)
			tempQuery = tempQuery.substring(0, featIndex);
			// Remove just parens query doesn't like literals
			return tempQuery.replace("(", "").replace(")", "");
		}
		else if (trackInfo.className == "remix-link")
			return (" " + trackInfo.innerText);
		// Ignoring remix-count
		return "";
    }
    
    // Compile all the track queries into an array for later use
    var getSearchQueries = function () {
		var queries = [];
		var tempQuery;
		var trackInfo = null;
		var raws = $('a.track');
		raws.each(function (i, raw) { // Hypem max loads 20 tracks at a time
			tempQuery = "";
			trackInfo = raws[i].children;
			for ( var j in trackInfo ) // Max 3 spans of title info
			tempQuery += getSingleQuery(trackInfo[j]);
			queries.push(tempQuery.trim());
		});
		return queries;
    }
    
    var cleanArtistString = function (artist){
		var featIndex = artist.substring(0).search(/feat/gi);
		if (featIndex > 0)
			return artist.substring(0, featIndex - 1).trim();
		else
			return artist.trim();
    }

    //In the scenario where a returned title has punctuation or parens
    //a straight up string match wont work since I strip all extras for the query
    //I'm going to split my title query into single words and do individual word matches.
    //This will increase length of search 2-6x normal I'm sure, but is negligible still
    //for the accuracy gain.
    var checkTitle = function (titleQuery, title){
		var querySplit = titleQuery.split(" ");
		var status = [];
		for ( var i in querySplit){
			var re = new RegExp("\\b" + querySplit[i] + "\\b", "gi");
			status.push(title.match(re) != null);
		} // if match, all true / can't find false, return true match
		return $.inArray(false, status) == -1;
    }
    
    var checkArtist = function (artistQuery, artistArray){
        var re = new RegExp(artistQuery, "gi");
        for ( var i in artistArray ) {
            if (artistArray[i].name.match(re))
                return true;
        }
        return false;
    }

    var isOfRegion = function (regionArray, targetRegion){
		return regionArray.indexOf(targetRegion) > -1;
    }

    var processData = function (data, title, track, artist, buttonString) {
		var jsonResult = data;
		// Reasonable to say that if the artist isn't available on the first page he isn't there
		var queryTracks = jsonResult.tracks.items;
		for ( var i in queryTracks ) {
		    var re = new RegExp(title, "gi");
		    var name = queryTracks[i].name;
		    var artists = queryTracks[i].artists;
		    var album = queryTracks[i].album;
			var availableMarkets = queryTracks[i].available_markets
			var uri = queryTracks[i].uri;
			
		    if (checkTitle(title, name) && checkArtist(artist, artists) && isOfRegion(availableMarkets, "US")) {
				var spot_button  = document.createElement("a");
				var action = targetPlaylist === null ? 'search' : 'add';
				spot_button.target = "_top";
				spot_button.className = "SpotButton";
				spot_button.innerHTML = '<table class="arrow"><tr><td><div class="hypcontainer" style="height:34px;width:34px;"><div class="' + action + '"></div></div></td></tr><tr><td class="' + buttonString + '"></td></tr></table>';
				spot_button.setAttribute('uri-data', uri);
				if (!queryTracks[i].external_urls.hasOwnProperty('spotify'))
					break;
				$(track).prepend('<li class="hypify"><table class="spacer"></table>' + $(spot_button)[0].outerHTML + '</li>');
				if (action == 'search'){
					$('.SpotButton[uri-data="' + uri + '"]').click(function () {
						window.open(queryTracks[i].external_urls.spotify);
					});
				} else {
					$('.SpotButton[uri-data="' + uri + '"]').click(function (){
						addToPlaylist($(this).attr('uri-data'));
					});
				}
				break;
		    }
		}
    }
    
    var generator = function() {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var string_length = 8;
        var randomstring = "";
        for (var i=0; i<string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.charAt(rnum);
        }
        return randomstring;
    };
    
    //Here is where we can randomly generate the name of the styles to avoid them checking for specific names.
    //Can add more here if they check additional names.
    //ref:http://jonraasch.com/blog/javascript-style-node
    var buttonString = generator();
    var css = document.createElement('style');
    css.type = 'text/css';
    var styles = '.' + buttonString;
    styles += '.arrow:hover .'+ buttonString +'{ border-top: 10px solid #0063DC; }';
    
    //done this way for IE apparently.
    if (css.styleSheet) 
        css.styleSheet.cssText = styles;
    else 
        css.appendChild(document.createTextNode(styles) );
    document.getElementsByTagName("head")[0].appendChild(css);    
    // Adds a button next to each track that had matching spotify queries
    var buttonScript = function() {
		// Wait for the tracks script to load
		var trackList = window.displayList['tracks'];
		if (trackList === undefined || trackList.length < 1) {
			setTimeout(buttonScript, 1);
		} else {
			// Check if this particular page has been processed
			// through a previous call
			var tracks = getSearchQueries();
			if ($('.hypify').length < trackList.length) {
				$('ul.tools').each(function(index, track) {
					var song = trackList[index];
					var title = tracks[index];
					var artist = cleanArtistString(song.artist);
					var hasButton = $(track).data("hasButton");
					if (typeof(hasButton) === 'undefined' || !hasButton){
						$.ajax({ //query spotify's metadata api
							url: "https://api.spotify.com/v1/search?q=" + title + "&type=track&limit=50",
							crossDomain: true, 
							headers: {
								'Authorization': 'Bearer ' + accessToken
							},
							success: function (data){
								processData(data, title, track, artist, buttonString);
							}
						});
						$(track).data("hasButton", true);
					}
				});//each
			}
		}		
    };//buttonScript

	function receiveMessage(event){
		if (event.origin != 'http://ecmode.github.io') {
			return;
		}
		if (authWindow) {
			authWindow.close();
		}
		accessToken = event.data;
		tokenTimer = 3600;//default expires_in
		countdownTool = window.setInterval(function () {
			tokenTimer -= 1;
			if (tokenTimer <= 0){
				window.clearInterval(countdownTool);
			}
		}, 1000);
		var ev = $._data(window, 'events');
		if(ev && !ev.tokenReceived) {
			getUserInfo();
		} else {
			$(window).trigger('tokenReceived');
		}
	}

	function toQueryString(obj) {
		var parts = [];
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
			}
		}
		return parts.join("&");
	}
	var authWindow = null;

	function injectSpotifyLogin () {
		$('.menu').append('<li id="spotify-auth"><a id="spotify-auth-text" title="Interact with Spotify">Spotify Login</a><ul id="playlist-info"></ul></li>');
		$('#spotify-auth').click(function() {
			login();
		});
	};//injectSpotifyLogin
   
	function login() {
		var width = 400,
		height = 500;
		var left = (screen.width / 2) - (width / 2);
		var top = (screen.height / 2) - (height / 2);

		var params = {
			client_id: 'cacf8c9569be43b5ae5c183254abbb87',
			redirect_uri: 'http://ecmode.github.io/response',
			scope: 'playlist-modify playlist-modify-private playlist-read-private',
			response_type: 'token'
		};
		authWindow = window.open(
			"https://accounts.spotify.com/authorize?" + toQueryString(params),
			"Spotify",
			'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
		);
	}
	
	//client side doesn't have access to the refresh token
	function reauth(uri) {
		login();
		$(window).on('tokenReceived', function () {
			addToPlaylist(uri);
			$(this).unbind('tokenReceived');
		});
	}

    var playlistInfo = {};
    var accessToken = null;
    var userId = null;
    var targetPlaylist = null;
    var tokenTimer = 0;
	var countdownTool;
	var targetRegion = null; //available via user_info.country;  will have to work this in somehow...
	
	function addToPlaylist(uri) {
		if (tokenTimer <= 0){
			reauth(uri);
			return;
		}
		$.ajax({
			url: 'https://api.spotify.com/v1/users/' + userId + '/playlists/' + playlistInfo[targetPlaylist] + '/tracks',    
			contentType: 'application/json',
			data: JSON.stringify([uri]),
			type: 'POST',
			dataType: 'json',
			headers: {
				'Authorization': 'Bearer ' + accessToken
			},
			success: function(response) {
		
			}
		});
	}
	
	function getUserInfo() {
		//get user info, more importantly the user id
		$.ajax({
			url: 'https://api.spotify.com/v1/me',
			headers: {
				'Authorization': 'Bearer ' + accessToken
			},
			success: function(response) {
				//get playlist info, more importantly the playlist id
				userId = response.id.toLowerCase();
	    		buttonScript();
				getPlaylistInfo();
			}
		});
	}

	function getPlaylistInfo() {
		$.ajax({
			url: 'https://api.spotify.com/v1/users/' + userId + '/playlists',
			headers: {
				'Authorization': 'Bearer ' + accessToken
			},
			success: function(response) {
				if (Object.keys(playlistInfo).length > 0){
					return; //we already have playlist ids, not worrying about querying new lists...cause yeah...
				}
				var list = $('#playlist-info');
				for (var i = 0; i < response.items.length; i++){
					if (response.items[i].id === null){
						continue;
					}
					list.append('<li><a>' + response.items[i].name + '</a></li>')
					playlistInfo[response.items[i].name] = response.items[i].id;
				}
				list.delegate('li', 'click', function () {
					targetPlaylist = $(this).text();
					$('#spotify-auth-text').text('+' + targetPlaylist);
					if (($('.search')).length > 0){
						$('.search').removeClass('search').addClass('add');
						$('.SpotButton').unbind('click');
						$('.SpotButton').click(function (){
							addToPlaylist($(this).attr('uri-data'));
						});
					}
				});
				$('#spotify-auth-text').text('Select Playlist');
				$('#spotify-auth').unbind('click');
			}
		});
	}

    $('ul.tools').on('click', '.SpotButton', function() {
		spotGATracker('send', 'event', 'track-lookup-button', 'click', 'track-lookup', 1);
    });

	$(function(){
	    // Run it right away
		injectSpotifyLogin();
		window.addEventListener('message', receiveMessage);
	});

    $(document).ajaxComplete(function(event,request, settings){
		buttonScript();
    });
};

// Lets create the script objects
var injectedScript = document.createElement('script');
injectedScript.type = 'text/javascript';
injectedScript.text = '('+main+')("");';
(document.body || document.head).appendChild(injectedScript);

//Lets create the CSS object. This has to be done this way rather than the manifest.json
//because we want to override some of the CSS properties so they must be injected after.
var injectedCSS = document.createElement('link');
injectedCSS.type = 'text/css';
injectedCSS.rel = 'stylesheet';
injectedCSS.href = stylesheetUrl;
(document.body || document.head).appendChild(injectedCSS);
    
