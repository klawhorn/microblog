var express = require('express');
var router = express.Router();
var app = require('../app');
var redis = require('redis');
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');
var pwd = require('pwd');

/*
1. INDEX PAGE
2. NEW USER REGISTRATION-- WORKING ON CACHING USERNAME THROUGH VERIFICATION PROCESS
3. VERIFIED PAGE --WORKING ON PULLING FROM CACHE AND PUTTING INTO THE DB
4. POST FOR SAVING TWEETS
5. LOGOUT FUNCTIONALITY
6. LOGIN FUNCTIONALITY
*/

//Creating the redis connection through Heroku for deployment
if (process.env.REDISTOGO_URL) {
    var rtg   = require("url").parse(process.env.REDISTOGO_URL);
    var cache = require("redis").createClient(rtg.port, rtg.hostname);

    cache.auth(rtg.auth.split(":")[1]);

} else {
    var cache = require("redis").createClient();
}

/***************************************************
1. Index page 
***************************************************/
router.get('/', function(request, response, next) {
  console.log('++++!!!!!!!++++ in the /');
  var username;
  var database = app.get('database');

  //if the user has cookies saved, render the homepage
  if (request.cookies.username) {
    username = request.cookies.username;
    username = username.toUpperCase();

    //find the tweets from the tweets db and fill to the index.jade template
    database.select().table("tweets").then(function(results) {
      
      var tweetTable = results.reverse();
      
      //render the index page with tweets from the db
      response.render('index', { tweetTable: tweetTable, title: 'Porch Life', 
        username: username });
    })
  }
    
  // if the user does not have cookies, render the index page with username=null
    else {
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
    // console.log(username);

  //query the db for matching username content
  database('users').select('username').where({'username': username}).then(checkIfDuplicate);

  function checkIfDuplicate (query) {

  //checks to see if the username is aready taken (query is the results from the db query)
  if (query[0] !== undefined) {
  
    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Sorry, that username is taken. BE MORE ORIGINAL."
     });

  //checks to see if the passwords match
  } else if (password !== password_confirm) {

    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Passwords didn't match, dude."
    });

  //if the username doesn't exist, and the passwords match, send email to verify user
  } else if (password.length<5) {

    response.render('index', {
      title: 'Authorize Me!',
      user: null,
      error: "Your password must be a minimum of 5 characters. Be better."
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
        html: "<a href='http://localhost:3000/verify_email/" + nonce + "'>Thank you for signing up with Porch Life! Please click me activate your account!</a>"
    }

    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'smellyjunkmailrules@gmail.com',
          pass: 'klaw9665'    
      } 
    }) 

    var salt='';
    var hash='';


    function register() {
      pwd.hash(password, function(err, salty, hashy){
        salt= salty;
        console.log('+++++++++LOOK+++++++ at the salt'+salt);
        hash= hashy;
        console.log('+++++++++LOOK+++++++ at the hash'+hash);
        //cache the username and password after it is encrypted with PWD to be pulled and put into the db when the user returns to the verify screen
        cache.hmset(nonce, "username", username, "salt", salt, "hash", hash);
        // console.log(stored);
      }) 
    }

    register();

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
              pending: "Please check your email and click the link to verify your account!"
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
      database = app.get('database');
  var username='';
  var salt='';
  var hash='';

  // clear the nonce cookie, set the username cookie.
  response.clearCookie('nonce');

  //FIND A WAY TO PULL FROM THE CACHE AND PUT INTO THE DB
  cache.hgetall(nonce, function(err, results) {
    console.log('++++++LOOK++++++NONCE '+nonce);
    console.log('++++++LOOK++++++ RESULTS.USERNAME '+results.username);
    //where 'nonce': nonce, set username to username and password to password.
    ////////WHERE WE ARE FIGURING IT OUT, THE CONSOLE LOG RESULTS.STORED CAME BACK AS OBJECT OBJECT, NEXT WE TEST RESULTS.STORED.USERNAME
    username = results.username;
    salt = results.salt;
    hash = results.hash;


    response.cookie('username', username);

    database('users').insert(({'username': username, 'salt': salt, 'hash': hash}))
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

 var attempt = {username:request.body.username, password:request.body.password}; 
 var database = app.get('database');

 database('users').where({'username': attempt.username}).then(function(results) {

   if (results.length === 0) {
       response.render('index', {
         title: 'User not found!',
         user: null,
         error: "No such user"
       });
   } else if (results[0]) {

        var user = results[0];
         
        function authenticate(attempt) {
           pwd.hash(attempt.password, user.salt, function(err, hash){

             if (hash===user.hash) {
               response.cookie('username', attempt.username);
               response.redirect('/');

             } else {

                 response.render('index', {
                   title: 'Nah, brah.',
                   user: null,
                   error: "Password incorrect"
                 });
             
             }  

          })
        } 

        authenticate(attempt);
     } 
  });
});


module.exports = router;
