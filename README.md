# Pavlok API Module

### Purpose
The Pavlok module makes it easy to play with your Pavlok through a Node
enabled environment. If you're using Node as a server, you should look
towards the Pavlok documentation.

### Authentication
`
var pavlok = require('pavlok-api');
pavlok.login(function(result){
    if(result){
        doCoolStuff();
    } else {
        console.log("Sign in failed!");
    }
});
`
### Use
Each API function is single-shot, and, if they fail, fail silently. 

-  Zapping: `pavlok.zap(100); //Intensity from 0-255`
-  Beeping: `pavlok.beep(100); //Beep from 0-255`
-  Vibrating:  `pavlok.vibrate(100); //Vibrate from 0-255`

### License
Licensed under the ISC license. 
