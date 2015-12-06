# Pavlok API Module

### Purpose
The Pavlok module makes it easy to play with your Pavlok through a Node
enabled environment. 

Using this module requires:
-  Permission to listen on port 3000
-  A client ID/client secret; see [here](http://pavlok-mvp.herokuapp.com/oauth/applications) and login with your Pavlok account to get one. You'll need to choose a callback URL of "http://localhost:3000/auth/pavlok/result".
-  A web browser
-  Permission to write to the file system (to save the auth token).

If you're using Node as a server, you should look towards the Pavlok 
documentation; this module is meant for desktop scripting. However,
it would be easily adapted for that purpose.

### Authentication
```
var pavlok = require('pavlok-api');
pavlok.login(clientId, clientSecret, useVerboseDebugging,
    function(result, code){
        if(result){
            console.log("Your code is: " + code);
            doCoolStuff();
        } else {
            console.log("Sign in failed!");
        }
    });
```

### Use
Each API function is single-shot, and, if they fail on the device they're
sent to, fail silently. However, messages not delivered to the API will
generate an error.

The callback format is:

```
function callback(success, message){
    if(success){
        //It worked
    } else {
        //It didn't; useful information might be in the message.
    }
}
```

-  Zapping: `pavlok.zap(intensity, callback); //Intensity from 1-255`
-  Beeping: `pavlok.beep(tone, callback); //Beep from 1-4`
-  Vibrating:  `pavlok.vibrate(intensity, callback); //Vibrate from 1-255`

### License
Licensed under the ISC license. 
