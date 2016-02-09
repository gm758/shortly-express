var express = require('express');
var utils = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var config = require('./config');




passport.serializeUser(function(user, done) {
  console.log('serialization begun');
  console.log(user);
  done(null, user.id);
});

passport.deserializeUser(function(userId, done) {
  console.log('deserialization begun');
  console.log(userId);
  new User({id:userId})
  .fetch()
  .then(function(profile){
    console.log('profile', profile);
    if(profile){
      done(null, profile.attributes);
    }else{
      // TODO: find out what goes here
    }
  });
});




passport.use(new GitHubStrategy({
  clientID: config.GITHUB_CLIENT_ID,
  clientSecret: config.GITHUB_CLIENT_SECRET,
  callbackURL: "http://127.0.0.1:3000/auth/github/callback"
},
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      new User({githubId: profile.id}).fetch().then(function(user) {
        if(!user) {
          var newUser = new User({githubId: profile.id});
          newUser.save()
          .then(function(){ //TODO: DRY relative to /login
            return done(null, newUser.attributes);
          });
        } else {
          return done(null, user.attributes);
        }
      });
    });
  }
));


var app = express();

app.use(session({secret:'asdfqwertty'}));
app.use(passport.initialize());
app.use(passport.session());
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


var ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/auth/github');
  }
};



app.get('/', ensureAuthenticated,
function(req, res) {
  res.render('index');
});

app.get('/create', ensureAuthenticated,
function(req, res) {
  res.render('index');
});


app.get('/logout',
function(req, res) {
  req.logout();
  res.redirect('/auth/github');
});


app.get('/auth/github',
  passport.authenticate('github', {scope: ['user:email']}), 
  function(req, res){
    //handled on github.com
    console.log('test');
  });

app.get('/auth/github/callback', 
  passport.authenticate('github', {failureRedirect: '/login'}),
  function(req, res){
    res.redirect('/');
  });

app.get('/links', ensureAuthenticated, 
function(req, res) {
  Links.query('where', 'userId', '=', req.user.id).fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', ensureAuthenticated,
function(req, res) {
  var uri = req.body.url;

  if (!utils.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  new Link({ url: uri, userId: req.user.id }).fetch().then(function(found) {

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
          userId: req.user.id,
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

console.log('Shortly is listening on 3000');
app.listen(3000);
