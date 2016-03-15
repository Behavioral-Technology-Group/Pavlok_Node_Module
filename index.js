//For writing the token to the filesystem
var fs = require('fs');

//Open browser
var open = require('open');

//Run server to do OAuth
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//Passport for OAuth support
var passport = require('passport');
var oauth = require('passport-oauth');
var OAuth2Strategy = oauth.OAuth2Strategy;

//Request to query API
var request = require('request');




//'Constants' (can be altered with the options bundle/init)
var BASE_URL = "http://pavlok-mvp.herokuapp.com";
var PORT = 3000;
var TOKEN_FILENAME  = __dirname + "/pavlok-token.json";
var VERBOSE = false;
var SAVE = true;
var CLIENT_ID = null;
var CLIENT_SECRET = null;
var CALLBACK_URL = null;
var ALERT_TEXT = "Sent from Node Module.";




//Fields
var tokenFile = null; //A representation of the token file on disk
var signingIn = null; //Are we signing in?
var code = null; //The fetched auth code

var app; //The representation of the program
var server; //The Express server




/** Support functions **/
function log(msg){
    if(VERBOSE) console.log("[Pavlok API] " + msg);
}




/** Load the auth token from disk **/
function createTokenFile(){
    try {
        var skeletonObject = {
            token: null
        };
		tokenFile = skeletonObject;
        fs.writeFileSync(TOKEN_FILENAME, JSON.stringify(skeletonObject, null, 2));
    } catch(e) {
        throw "Can't access disk for saving token for Pavlok API!";
    }
}

function saveTokenFile(token){
    try {
        tokenFile.token = token;    
        code = token;
        signingIn = false;
        if(SAVE) fs.writeFileSync(TOKEN_FILENAME, JSON.stringify(tokenFile, null, 2));
    } catch(e) {
        throw "Can't access disk to save Pavlok auth token!";
    }
}

function clearTokenFile(){
    try {
        tokenFile.token = null;
        code = null;
        fs.unlinkSync(TOKEN_FILENAME);
    } catch(e) {
        throw "Couldn't delete auth token!";
    }
}

try {
    tokenFile = JSON.parse(fs.readFileSync(TOKEN_FILENAME, 'utf8'));
} catch (e) {
    try {
		createTokenFile();
		tokenFile = JSON.parse(fs.readFileSync(TOKEN_FILENAME, 'utf8'));
	} catch (ignored) {} //Will happen on systems without file I/O access
}

if(tokenFile.token != null){
    code = tokenFile.token;
}




/** Setup the Express server; used to handle OAuth2 results **/
app = express();
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());
app.get("/", 
	function(request, result)
	{
    result.redirect("index.html");
	});
app.get("/done",
	function(request, result)
	{
    result.redirect("done.html");
    if(code != null) server.close();
	});
app.get("/error", 
	function(request, result)
	{
    result.redirect("error.html");
	});
app.get("/auth/pavlok",
    passport.authenticate("oauth2",
    {
        "session": false,
        "failureRedirect": "/error"
    }));
app.get("/auth/pavlok/result",
    passport.authenticate("oauth2", 
    { 
        "session": false,
        "successRedirect": "/done",
        "failureRedirect": "/error"
    }));





//Exports
var exports = module.exports = {};

/**
  Setup the API for later use (via login, vibrate, etc.). Must be called before
  login to at least setup the client ID and client secret. 
 
  @param {String} Client ID - The OAuth2 client ID.
  @param {String} Client secret - The OAuth2 client secret.
  @param {Object} options - Custom setup options. Accepts a port ("port",
				 number), callback URL ("callbackUrl", string), a verbose 
			    debugging option ("verbose", boolean), an option to save
				the token ("save", boolean), and a default value for
				alert text ("message", string).
 **/
exports.init = function(cId, cSecret, options){
	if(cId !== undefined && cSecret != undefined && typeof cId == "string" 
		&& typeof cSecret == "string"){
		CLIENT_ID = cId;
		CLIENT_SECRET = cSecret;		

		if(options == undefined) options = {};

		if(options.save != undefined && typeof options.save == "boolean")
			SAVE = options.save;

		if(options.apiUrl !== undefined && 
			typeof options.callbackUrl == "string")
			BASE_URL = options.apiUrl;

		if(options.port !== undefined && typeof options.port == "number") 
            PORT = options.port;        
        
		if(options.callbackUrl !== undefined &&
			typeof options.callbackUrl == "string")
            CALLBACK_URL = options.callbackUrl;
        
		if(options.verbose !== undefined && typeof options.verbose == "boolean")
            VERBOSE = options.verbose; 

		if(options.message !== undefined && typeof options.message == "string")
			ALERT_TEXT = options.message;
	} else {
		console.log("Invalid init params!");	
	} 
}

/**
  Login into Pavlok's API. Note that this relies on Node being able to listen
  on port 3000 (or a port passed in init), and Node being able to write to 
  ./pavlok-token.json (assuming save isn't false).
  
  @param {Function} callback - Callback with two arrguments. First argument 
                               is true or false depending on success/failure,
                               and the second is the auth token on success.
 **/
exports.login = function(cId, cSecret, options, callback){
	if(typeof cId == "function"){ //New usage; we just pass in a callback
		callback = cId;
	} else {
    	//Setup from options first
    	if(typeof options == "function"){
			exports.init(cId, cSecret);
			callback = options;
		} else {
    		exports.init(cId, cSecret, options);
		}
    }

    if(CALLBACK_URL == null){
		CALLBACK_URL = "http://localhost:" + PORT + "/auth/pavlok/result";
    }

    if(code != null){
        log("Code loaded: " + code);
        callback(true, code);
        return;
    } else {
        if(SAVE) log("Unable to load code from disk; starting server...");
    }
        
    server = app.listen(PORT, function(){
        open("http://localhost:" + PORT + "/auth/pavlok");
    });
       
    passport.use(new OAuth2Strategy({
        authorizationURL: BASE_URL + "/oauth/authorize",
        tokenURL: BASE_URL + "/oauth/token",
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_URL
    },
    function(token, tokenRefresh, profile, done){
        if(token != null){
            if(SAVE) log("Saving " + token + " token to disk...");
            saveTokenFile(token);
            signingIn = false;
            callback(true, token);
        } else {
            log("Token not found!");
            saveTokenFile(null);
            signingIn = false;
            callback(false, null);
        }

        return done(null, {}); //No user object checking for Pavlok's API
    }));

    signingIn = true;
}

/**
  * Logout from this device. If you saved the auth token elsewhere, it
  * will still work.
  */  
exports.logout = function(){
    clearTokenFile();
}    

function genericCall(route, options){
	//Rejigger what's in opts if stuff has been omitted
	//Messy; .zap/.beep/etc. should've originally had options bundles, but
	//instead had args, leading to this mess...
	var intensityType = typeof options.intensity;
	var messageType = typeof options.message;
	var callbackType = typeof options.callback;

	if(intensityType != "undefined"){ //>= 1 opt
		if(messageType != "undefined"){ //>= 2 opts
			if(callbackType != "undefined"){ //3 opts
				//We're actually good if we have 3 opts -- no back. comp. issue
			} else { //Figure out what intensity and message _really_ are
				if(intensityType != "number"){ //A message, then
					options.callback = options.message;
					options.message = options.intensity;
					options.intensity = undefined;
				} else { //Only other bad combo is callback in message slot
					if(messageType == "function"){
						options.callback = options.message;
						options.message = undefined;
					}
				}
			}
		} else { //Just 1 opt -- figure out what it is and null all else
			var temp = options.intensity;
			options.intensity = undefined;
			options.callback = undefined;
			options.message = undefined;

			if(intensityType == "number"){
				options.intensity = temp;
			} else if (intensityType == "string"){
				options.message = temp;
			} else {
				options.callback = temp;
			}
		}
	}

    var message = ALERT_TEXT;
    if(options.message !== undefined && typeof options.message == "string"){
		message = options.message;		
    }
	var intensity = (route == "beep" ? 2 : 50);
	if(options.intensity !== undefined && typeof options.intensity == "number"){
		intensity = options.intensity;
	}
	var callback = function(res, reason){};
	if(options.callback !== undefined && typeof options.callback == "function"){
		callback = options.callback;
	}

    var address = BASE_URL + "/api/v1/stimuli/" + route + "/" + intensity;
	var queryParams = {
        access_token: code,
	    reason: message,
        time: new Date()
    };

    log("Trying to " + route + " with " + intensity + "...");
    
	//Verify parameter values
	if(signingIn){
        callback(false, "Please wait until login completes.");
        return;
    }

    if(code == null){
        callback(false, "Please login before using the API.");
        return;
    }

    if(route == "beep" && (intensity < 1 || intensity > 4)){
        callback(false, "Intensity must be between 1-4!");
        return;
    } else if (intensity < 1 || intensity > 255){
        callback(false, "Intensity must be between 1-255!");
		return;
    }

    request({
        url: address,
        qs: queryParams,
        method: 'POST',
    }, function(error, response, body){
        if(error){
            callback(false, error);
        } else {
            if (response.statusCode == 401) {
                clearTokenFile();
				code = null;
                callback(false, "Your auth token has expired!");
            } else if (response.statusCode == 200) {
                callback(true, route + " sent.");
            } else {
                callback(false, route + " returned unknown code: " + 
					response.statusCode + ".");
            }
        }
    });
}

/**
  * Beep a Pavlok.
  * @param value - The tone of beep, between 1-4.
  * @param message - The message to include with the stimuli.
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.beep = function(value, message, callback){
    genericCall("beep", {
		intensity: value, 
		message: message, 
		callback: callback
	});
}

/**
  * Vibrate a Pavlok.
  * @param value - The intensity of vibration between 1-255.
  * @param message - The message to include with the stimuli.
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.vibrate = function(value, message, callback){
    genericCall("vibration", {
		intensity: value,
		message: message,
		callback: callback
	});
}

/**
  * Zap with a Pavlok.
  * @param value - The intensity of zap, between 1-255.
  * @param message - The message to include with the stimuli.
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.zap = function(value, message, callback){
    genericCall("shock", {
		intensity: value, 
		message: message, 
		callback: callback
	});
}
