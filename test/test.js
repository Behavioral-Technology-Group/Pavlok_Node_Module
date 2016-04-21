var assert = require('assert');
var pavlok = require('../index');
var fs = require('fs');

//Testing only works after an initial sign-in
try {
    var token = require('../pavlok-token.json').token;
    if(token == null) throw "Token error!";
} catch(e) {
    console.log("You must have signed in once with the Pavlok module before, saving an auth token to disk, to test.");
    console.log("Testing only implemented for the client mode.");
	process.exit(1);
}

describe('Pavlok', function(){
    //Set timeouts appropriate to network access/server setup times
    this.slow(5000);
    this.timeout(10000);

   describe('#init()', function(){
		it('does not do anything here', function(done){
			pavlok.init("clientId", "clientSecret", {});
			done();
		});
   });

   describe('#login()', function(){
        it('should give us the auth code', function(done){
            pavlok.login(function(res, code){
                if(res)
                    done();
                else
                    throw "Not signed in yet!";
            });
        });
    });

    describe('#zap()', function(){
        it('should send a mild zap', function(done){
            pavlok.zap({
				"intensity": 100,	
				"callback": function(success, message){
					if(success)
						done();
					else
						throw message;
				}
			});
        });
    });

    describe('#beep()', function(){
        it('should send a beep', function(done){
             pavlok.beep({
				"intensity": 127,
				"callback": function(success, message){
					if(success)
						done();
					else
						throw message;
				}
			});       
		});
    });

    describe('#vibrate()', function(){
        it('should send a mild vibration', function(done){
            pavlok.vibrate({
				"intensity": 100,
				"callback": function(success, message){
					if(success)
						done();
					else
						throw message;
				}
			});
		});
    });

    describe('#pattern()', function(){
        it('should send a beep-vibrate-beep pattern twice', function(done){
            pavlok.vibrate({
				"intensity": 100,
				"pattern": [ "beep", "vibrate", "beep" ],
				"count": 2,
				"callback": function(success, message){
					if(success)
						done();
					else
						throw message;
				}
			});
		});
    });
});
