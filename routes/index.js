var express = require('express');
var router = express.Router();
var app = require('../app');
var redis = require('redis');
var cache = redis.createClient();
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');

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
          

          tweetTable.forEach(function(it) {
            cache.rpush("tweets", JSON.stringify(it));
          })

          response.render('index', { tweetTable: tweetTable, title: 'Porch Life', username: username });
        })
      }

      else {
        results=results.map(function(it){
          return JSON.parse(it);
        });

        response.render('index', { tweetTable: results, title: 'Porch Life', username: username });
      }
        
    })
    

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
    console.log(username);

  database('users').select('username').where({'username': username}).then(checkIfDuplicate);

  function checkIfDuplicate (query) {
    console.log(query);
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

    var email = request.body.email;
    var nonce = uuid.v4();

    var mailOptions = {
        from: 'Porch Life',
        to: email,
        subject: 'verify your email address with this link',
        text: "Thank you for signing up with Porch Life! Please click the following link to activate your account!",
        html: "<a href='http://localhost:4000/verify_email/" + nonce + "'>Click here!</a>"
    }

    var transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
          user: 'smellyjunkmailrules@gmail.com',
          pass: 'klaw9665'    
      } 
    }) 
    console.log(transporter);

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Message sent: ' + info.response);
            response.render('index', {
              title: 'Authorize Me!',
              user: null,
              error: "please check your email"
            });
        }
    }); 
  }
  //   //will go somewhere else 
  //   response.cookie('username', username);
  //   database('users').insert(({'username': username, 'password': password})).then();

  //     response.redirect('/');
  //   };
  // }
  
  

  }
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
