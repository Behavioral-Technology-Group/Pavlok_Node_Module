//For writing the token to the filesystem
var fs = require("fs");

//Open browser
var open = require("open");

//Run a server to do OAuth
var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");

//For keeping up a session
var cookieSession = require("cookie-session");

//Request to query API
var request = require("request");

//'Constants' (can be altered with the options bundle/init)
var BASE_URL = "http://pavlok-mvp.herokuapp.com";
var PORT = 3000;
var TOKEN_FILENAME = __dirname + "/pavlok-token.json";
var VERBOSE = false;
var SAVE = true;
var CLIENT_ID = null;
var CLIENT_SECRET = null;
var CALLBACK_URL = null;
var CALLBACK_URL_STUB = null;
var ALERT_TEXT = "Sent from Node Module.";

//Shared fields
var isInited = false;
var isServer = false;
var app;

//Fields for usage as server
var successUrl = "/success";
var failureUrl = "/failure";
var successWithCode = false;

//Fields for usage as client
var isSigningIn = false; //Are we signing in?
var tokenFile = null; //A representation of the token file on disk
var code = null; //The fetched auth code
var loginCallback = null;

function middlewareExists(app, name) {
  //From http://stackoverflow.com/questions/26304234/check-if-a-given-middleware-is-being-used
  //filter checks each element, and !! converts filter's return type (an array of booleans) to
  //a boolean type

  if (!app._router) {
    return false;
  }

  return !!app._router.stack.filter(function (layer) {
    return layer && layer.handle && layer.handle.name === name;
  }).length;
}

function log(msg) {
  if (VERBOSE) console.log("[Pavlok API] " + msg);
}

function logErr(msg) {
  console.log("[Pavlok API/Error] " + msg);
}

function createTokenFile() {
  try {
    var skeletonObject = {
      token: null,
    };
    tokenFile = skeletonObject;
    fs.writeFileSync(TOKEN_FILENAME, JSON.stringify(skeletonObject, null, 2));
  } catch (e) {
    throw "Can't access disk for saving token for Pavlok API!";
  }
}

function saveTokenFile(token) {
  try {
    tokenFile.token = token;
    code = token;
    if (SAVE)
      fs.writeFileSync(TOKEN_FILENAME, JSON.stringify(tokenFile, null, 2));
  } catch (e) {
    throw "Can't access disk to save Pavlok auth token!";
  }
}

function clearTokenFile() {
  try {
    tokenFile.token = null;
    code = null;
    fs.unlinkSync(TOKEN_FILENAME);
  } catch (e) {
    throw "Couldn't delete auth token!";
  }
}

//Exports
var exports = (module.exports = {});

/**
  Setup the API for later use (via login, vibrate, etc.). Must be called before
  login or auth to at least setup the client ID and client secret. 
 
  @param {String} Client ID - The OAuth2 client ID.
  @param {String} Client secret - The OAuth2 client secret.
  @param {Object} options - Custom setup options. There are several possible
		options, depending on the type of setup.
	   
		Shared between client/server:
		- apiUrl (string, optional) - The Pavlok API to query (default is fine).
		- verbose (boolean, optional) - Whether to enable verbose logging.
		- message (string, optional) - The default message to send with stimuli.
		- app (object, optional) - The Express app to setup to be a server. If
			present, the module will setup in server mode; if not, the module will
			setup in local mode.

		In server mode:
		- callbackUrl (string) - The callback URL associated with your CID/CSecret.
		- callbackUrlStub (string) - The path of your callback URL relative to 
			your root (e.g. "/pavlok/postauth").
		- successPath (string) - The relative path to redirect to after a 
			successful authorization.
		- failurePath (string) - The relative path to redirect to after a 
			failed authorization.
		- handleSessions (boolean, optional) - Whether the module should setup
			a request.session(...) for you. Defaults to true. If you do this 
			yourself, you must make sure request.session exists for this module
			to use.
		- sessionSecret (string, optional) - The secret to secure a user's 
			session with.

		In client mode (note that in client mode, the callback URL you must
		register with your client ID/client secret is
	   	"http://localhost:PORT_YOU_CHOOSE/auth/pavlok/result".
		- save (boolean, optional) - Whether to save access tokens between sessions.
		- tokenFile (string, optional) - The name of the token file.
		- port (number, optional) - The port to run the client server for fetching
			auth tokens on. Defaults to 3000; running under 1024 might need root
			priveleges on some systems. 
 **/
exports.init = function (cId, cSecret, options) {
  if (
    cId == undefined ||
    cSecret == undefined ||
    typeof cId != "string" ||
    typeof cSecret != "string"
  ) {
    logErr("No client ID or client secret provided!");
    return;
  }

  CLIENT_ID = cId;
  CLIENT_SECRET = cSecret;

  if (options == undefined || typeof options != "object") options = {};

  //Fields shared between both modes
  if (options.apiUrl !== undefined && typeof options.apiUrl == "string")
    BASE_URL = options.apiUrl;

  if (options.verbose !== undefined && typeof options.verbose == "boolean")
    VERBOSE = options.verbose;

  if (options.message !== undefined && typeof options.message == "string")
    ALERT_TEXT = options.message;

  if (options.app != undefined) {
    log("Initing server...");

    isServer = true;
    app = options.app;

    //Setup needed middleware
    if (!middlewareExists(app, "jsonParser")) {
      app.use(bodyParser.json());
    }
    if (!middlewareExists(app, "cookieParser")) {
      app.use(cookieParser());
    }

    //Setup matching options
    if (
      options.callbackUrl !== undefined &&
      typeof options.callbackUrl == "string"
    ) {
      CALLBACK_URL = options.callbackUrl;
    } else {
      logErr(
        "callbackUrl must not be null for server apps; there is no default value!"
      );
      return;
    }

    if (
      options.callbackUrlPath !== undefined &&
      typeof options.callbackUrlPath == "string"
    ) {
      CALLBACK_URL_STUB = options.callbackUrlPath;
    } else {
      logErr(
        "callbackUrlPath must not be null for server apps; there is no default value!"
      );
      return;
    }

    var sessionSecret = "whywouldyouusethis";
    if (
      options.sessionSecret != undefined &&
      typeof options.sessionSecret == "string"
    ) {
      sessionSecret = options.sessionSecret;
    }

    //Setup server to handle sessions, if needed
    if (
      options.handleSessions == undefined ||
      typeof options.handleSessions != "boolean" ||
      options.handleSessions
    ) {
      log("Internally handling sessions...");
      app.use(
        cookieSession({
          name: "session",
          keys: [sessionSecret],
        })
      );
    } else {
      log(
        "You're handling sessions on your own! Make sure you know what you're doing."
      );
    }

    if (
      options.successPath !== undefined &&
      typeof options.successPath == "string"
    ) {
      successUrl = options.successPath;
    } else {
      successUrl = "/";
    }

    if (options.successWithCode !== undefined && options.successWithCode) {
      successWithCode = true;
    }

    if (
      options.errorPath !== undefined &&
      typeof options.errorPath == "string"
    ) {
      errorUrl = options.errorPath;
    } else {
      errorUrl = "/error";
    }

    //Setup callback URL
    app.get(CALLBACK_URL_STUB, function (req, res) {
      //See if there's a code in here
      if (req.query.code == null || req.query.code.length == 0) {
        res.redirect(errorUrl);
        return;
      }

      //Perform a request to /oauth/token to get the authentication token
      var address = BASE_URL + "/oauth/token";
      var queryParams = {
        code: req.query.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK_URL,
      };

      request(
        {
          url: address,
          qs: queryParams,
          method: "POST",
        },
        function (error, response, body) {
          if (error) {
            try {
              logErr(JSON.stringify(error));
            } catch (e) {}
            res.redirect(errorUrl);
          } else {
            var codeResponse = JSON.parse(body);
            
            var token = codeResponse.access_token;

            req.session.pavlok_token = token;
            req.session.pavlok_user = codeResponse;
            //Redirect to done
            res.redirect(
              successUrl + (successWithCode ? "?code=" + token : "")
            );
          }
        }
      );
    });
  } else {
    log("Initing client...");

    isServer = false;

    //Load fields
    if (options.save != undefined && typeof options.save == "boolean")
      SAVE = options.save;

    if (options.port !== undefined && typeof options.port == "number")
      PORT = options.port;

    CALLBACK_URL = "http://localhost:" + PORT + "/auth/pavlok/result";

    if (options.tokenFile !== undefined && typeof options.tokenFile == "string")
      TOKEN_FILENAME = options.tokenFile;

    //Load token file from the disk (regardless of SAVE, we still try to read)
    try {
      tokenFile = JSON.parse(fs.readFileSync(TOKEN_FILENAME, "utf8"));
    } catch (e) {
      try {
        createTokenFile();
        tokenFile = JSON.parse(fs.readFileSync(TOKEN_FILENAME, "utf8"));
      } catch (ignored) {} //Will happen on systems without file I/O access
    }

    if (tokenFile.token != null) {
      code = tokenFile.token;
    }

    //Setup app object
    app = express();
    app.use(express.static(__dirname + "/public"));
    app.use(cookieParser());
    app.use(bodyParser.json());

    app.get("/auth/pavlok", function (req, res) {
      res.redirect(
        BASE_URL +
          "/oauth/authorize?client_id=" +
          CLIENT_ID +
          "&redirect_uri=" +
          CALLBACK_URL +
          "&response_type=code"
      ); //Redirect to Pavlok server to authorize
    });
    app.get("/auth/pavlok/result", function (req, res) {
      //See if there's a code in here
      if (req.query.code == null || req.query.code.length == 0) {
        res.send(
          "You've rejected the request to authenticate. Please try again."
        );
        server.close();
        return;
      }

      //Perform a request to /oauth/token to get the authentication token
      var address = BASE_URL + "/oauth/token";
      var queryParams = {
        code: req.query.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK_URL,
      };

      request(
        {
          url: address,
          qs: queryParams,
          method: "POST",
        },
        function (error, response, body) {
          if (error) {
            try {
              logErr(JSON.stringify(error));
            } catch (e) {}
            res.redirect("/error");
            server.close();
            loginCallback(false, null);
          } else {
            var codeResponse = JSON.parse(body);
            var token = codeResponse.access_token;

            code = token;
            saveTokenFile(code);

            //Redirect to done
            res.redirect("/done");
            server.close();
            loginCallback(true, code);
          }
        }
      );
    });
    app.get("/", function (request, result) {
      result.redirect("index.html");
    });
    app.get("/done", function (request, result) {
      result.redirect("done.html");
    });
    app.get("/error", function (request, result) {
      result.redirect("error.html");
    });
  }

  isInited = true;
};

/**
  Login into Pavlok's API. Note that this relies on Node being able to listen
  on port 3000 (or a port passed in init), and Node being able to write to 
  ./pavlok-token.json (assuming save isn't false). If we're in server mode,
  this will fail.
  
  @param {Function} callback - Callback with two arrguments. First argument 
                               is true or false depending on success/failure,
                               and the second is the auth token on success.
 **/
exports.login = function (callback) {
  if (!isInited) {
    logErr("You must call pavlok.init(...) first.");
    return;
  }
  if (isServer) {
    logErr("Login is invalid when running as a server!");
    return;
  }
  if (isSigningIn) {
    logErr("You can't login while trying to login.");
    return;
  }

  if (code != null) {
    log("Code loaded from disk: " + code);
    callback(true, code);
    return;
  }

  server = app.listen(PORT, function () {
    log("Server listening now...");
    open("http://localhost:" + PORT + "/auth/pavlok");
  });
  loginCallback = callback;
  isSigningIn = true;
};

/*
 * Sign the user in to Pavlok from server mode.
 * @param request - The Express request.
 * @param result - The Express result.
 */
exports.auth = function (request, result, options) {
  if (!isServer) {
    logErr("Auth called in local mode!");
    return;
  }
  result.redirect(
    BASE_URL +
      "/oauth/authorize?client_id=" +
      CLIENT_ID +
      "&redirect_uri=" +
      CALLBACK_URL +
      "&response_type=code"
  ); //Redirect to Pavlok server to authorize
};

/*
 * A "guard" function that tests whether a user is logged in. 
 * @param request - The Express request. 
 * @param result - The Express result. Only needed if being used as middleware.
 * @param next - The next piece of middleware. Again, only needed if being used
				 as middleware.
 * @return - Returns whether user is logged in. If used as middleware, will
			 automatically call auth with "/pavlok/success" and
			 "/pavlok/failure" success/error redirect paths.
 */
exports.isLoggedIn = function (request, result, next) {
  if (
    request.session.pavlok_token !== undefined &&
    request.session.pavlok_token != null
  ) {
    if (next !== undefined) {
      next();
    } else {
      return true;
    }
  } else {
    if (next !== undefined) {
      next();
    } else {
      return false;
    }
  }
};

/**
 * Logout from this device. If you're in local mode, this takes no arguments,
 * but in server mode, it takes one parameter, the user's request.
 */
exports.logout = function (request) {
  if (!isServer) {
    clearTokenFile();
  } else {
    //Remove cookie from session
    if (request == undefined || typeof request != "object") {
      logErr("No request object provided to logout in!");
    } else {
      request.session.pavlok_token = null;
    }
  }
};

function genericCall(route, options) {
  var message = ALERT_TEXT;
  if (options.message !== undefined && typeof options.message == "string") {
    message = options.message;
  }
  var intensity = 127;
  if (options.intensity !== undefined && typeof options.intensity == "number") {
    intensity = options.intensity;
  }
  var callback = function (res, reason) {};
  if (options.callback !== undefined && typeof options.callback == "function") {
    callback = options.callback;
  }
  var count = 1;
  if (options.count !== undefined && typeof options.callback == "number") {
    count = options.count;
  }
  var pattern = "beep-vibrate";
  if (
    options.pattern !== undefined &&
    typeof options.pattern == "object" &&
    options.pattern.length !== undefined &&
    options.pattern.length > 0
  ) {
    pattern = "";
    for (var i = 0; i < options.pattern.length; i++) {
      if (options.pattern[i] == "zap") options.pattern[i] = "shock";
      if (
        options.pattern[i] != "shock" &&
        options.pattern[i] != "vibrate" &&
        options.pattern[i] != "beep"
      ) {
        callback(
          false,
          "Invalid pattern stimuli type of: " + options.pattern[i]
        );
        return;
      }
      pattern += options.pattern[i];
      if (i !== options.pattern.length - 1) pattern += "-";
    }
  }

  var token = null;
  if (isServer) {
    if (options.code != undefined && typeof options.code == "string") {
      token = options.code;
    } else if (
      options.request == undefined ||
      typeof options.request != "object"
    ) {
      callback(false, "No request object provided!");
      return;
    } else {
      if (options.request.session.pavlok_token != undefined) {
        token = options.request.session.pavlok_token;
      }
    }
  } else {
    token = code;
  }

  var address = BASE_URL + "/api/v1/stimuli/" + route + "/" + intensity;
  if (route == "pattern") {
    address =
      BASE_URL +
      "/api/v1/stimuli/" +
      route +
      "/" +
      pattern +
      "/" +
      intensity +
      "/" +
      count;
  }
  var queryParams = {
    access_token: token,
    reason: message,
    time: new Date(),
  };

  log("Trying to " + route + " with " + intensity + "...");

  //Verify parameter values
  if (token == null) {
    callback(false, "Please login before using the API.");
    return;
  }
  if (intensity < 1 || intensity > 255) {
    callback(false, "Intensity must be between 1-255!");
    return;
  }
  if (count < 1) {
    callback(false, "Count must be greater than or equal to 1!");
  }

  request(
    {
      url: address,
      qs: queryParams,
      method: "POST",
    },
    function (error, response, body) {
      if (error) {
        callback(false, error);
      } else {
        if (response.statusCode == 401) {
          if (!isServer && SAVE) clearTokenFile();
          code = null;
          callback(false, "Your auth token has expired!");
        } else if (response.statusCode == 200) {
          callback(true, route + " sent.");
        } else {
          callback(
            false,
            route + " returned unknown code: " + response.statusCode + "."
          );
        }
      }
    }
  );
}

/**
  * Send a pattern to a Pavlok.
  * @param options - Ways to adjust the pattern, all optional except
	for request if you're running as a server. intensity is a number
	from 1-255 that controls the stimuli's intensity, message is a 
	string that controls the message sent with the stimuli, callback
	is the callback after the stimuli's completion (i.e. a function
	that takes two arguments, a boolean indicating success/failure, and
	a string with the completion message), count is the number of times
	to repeat the pattern, pattern is the pattern as an array of strings
	(e.g. [ "beep", "zap", "vibrate"]), and request is the Express
	request if you're running as a server.
  */

exports.pattern = function (options) {
  if (options == undefined) options = {};
  genericCall("pattern", {
    intensity: options.value,
    message: options.message,
    callback: options.callback,
    code: options.code,
    request: options.request,
    count: options.count,
    pattern: options.pattern,
  });
};

/**
  * Beep a Pavlok.
  * @param options - Ways to adjust the beep, all optional except
	for request if you're running as a server. intensity is a number
	from 1-255 that controls the stimuli's intensity, message is a 
	string that controls the message sent with the stimuli, callback
	is the callback after the stimuli's completion (i.e. a function
	that takes two arguments, a boolean indicating success/failure, and
	a string with the completion message), and request, the Express
	request if you're running as a server.
  */
exports.beep = function (options) {
  if (options == undefined) options = {};
  genericCall("beep", {
    intensity: options.value,
    message: options.message,
    callback: options.callback,
    request: options.request,
    code: options.code,
  });
};

/**
  * Vibrate a Pavlok.
  * @param value - The intensity of vibration between 1-255.
  * @param options - Ways to adjust the vibration, all optional except
	for request if you're running as a server. intensity is a number
	from 1-255 that controls the stimuli's intensity, message is a 
	string that controls the message sent with the stimuli, callback
	is the callback after the stimuli's completion (i.e. a function
	that takes two arguments, a boolean indicating success/failure, and
	a string with the completion message), and request, the Express
	request if you're running as a server.
 */
exports.vibrate = function (options) {
  if (options == undefined) options = {};
  genericCall("vibration", {
    intensity: options.value,
    message: options.message,
    callback: options.callback,
    request: options.request,
    code: options.code,
  });
};

/**
  * Zap with a Pavlok.
  * @param options - Ways to adjust the zap, all optional except
	for request if you're running as a server. intensity is a number
	from 1-255 that controls the stimuli's intensity, message is a 
	string that controls the message sent with the stimuli, callback
	is the callback after the stimuli's completion (i.e. a function
	that takes two arguments, a boolean indicating success/failure, and
	a string with the completion message), and request, the Express
	request if you're running as a server.
  */
exports.zap = function (options) {
  if (options == undefined) options = {};
  genericCall("shock", {
    intensity: options.value,
    message: options.message,
    callback: options.callback,
    request: options.request,
    code: options.code,
  });
};

exports.me = function (options, callback) {
  var route = "";

  var token = null;
  if (isServer) {
    if (options.code != undefined && typeof options.code == "string") {
      token = options.code;
    } else if (
      options.request == undefined ||
      typeof options.request != "object"
    ) {
      callback(false, "No request object provided!");
      return;
    } else {
      if (options.request.session.pavlok_token != undefined) {
        token = options.request.session.pavlok_token;
      }
    }
  } else {
    token = code;
  }

  var address = BASE_URL + "/api/v1/me";
  var queryParams = {
    access_token: token,
    time: new Date(),
  };

  log("Getting User Details...");

  request(
    {
      url: address,
      qs: queryParams,
      method: "GET",
    },
    function (error, response, body) {
      if (error) {
        callback(false, error);
      } else {
        if (response.statusCode == 401) {
          if (!isServer && SAVE) clearTokenFile();
          code = null;
          callback(false, "Your auth token has expired!");
        } else if (response.statusCode == 200) {
          callback(true, response);
        } else {
          callback(
            false,
            route + " returned unknown code: " + response.statusCode + "."
          );
        }
      }
    }
  );
};

exports.steps = function (callback) {
  var route = "";

  var token = null;
  if (isServer) {
    if (options.code != undefined && typeof options.code == "string") {
      token = options.code;
    } else if (
      options.request == undefined ||
      typeof options.request != "object"
    ) {
      callback(false, "No request object provided!");
      return;
    } else {
      if (options.request.session.pavlok_token != undefined) {
        token = options.request.session.pavlok_token;
      }
    }
  } else {
    token = code;
  }

  var address = "https://pavlok-mvp.herokuapp.com/api/v2/fitness/steps";
  var queryParams = {
    access_token: token,
    from: "2020-08-01",
    to: "2020-09-30",
  };

  log("Getting User Steps Details...");

  request(
    {
      url: address,
      qs: queryParams,
      method: "GET",
    },
    function (error, response, body) {
      if (error) {
        callback(false, error);
      } else {
        if (response.statusCode == 401) {
          if (!isServer && SAVE) clearTokenFile();
          code = null;
          callback(false, "Your auth token has expired!");
        } else if (response.statusCode == 200) {
          callback(true, response);
        } else {
          callback(
            false,
            route + " returned unknown code: " + response.statusCode + "."
          );
        }
      }
    }
  );
};
