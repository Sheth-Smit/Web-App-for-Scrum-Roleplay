var express=require("express");
var app=express();
var mongoose=require("mongoose");
var passport = require("passport");
var bodyparser=require("body-parser");
var localpassport=require("passport-local");
var localpassportmongoose=require("passport-local-mongoose");
var user=require("./models/user.js");
var request=require("request");
var html=require("html");
var parser=require("body-parser");

app.use(parser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static("models"));
passport.use(new localpassport(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.use(express.static("models"));
app.use(require("express-session")({
  secret: "Scrum Roleplay",
  resave: false,
  saveUninitialized: false
}));
app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-rolepaly",{useNewUrlParser: true});



app.get("/",function(req,res){
  res.redirect("/home");
});

app.get("/home", function (req, res) {
  res.render("home");
})

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/productBacklog", function(req, res){
  res.render("productBacklog");
});

app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
