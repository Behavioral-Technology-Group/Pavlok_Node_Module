var pavlok = require("./index.js");

console.log("Testing...");
pavlok.login( 
    //Client ID
    "9377ed97a2ccfd3bfd4b7a6d226e3f92504416ac5aeb6aa6fee96343e05fbc4e", 
    //Client secret
    "ddea1deb41de6c18097997f8d63f9296ea4565917f8617961f198bb7d145f8cd", 
    //Verbose (i.e. show debugging messages)
    true,
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
                        pavlok.logout();
                        console.log("Done testing; close browser to exit.");
                    });
                });
            });
        } else {
            console.log("Failed to get auth token...");
        }
   });
