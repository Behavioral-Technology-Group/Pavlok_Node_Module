//Write token to filesystem
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

var BASE_URL = "http://pavlok-stage.herokuapp.com";
var PORT = 3000;
var TOKEN_FILENAME  = __dirname + "/pavlok-token.json";

//Support functions
function log(msg){
    if(verbose) console.log("[Pavlok API] " + msg);
}

//Setup auth token loading
var tokenFile;
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

function saveTokenFile(token){
    try {
        tokenFile.token = token;    
        code = token;
        signingIn = false;
        if(save) fs.writeFileSync(TOKEN_FILENAME, JSON.stringify(tokenFile, null, 2));
    } catch(e) {
        throw "Can't access disk to save Pavlok auth token!";
    }
}

var tokenFromFile = tokenFile.token;

var save = true;
var verbose = false;
var signingIn = false;
var code = null;
if(tokenFromFile != null){
    code = tokenFromFile;
}

//Setup Express server; used to handle OAuth2 results
var app = express();
var server;
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

app.get("/", function(request, result){
    result.redirect("index.html");
});

app.get("/done", function(request, result){
    result.redirect("done.html");
    if(code != null) server.close();
});

app.get("/error", function(request, result){
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
  Login into Pavlok's API. Note that this relies on Node being able to listen
  on port 3000 (or a port passed in options), and Node being able to write to 
  ./pavlok-token.json.
  
  @param {String} Client ID
  @param {String} Client secret
  @param {Object} options - Custom options for setup. Optional. Accepts
                            a port ("port", number), callback URL ("callbackUrl",
                            string), verbose debugging ("verbose", boolean) option. 
  @param {Function} callback - Callback with two arrguments. First argument 
                               is true or false depending on success/failure,
                               and the second is the auth token on success.
 **/
exports.login = function(cId, cSecret, options, callback){
    var callbackUrl = null;
    var port = PORT;
    
    //Setup from options
    if(options !== undefined && typeof options == "object"){
        if(options.save != undefined && typeof options.save == "boolean"){
			save = options.save;
		} else {
			save = true;
		}

		if(options.apiUrl !== undefined && typeof options.callbackUrl == "string")
			BASE_URL = options.apiUrl;

		if(options.port !== undefined && typeof options.port == "number") 
            port = options.port;        
        
		if(options.callbackUrl !== undefined && typeof options.callbackUrl == "string")
            callbackUrl = options.callbackUrl;
        
		if(options.verbose !== undefined && typeof options.verbose == "boolean")
            verbose = options.verbose; //Sets a global; persists after login
    } else {
        //Options has been left out; options is callback
        callback = options;
    }

    if(callbackUrl == null){
        callbackUrl = "http://localhost:" + port + "/auth/pavlok/result";
    }

    if(code != null){
        log("Code loaded: " + code);
        callback(true, code);
        return;
    } else {
        if(save) log("Unable to load code from disk; starting server...");
    }
        
    server = app.listen(port, function(){
        open("http://localhost:" + port + "/auth/pavlok");
    });
       
    passport.use(new OAuth2Strategy({
        authorizationURL: BASE_URL + "/oauth/authorize",
        tokenURL: BASE_URL + "/oauth/token",
        clientID: cId,
        clientSecret: cSecret,
        callbackURL: callbackUrl
    },
    function(token, tokenRefresh, profile, done){
        if(token != null){
            if(save) log("Saving " + token + " token to disk...");
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

function genericCall(route, intensity, callback){
    var address = BASE_URL + "/api/v1/stimuli/"
            + route + "/" + intensity;
    var queryParams = {
            access_token: code,
            time: new Date()
    };

    log("Trying to " + route + " with " + intensity + "...");
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
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.beep = function(value, callback){
    genericCall("beep", value, callback);
}

/**
  * Vibrate a Pavlok.
  * @param value - The intensity of vibration between 1-255.
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.vibrate = function(value, callback){
    genericCall("vibration", value, callback);
}

/**
  * Zap with a Pavlok.
  * @param value - The intensity of zap, between 1-255.
  * @param callback - A callback for success, with two arguments:
                      a success boolean, and a message.
  */
exports.zap = function(value, callback){
    genericCall("shock", value, callback);
}
