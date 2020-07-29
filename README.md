# Pavlok API Module

### Purpose
The Pavlok module makes it easy to play with your Pavlok device.

It works in two modes
- local development mode
- server mode

#### Local Mode 

It can be used to play around with your device in a local development environment. It spins up a simple express server and needs permission to listen on one of your system's port.

#### Server Mode

It can be used to plug the module into your existing express server and build features/workflows for your pavlok device. 

### Installation

#### Using NPM

```
npm install --save pavlok
```

#### Using YARN

```
yarn add pavlok
```
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
	}
});
```

### Further Reading
See the [full documentation](https://github.com/Behavioral-Technology-Group/Pavlok_Node_Module/wiki) and [examples](https://github.com/Behavioral-Technology-Group/Pavlok-Node-Samples) for full documentation and a walkthrough. 

### Notes for Users Coming from Versions < 2
Though simliar, older versions of the module use slightly different syntax.
All the stimuli messages (`zap`, `beep`, etc.) now take their arguments in a 
single object with named parameters instead of the old ordered argument list.
Versions before 2 also didn't support server mode of the `pattern` option.

### License
Licensed under the ISC license. 
