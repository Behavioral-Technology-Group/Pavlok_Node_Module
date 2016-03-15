var pavlok = require("./index");

console.log("Testing...");
pavlok.init(
    //NOTE: Don't expect these client ID/client secrets to work.

    //Client ID
    "9377ed97a2ccfd3bfd4b7a6d226e3f92504416ac5aeb6aa6fee96343e05fbc4e",
    //Client secret
    "ddea1deb41de6c18097997f8d63f9296ea4565917f8617961f198bb7d145f8cd",
    //Options -- this is optional
    {
        callbackUrl: "http://localhost:3000/auth/pavlok/result", //Default
	port: 3000, //This is also the default
        verbose: true, //Verbose is usually false
	save: true //Usually true
    });
    
pavlok.login(function(result, token){
        if(result){
            console.log("Our auth token is: " + token);
            pavlok.beep(1, function(success, result){
                console.log(result);
                pavlok.vibrate(100); //Calls without callbacks
                pavlok.zap(100); 
		console.log("Done testing (just sent a vibrate and zap too).");
		console.log("Close your browser to automatically exit.");
            });
        } else {
            console.log("Failed to get auth token...");
        }
   });
