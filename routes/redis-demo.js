var redis = require('redis');
var client = redis.createClient();

client.set("key", "value", function () {
	client.get("bnanana", function(err,res) {
		console.log('done'+res);
	})
})