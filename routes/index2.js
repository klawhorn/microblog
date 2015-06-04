var express = require('express');
var router = express.Router();
var app = require('../app')


router.get('/', function(request, response, next) {
  var username;

  if (request.cookies.username) {
    username = request.cookies.username;
  } else {
    username = null;
  }

  response.render('index', { title: 'Authorize Me!', username: username });
});


router.post('/register', function(request, response) {

  var username = request.body.username,
      password = request.body.password,
      password_confirm = request.body.password_confirm,
      database = app.get('database');
      
  /* ===============================================================
  Function to check if the username already exists
  ========================*/
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
    database('users').insert(({'username': username, 'password': password}));
      response.redirect('/');
    };
  }
  
  database('users').select('username').where({'username': username}).then(checkIfDuplicate);
   /*=======================
   =================================================================*/

});


router.post('/login', function(request, response) {

  var username = request.body.username,
      password = request.body.password,
      database = app.get('database');

  database('users').where({'username': username}).then(function(records) {

    if (records.length === 0) {
        response.render('index', {
          title: 'Authorize Me!',
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
          title: 'Authorize Me!',
          user: null,
          error: "Password incorrect"
        });
      }
    }
  });
});

module.exports = router;
