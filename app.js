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
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localpassport(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-roleplay",{useNewUrlParser: true});

//============
// ROUTES
//============

app.get("/",function(req,res){
  res.render("main");
});

app.get("/home", function (req, res) {
  if(req.user){
      res.render("home");
  } else {
      res.redirect("/login");
  }

});

app.get("/productBacklog", function(req, res){
  res.render("productBacklog");
});

app.get("/chatbox", function(req, res){
  res.render("chatbox");
});


//===============
// Auth Routes
//===============

app.get("/login",function(req,res){
  res.render("login", {error: req.flash("error")});
});

app.post("/login", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login"
  }), function(req, res){

  }
);

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
    var newUser = new User({
      username: req.body.username,
      email: req.body.email,
      role: ""
    });

    User.register(newUser, req.body.password, function (err, user) {
          if(err){
            console.log(err);
            res.redirect("/register");
          } else {
            passport.authenticate("local")(req, res, function() {
                console.log(user);
                res.redirect("/");
            });
          }
    });
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
