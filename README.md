# Pavlok API Module

### Purpose
The Pavlok module makes it easy to play with your Pavlok through a Node
enabled environment. 

Using this module requires: Permission to listen on one of your computer's ports, a client ID/client secret; see [here](http://pavlok-mvp.herokuapp.com/oauth/applications) and login with your Pavlok account to get one. You'll need to choose a callback URL of "http://localhost:3000/auth/pavlok/result" (custom callback URLs are also supported; see below), and an installed web browser.

If you're using Node as a server, you should look towards the Pavlok 
documentation; this module is meant for desktop scripting. However,
it can be easily adapted for that purpose if you wish.

### Authentication
```
pavlok.init(clientId, clientSecret);
pavlok.login(function(result, code){
        if(result){
            console.log("Your code is: " + code); //You don't need to save it
	    pavlok.beep(); //Should beep the signed-in account's Pavlok
        } else {
            console.log("Sign in failed!");
        }
    });
```
If you like, you may also pass an options object to `init(...)`. It takes 
in `port`, a number, `callbackUrl`, a custom callback URL after the OAuth
is done, `save`, a boolean value that lets you choose whether to save the 
auth code, `verbose`, a boolean value for whether you'd like debugging
output, and `message`, a string value for the default message to send with 
stimuli.

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
Zapping is done with `pavlok.zap(intensity, message, callback); //Intensity from 1-255`. 
Beeping is achieved with `pavlok.beep(tone, message, callback); //Beep from 1-4`.
Vibrating is done with `pavlok.vibrate(intensity, message,  callback); //Vibrate from 1-255`.
You may omit any of the parameters if you wish.

### Walkthrough
Writing a script using this module is a pretty straightfoward process. Keep in 
mind the requirements and limiations documents under the 'Purpose' heading, but
if you're looking to do some simple scripting, you should be in for a pretty 
easy ride.

To get started, you're going to need credentials for the Pavlok API. You need to get started at the [Pavlok website](http://pavlok-mvp.herokuapp.com) by creating an account or signing in. The next step is to go [here](http://pavlok-mvp.herokuapp.com/oauth/applications), click 'New Application', and give it a name. In the field labeled Redirect URI, set the first line to "urn:ietf:wg:oauth:2.0:oob" and the second line to 'http://localhost:3000/auth/pavlok/result' (you can also use a custom redirect URI so long as you reference its port and name in the optional options object passed to login(...)). You should be able to click on the app's name from the Application page to see its client ID and client secret (copy these down, and don't share them!).

After setting this up, you'll need to create a Node module
(`npm init` from your terminal/command line). Next, download the
Pavlok module ('npm install --save pavlok-beta-api-login'). Create a .js 
file (e.g. `index.js`), and require Pavlok (`var pavlok = require('pavlok-beta-api-login').

Copy the code under the authentication header, substituing in your client ID 
and secret. Once the callback returns, you're ready to start using 
Pavlok stimuli as described under the 'Use' header.

### Notes for Users Coming from Versions <= 1.3.0
1.3.0 and before were connected to a different server than successive versions (that
now closely mirror the server connected to the mobile apps). Please refollow the 
instructions in the walkthrough to create your OAuth app details on the different
server so you can fetch a new client ID/secret. We also moved from passing 
client ID, secret, and setup options in `.login(...)` to passing them to
`.init(...)` before calling login with just a callback, though the old way of
doing things is still supported.

### License
Licensed under the ISC license. 
