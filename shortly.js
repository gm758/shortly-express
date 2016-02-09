var express = require('express');
var utils = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(session({secret:'asdfqwertty'}));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


var isAuthenticated = function(req, res, callback) {
  if (req.session.username) {
    callback();
  } else {
    res.redirect('/login');
  }
};


app.get('/', 
function(req, res) {
  isAuthenticated(req, res, function() {
    res.render('index');
  });
});

app.get('/create', 
function(req, res) {
  isAuthenticated(req, res, function() {
    res.render('index');
  });
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/logout',
function(req, res) {
  req.session.destroy();
  res.redirect('/login');
});

app.post('/login',
function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({username:username})
  .fetch()
  .then(function(user){
    utils.verifyPassword(password, user.get('password'), function(err, verified) {
      if (err) {
        throw err;
      }

      if(!verified){
        res.redirect('/login');
      }else{
        req.session.username = username;
        req.session.userId = user.get('id');
        res.redirect('/');
      }
    });
  })
  .catch(function(err){
    console.log("No user found");
    res.redirect('/login');
  });
  //check for username and hashed password in users table of database
  //if correct
    //create session
    //redirect to intended page
  // if not correct
    //send 401 statuscode
    //display error/try again message on page
});


app.post('/signup', 
function(req, res) {
  //check if username is already in database

  new User({username: req.body.username})
    .fetch()
    .then(function(result) {
      if (!result) {
        var user = new User({username: req.body.username, password : req.body.password});
        user.save()
        .then(function(){ //TODO: DRY relative to /login
          req.session.username = req.body.username;
          req.session.userId = user.get('id');
          res.redirect('/');
        });
      } else { //TODO: handle case where username already exists
        console.log('Username already exists');
        res.redirect('/signup');
      }
    });
});


app.get('/links', 
function(req, res) {
  isAuthenticated(req, res, function() {
    var username = req.session.username;
    var userId = req.session.userId;
    Links.query('where', 'userId', '=', userId).fetch().then(function(links) {
      res.send(200, links.models);
    });
  });
});

app.post('/links', 
function(req, res) {

  isAuthenticated(req, res, function() {
    var uri = req.body.url;

    if (!utils.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        utils.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          Links.create({
            url: uri,
            userId: req.session.userId,
            title: title,
            baseUrl: req.headers.origin
          })
          .then(function(newLink) {
            res.send(200, newLink);
          });
        });
      }
    });
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
