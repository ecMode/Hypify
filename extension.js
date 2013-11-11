// Extension main script
// Purpose of the extension is to auto query hype machine tracks to see if they exist in spotify
// As of now I don't see any methods to add to playlist
var stylesheetUrl = chrome.extension.getURL("hypestyles.css");

// This is all the JS that will be injected in the document body
var main = function() {
    /**
    * Return outerHTML for the first element in a jQuery object,
    * or an empty string if the jQuery object is empty;  
    */
    jQuery.fn.outerHTML = function() {
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

    var checkArtist = function (artistQuery, artistArray){
        var re = new RegExp(artistQuery, "gi");
        for ( var i in artistArray ) {
            if (artistArray[i].name.match(re)) {
                console.log(artistArray[i].name);
                return artistArray[i].name;
            }
        }
        return null;
    }
    var generator = function()
    {
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
    var starString = generator();
    var css = document.createElement('style');
    css.type = 'text/css';
    var styles = '.' + starString;
    styles += '.arrow:hover .'+ starString +'{ border-top: 10px solid #0063DC; }';
     
    //done this way for IE aparantly.
    if (css.styleSheet) 
        css.styleSheet.cssText = styles;
    else 
        css.appendChild(document.createTextNode(styles) );
    document.getElementsByTagName("head")[0].appendChild(css);    
	// Adds a button next to each track that had matching spotify queries
	var buttonScript = function() {
		// Wait for the tracks script to load
		var tracks = window.displayList['tracks'];
		 
        if (tracks === undefined || tracks.length < 1) {
		 	setTimeout(buttonScript, 1);
		} 
        else {
		    // Check if this particular page has been processed
		    // through a previous call
            if (jQuery('.dl').length < tracks.length) {
				jQuery('ul.tools').each(function(index, track) {
                    var song = tracks[index];
                    var title = song.song;
                    var parens = title.indexOf("(");
                    //strip the parens which usually indicates someone adding additional details in the song title
                    if (parens > 0)
                        title = title.substring(0, parens);
                    var artist = song.artist;
                    var id = song.id;
                    var key = song.key;
                    var hasButton = jQuery(track).data("hasButton");
                    if (typeof(hasButton) === 'undefined' || !hasButton){
                        jQuery.ajax({
                            url: "http://ws.spotify.com/search/1/track.json?q=" + title,
                            crossDomain: true, 
                            success: function (data) {
                                var jsonResult = data;
                                // Reasonable to say that if the artist isn't available on the first page he isn't there
                                var queryTracks = jsonResult.tracks;
                                for ( var i in queryTracks ) {
                                    if (queryTracks[i].name.match(title) && checkArtist(artist, queryTracks[i].artists) !== null) {
                                        var spot_button  = document.createElement("a");
                                        spot_button.target = "_top";
                                        spot_button.className = "SpotButton";
                                        spot_button.innerHTML = '<table class="arrow"><tr><td><div class="spot-star"></div></td></tr><tr><td class="' + starString + '"></td></tr></table>';
                                        jQuery(track).prepend('<li class="dl"><table class="spacer"></table>' + jQuery(spot_button)[0].outerHTML + '</li>');
                                        break;
                                    }
                                }
                            }
                        });
                        jQuery(track).data("hasButton", true);
                    }
                });//each		
            }
        }
    };//buttonscript
	
	// Run it right away
	buttonScript();
  
    jQuery(document).ajaxComplete(function(event,request, settings){
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
