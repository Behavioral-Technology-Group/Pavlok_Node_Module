# Pavlok API Module

### Purpose
The Pavlok module makes it easy to play with your Pavlok through a Node enabled environment (local mode), and also to run simple Express web apps integrated with Pavlok (server mode).

Using this module requires permission to listen on one of your computer's ports (local mode only) or permission to run a server (server mode only) and a client ID/client secret. See [here](http://pavlok-mvp.herokuapp.com/oauth/applications) and login with your Pavlok account to get one. You'll need to choose a callback URL of "http://localhost:3000/auth/pavlok/result" for local mode (or some variation of that with a different port), though custom callback URLs are supported (and required!) for server mode.

### Setup
```
npm install --save pavlok-beta-api-login
```
```
var pavlok = require('pavlok-beta-api-login');
```

### Authentication (Server)
```
//This must be done before the server starts listening!
pavlok.init("clientId", 
			"clientSecret", {
	"verbose": true,
	"app" : app, //Express server
	"message": "Hello from the server example!", //Default message for all stimuli
	"callbackUrl": "http://www.myserver.com/pavlok/result", 
	"callbackUrlPath": "/pavlok/result",
	"successUrl": "/success", //Where to redirect when the token has been saved to session
	"errorUrl": "/error" //Where to redirect when the token couldn't be gotten/saved
});
app.get("/auth", function(req, res){ //
	pavlok.auth(req, res);
});
```

### Authentication (Local)
```
pavlok.init("clientId", 
			"clientSecret", {
	"port": 3000 //Port to run the auth token accepting server on
});
pavlok.login(function(result, code){
	if(result){
		console.log("Code is " + code);
		pavlok.zap({
			"message": "Hello!",
			"callback": 
				function(result, message){
					console.log(result + " " + message);
				}
		});
	}
});
```

### Sending Stimuli
Each stimuli function is single-shot, and, if they fail on the device they're sent to, fail silently. However, messages not delivered to the API will generate an error.

Each stimuli is passed an options object, which may be empty. The object can contain `intensity`, a number from 1-255, `callback`, a function with format:

```
function callback(success, message){
    if(success){
        //It worked
    } else {
        //It didn't; useful information might be in the message.
    }
}
```
and `message`, a message to include with the stimuli.

Zapping is done with `pavlok.zap(opts);`.

Beeping is achieved with `pavlok.beep(opts);`.

Vibrating is done with `pavlok.vibrate(opts);`. 

Patterns are done with `pavlok.pattern(opts);`, with the special fields `pattern` and count in opts. `pattern` should be an array of strings (`beep`, `vibrate`, and `zap`) representing the pattern you wish to send. `count` is the number of times the pattern should be repeated.

### Further Reading
See the [full documentation](https://github.com/Behavioral-Technology-Group/Pavlok_Node_Module/wiki) and [examples](https://github.com/Behavioral-Technology-Group/Pavlok-Node-Samples) for full documentation and a walkthrough. 

### Notes for Users Coming from Versions < 2
Though simliar, older versions of the module use slightly different syntax.
All the stimuli messages (`zap`, `beep`, etc.) now take their arguments in a 
single object with named parameters instead of the old ordered argument list.
Versions before 2 also didn't support server mode of the `pattern` option.

### License
Licensed under the ISC license. 
