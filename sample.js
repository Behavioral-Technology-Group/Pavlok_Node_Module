var pavlok = require("./index");

console.log("Testing...");
pavlok.login(
    //NOTE: Don't expect these client ID/client secrets to work.

    //Client ID
    "badclientid",
    //Client secret
    "badsecret",
    //Options -- this is optional
    {
        callbackUrl: "http://localhost:3000/auth/pavlok/result", //Default
        port: 3000, //This is also the default
        verbose: true //Verbose is usually false
    },
    //Callback function
    function(result, token){
        if(result){
            console.log("Our auth token is: " + token);
            pavlok.beep(1, function(success, result){
                console.log(result);
                pavlok.vibrate(100, function(success, result){
                    console.log(result);
                    pavlok.zap(100, function(sucess, result){
                        console.log(result);
                        console.log("Done testing; close browser to exit.");
                    });
                });
            });
        } else {
            console.log("Failed to get auth token...");
        }
   });
