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
passport.use(new localpassport(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
app.use(require("express-session")({
  secret: "Video Conferencing is not easy",
  resave: false,
  saveUninitialized: false
}));
mongoose.connect("mongodb://localhost:27017/scrum-rolepaly");
app.get("/",function(req,res){
  res.redirect("/login");
});
app.get("/login",function(req,res){
  res.render("chatbox.ejs");
});
app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
