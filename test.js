//REGISTRATION : These where we check to see if a user already exists
          //if does exist let alert("user already exits try again").window(reload)

	response.render('index', {
	title: 'Authorize Me!',
	user: null,
	error: "USER ALREADY EXISTS DUMMY DUM DUM"
	}


	var env = process.env.NODE_ENV || 'development';





var knexConfig = require('./knexfile.js')[env];
var knex = require('knex')(knexConfig);

function log(it) {
 console.log(it);
}

var userName = process.argv[2];
var passWord = process.argv[3];

function success (query) {
 if (query[0] !== undefined) {
   console.log('Valid username and passord');
 } else {
   console.log('not a valid combination');
 }
}

// function success (query) {
//   console.log(query);
// }

knex('logintable').where({username: userName, password: passWord}).select('username').then(success).finally(function(){knex.destroy();});