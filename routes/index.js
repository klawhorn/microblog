var express = require('express');
var router = express.Router();
var app = require('../app');
var redis = require('redis');
var cache = redis.createClient();
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');

cache.del("tweets");

/*
1. INDEX PAGE
2. NEW USER REGISTRATION-- WORKING ON CACHING USERNAME THROUGH VERIFICATION PROCESS
3. VERIFIED PAGE --WORKING ON PULLING FROM CACHE AND PUTTING INTO THE DB
4. POST FOR SAVING TWEETS
5. LOGOUT FUNCTIONALITY
6. LOGIN FUNCTIONALITY
*/

/***************************************************
1. Index page 
***************************************************/
router.get('/', function(request, response, next) {
  var username;
  var database = app.get('database');

  //if the user has cookies saved, render the homepage
  if (request.cookies.username) {
    username = request.cookies.username;
    username = username.toUpperCase();
    
    //check if the cache of tweets exists
    cache.lrange("tweets", 0, -1, function(err, results) {
      if (results.length <1){

        //if the cache doesn't exists, pull the tweets from the db and fill the cache
        database.select().table("tweets").then(function(results) {
          
          var tweetTable = results.reverse();
          
          //push into the redis cache as JSON
          tweetTable.forEach(function(it) {
            cache.rpush("tweets", JSON.stringify(it));
          })

          //render the index page with tweets from the db
          response.render('index', { tweetTable: tweetTable, title: 'Porch Life', username: username });
        })
      }

      //if the cache exists, render the page with the cached tweets
      else {
        results=results.map(function(it){
          return JSON.parse(it);
        });

        response.render('index', { tweetTable: results, title: 'Porch Life', username: username });
      }
        
    })
    
  // if the user does not have cookies, render the index page with username=null
  } else {
    username = null;
    response.render('index', { title: 'Porch Life', username: username });
  }
});

/* ===============================================================
2. New user registration
========================*/
router.post('/register', function(request, response) {

  var username = request.body.username,
      password = request.body.password,
      password_confirm = request.body.password_confirm,
      database = app.get('database');
    console.log(username);

  //query the db for matching username content
  database('users').select('username').where({'username': username}).then(checkIfDuplicate);

  function checkIfDuplicate (query) {

  //checks to see if the username is aready taken (query is the results from the db query)
  if (query[0] !== undefined) {
  
    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Username already exists"
     });

  //checks to see if the passwords match
  } else if (password !== password_confirm) {

    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Password didn't match confirmation"
    });

  //if the username doesn't exist, and the passwords match, send email to verify user
  } else {
    //send verification email
    var email = request.body.email;
    var nonce = uuid.v4();

    var mailOptions = {
        from: 'Porch Life',
        to: email,
        subject: 'Verify your email address with this link',
        text: "Thank you for signing up with Porch Life! Please click the following link to activate your account!",
        html: "<a href='http://localhost:3000/verify_email/" + nonce + "'>Click here!</a>"
    }

    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'smellyjunkmailrules@gmail.com',
          pass: 'klaw9665'    
      } 
    }) 
    //cache the username and password to be pulled and put into the db when the user returns to the verify screen
    cache.hmset(nonce, 'username', username, 'password', password);

    //sends verification email through nodemailer
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Message sent: ' + info.response);
            response.cookie('nonce', nonce);
            response.render('index', {
              title: 'Authorize Me!',
              user: null,
              error: "please check your email"
            });
        }
    }); 
  }
  }
});
/*=======================
=================================================================*/

/*************************************************
3. verified page after receiving email
*************************************************/
router.get('/verify_email/:nonce', function(request, response) {
  var nonce = request.cookies.nonce,
      database = app.get('database'),
      username,
      password;

  // clear the nonce cookie, set the username cookie.
  response.clearCookie('nonce');

  //FIND A WAY TO PULL FROM THE CACHE AND PUT INTO THE DB
  cache.hgetall(nonce, function(err, results) {
    //where 'nonce': nonce, set username to username and password to password.
    username = results.username;
    password = results.password;

    response.cookie('username', username);
    console.log('working')
    database('users').insert(({'username': username, 'password': password}))
    .then(response.redirect('/'));
  });

});

/*************************************************
4. post for saving tweets
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
5. LOGOUT FUNCTIONALITY
*************************************************/
router.post('/logout', function (request, response) {
  response.clearCookie('username');
  response.redirect('/');
});


/***************************************************
6. Login functionality
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
