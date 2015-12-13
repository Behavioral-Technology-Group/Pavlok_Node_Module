var assert = require('assert');
var pavlok = require('../index');

describe('Pavlok', function(){
    //Set timeouts appropriate to network access/server setup times
    this.slow(5000);
    this.timeout(10000);

    describe('#login()', function(){
        it('should error out', function(done){
            pavlok.login('this', 'will', {}, function(result, code){
                assert.equal(false, result);
                done();
            });
        });
    });
});
