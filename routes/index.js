var express = require('express');
var router = express.Router();
var app = require('../app');
var redis = require('redis');
var cache = redis.createClient();

cache.del("tweets");


/***************************************************
Index page 
***************************************************/
router.get('/', function(request, response, next) {
  var username;
  var database = app.get('database');

  if (request.cookies.username) {
    username = request.cookies.username;
    username = username.toUpperCase();
    
    cache.lrange("tweets", 0, -1, function(err, results) {
      if (results.length <1){
        database.select().table("tweets").then(function(results) {
          
          var tweetTable = results.reverse();
          console.log("this");

          tweetTable.forEach(function(it) {
            cache.rpush("tweets", JSON.stringify(it));
          })

          response.render('index', { tweetTable: tweetTable, title: 'Porch Life', username: username });
        })
      }
      else {
        // console.log("that");
        // console.log(results);
        results=results.map(function(it){
          return JSON.parse(it);
        });
        // console.log(results);
        response.render('index', { tweetTable: results, title: 'Porch Life', username: username });
      
      }
        
    })
    
    // database.select().table("tweets").then(displayTweet);
    // function displayTweet(query){
    //   var tweetTable = query.reverse();
    //   response.render('index', { tweetTable: tweetTable, title: 'Porch Life', username: username });
    // }

  } else {
    username = null;
    response.render('index', { title: 'Porch Life', username: username });
  }
});

/* ===============================================================
New user registration
========================*/
router.post('/register', function(request, response) {

  var username = request.body.username,
      password = request.body.password,
      password_confirm = request.body.password_confirm,
      database = app.get('database');
      

  function checkIfDuplicate (query) {

  if (query[0] !== undefined) {
  
    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Username already exists"
     });

  } else if (password !== password_confirm) {

    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Password didn't match confirmation"
    });

  } else {
    
    response.cookie('username', username);
    database('users').insert(({'username': username, 'password': password})).then();
      response.redirect('/');
    };
  }
  
  database('users').select('username').where({'username': username}).then(checkIfDuplicate);

});
/*=======================
=================================================================*/




/*************************************************
post for saving tweets
**************************************************/
router.post('/tweet', function(request, response){
    var username = request.cookies.username;
    var tweetBody = request.body.tweetBody;
    var database = app.get('database');
    var currentDate = new Date(); 
    var dateTime = "Posted at: " + currentDate.getDate() + "/" + (currentDate.getMonth()+1)  + "/" + currentDate.getFullYear() + " @ " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();

    database('tweets').insert(({'username': username, "tweetBody": tweetBody, "tweetTime": dateTime})).then();

    cache.del("tweets");
      response.redirect('/');   
      
});


/************************************************
LOGOUT FUNCTIONALITY
*************************************************/
router.post('/logout', function (request, response) {
  response.clearCookie('username');
  response.redirect('/');
});


/***************************************************
Login functionality
***************************************************/
router.post('/login', function(request, response) {

  var username = request.body.username,
      password = request.body.password,
      database = app.get('database');

  database('users').where({'username': username}).then(function(records) {

    if (records.length === 0) {
        response.render('index', {
          title: 'User not found!',
          user: null,
          error: "No such user"
        });
    } else {
      var user = records[0];
      if (user.password === password) {

        response.cookie('username', username);
        response.redirect('/');
      } else {

        response.render('index', {
          title: 'Nah, brah.',
          user: null,
          error: "Password incorrect"
        });
      }
    }
  });
});

module.exports = router;
