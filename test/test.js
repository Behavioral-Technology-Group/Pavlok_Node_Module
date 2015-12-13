var assert = require('assert');
var pavlok = require('../index');
var fs = require('fs');

//Testing only works after an initial sign-in
try {
    var token = require('../pavlok-token.json').token;
    if(token == null) throw "Token error!";
} catch(e) {
    console.log("You must have signed in once with the Pavlok module before, saving an auth token to disk, to test.");
    process.exit(1);
}

describe('Pavlok', function(){
    //Set timeouts appropriate to network access/server setup times
    this.slow(5000);
    this.timeout(10000);

    describe('#login()', function(){
        it('should give us the auth code', function(done){
            pavlok.login('not', 'used', { verbose: false }, function(res, code){
                if(res)
                    done();
                else
                    throw "Not signed in yet!";
            });
        });
    });

    describe('#zap()', function(){
        it('should send a mild zap', function(done){
            pavlok.zap(20, function(success, message){
                if(success)
                    done();
                else
                    throw message;
            });
        });
    });

    describe('#beep()', function(){
        it('should send a beep', function(done){
            pavlok.beep(2, function(success, message){
                if(success)
                    done();
                else
                    throw message;
            });
        });
    });

    describe('#vibrate()', function(){
        it('should send a mild vibration', function(done){
            pavlok.vibrate(100, function(success, message){
                if(success)
                    done();
                else
                    throw message;
            });
        });
    });
});
