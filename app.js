var express=require("express");
var app=express();
var mongoose=require("mongoose");
var passport = require("passport");
var bodyparser=require("body-parser");
var localpassport=require("passport-local");
var localpassportmongoose=require("passport-local-mongoose");
var User=require("./models/user.js");
var request=require("request");
var html=require("html");
var parser=require("body-parser");
var flash = require('connect-flash');
const keys = require("./keys");
app.use(parser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(express.static("models"));
app.use(express.static("models"));
app.use(flash());

app.use(require("express-session")({
  secret: "Scrum Roleplay",
  resave: false,
  saveUninitialized: false
}));


app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-roleplay",{useNewUrlParser: true});

app.use(passport.initialize());
app.use(passport.session());
// passport.use(new localpassport(User.authenticate()));
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: keys.google.clientID,
    clientSecret: keys.google.clientSecret,
    callbackURL: "http://localhost:3050/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // console.log(profile);        
      //check user table for anyone with a facebook ID of profile.id
      User.findOne({
          username: profile.id 
      }, function(err, user) {
          if (err) {
              return done(err);
          }
          //No user was found... so create a new user with values from Facebook (all the profile. stuff)
          if (!user) {
              user = new User({
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  username: profile.id,
                  role : ""
                  //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line
                  // facebook: profile._json
              });
              user.save(function(err) {
                  if (err) console.log(err);
                  return done(err, user);
              });
          } else {
              //found user. Return
              return done(err, user);
          }
      });
  }
  
));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  next();
});

//============
// ROUTES
//============

app.get("/",function(req,res){
  console.log(req.user);
  res.render("main");
});

app.get("/home", function (req, res) {
  if(req.user){
      res.render("home");
  } else {
      res.redirect("/auth/google");
  }

});

app.get("/productBacklog", function(req, res){
  if(req.user){
    res.render("productBacklog");
} else {
    res.redirect("/auth/google");
}
});




//===============
// Auth Routes
//===============

app.get('/auth/google',
    passport.authenticate('google', 
    { scope: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email']
}));


app.get('/auth/google/callback', 
    passport.authenticate('google', {
      failureRedirect: '/auth/google' }),
    function(req, res) {
      res.redirect("/");
});
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/auth/google");
}

app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
