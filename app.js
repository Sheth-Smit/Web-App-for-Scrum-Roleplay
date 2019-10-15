var express=require("express");
var app=express();
var mongoose=require("mongoose");
var passport = require("passport");
var bodyparser=require("body-parser");
var localpassport=require("passport-local");
var localpassportmongoose=require("passport-local-mongoose");
var request=require("request");
var html=require("html");
var parser=require("body-parser");
var flash = require('connect-flash');
const keys = require("./keys");

var User=require("./models/user.js");
var Session=require("./models/session.js");
var Team=require("./models/team.js");

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
      User.findOne({
          username: profile.id
      }, function(err, user) {
          if (err) {
              return done(err);
          }
          if (!user) {
              user = new User({
                  name: profile.displayName,
                  email: profile.emails[0].value,
                  username: profile.id,
                  role : ""
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

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-roleplay",{useNewUrlParser: true});


//============
// ROUTES
//============

app.get("/",function(req,res){
  
  if(req.user!=undefined && req.user.role=="admin")
      res.render("admin_main");
  else
      res.render("main");
  
});

app.get("/:team_id/home", partOfATeam, function (req, res) {
    Team.findById(req.params.team_id, function(err, team){
        res.render("home.ejs", {team: team});
    });
});

app.get("/:team_id/productBacklog", function(req, res){
    if(!req.user)
        res.redirect("/auth/google");
    Team.findById(req.params.team_id, function(err, team){
        res.render("productBacklog.ejs", {team: team});
    });
});

app.get("/:team_id/productBacklog/new", function(req, res){
    if(!req.user)
        res.redirect("/auth/google");
    Team.findById(req.params.team_id, function(err, team){
        if(err){
            console.log("Error: ", err);
        } else {
            res.render("addUserStory", {team: team});
        }
    })
});

app.post("/:team_id/productBacklog/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          console.log("Pushing", req.body.story);
          team.productBacklog.push(req.body.story);
          team.save();
      }
      res.redirect("/" + team._id + "/productBacklog");
  })

});

app.post("/:team_id/productBacklog/update", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          team.productBacklog = [];
          req.body.rearrangedStories.forEach(function(story){
              team.productBacklog.push(story);
              console.log("Pushing", story);
          })
          team.save();
          console.log("Done");
      }
      res.redirect("/" + team._id + "/productBacklog");
  })

});

app.get("/:team_id/releasePlan", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("releasePlan.ejs", {team: team});
  })
});

app.post("/:team_id/releasePlan", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      for(let i=0;i < team.productBacklog.length; i++){
          team.productBacklog[i].releasePlan=req.body.releasePlanValue[i];
          console.log(team.productBacklog[i].releasePlan);
      }
      team.save();
    });
    res.redirect("/" + req.params.team_id + "/releasePlan")
})

app.get("/:team_id/releasePlan/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("addRelease", {team: team});
      }
  })
});

app.post("/:team_id/releasePlan/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
            let f=0;
            team.releasePlanName.forEach(function(rel){
              if(rel.name==req.body.release.name)
                f=1;
            });
            if(!f){
              console.log("Pushing", req.body.release);
              team.releasePlanName.push(req.body.release);
              team.save();
            }
            else{
              console.log("Release already exists");
            }
        }
      res.redirect("/" + team._id + "/releasePlan");          
    });
});

app.get("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("addTask", {team: team,sprint_id: sprint_id,us_id: us_id});
      }
  })
});

app.post("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
            console.log("Pushing", req.body.task);
            team.productBacklog[req.params.us_id].tasks.push(req.body.task);
            team.save();
        }
      res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks/" + req.params.us_id);          
    });
});
//===============
// Creating teams
//===============

app.get("/create_session",function(req,res){
  res.render("create_session");
});
app.post("/session_create",function(req,res){
  var cnt;
  Session.count(function(err,count){
    cnt=count;
  })
    console.log("Session Name:"+ req.body.sessionname);
  if(cnt!=0){
      Session.updateMany({},{status:0},function(err,ses){
      //  console.log(ses);
      });
  }

  Session.create({username:req.body.sessionname,status:1},function(err,ses){
  //console.log("1st Session: "+ses);
  });

      res.redirect("/");
});
app.get("/team_create", function (req, res) {
  if(req.user){
      res.render("team_create");
      //console.log(req.user);
  } else {
      res.redirect("/auth/google");
  }

});

app.post("/team_create",sessionActive, function(req,res){
    req.user.role="Product Owner";
    req.user.save();
    console.log(req.body.teamname);
    var team_id;

    Team.create({username:req.body.teamname},function(err,team){
      if(err)console.log("Error is:"+err);
      else  {
        team_id = team._id;
        team.members.push(req.user._id);
        team.productBacklog = [];
        team.releasePlanName.push({name: "Add to a release"});
        console.log(team.releasePlanName.length);
        team.save();
      }
      Session.findOne({status:1},function(err,ses){
          ses.teams.push(team._id);
          ses.save();
          req.user.teams.push(team._id);
          req.user.currentTeam = team._id;
          req.user.currentSession = ses._id;
          req.user.save();

          for (var i = 0; i < req.body.stud.length; i++) {
              if(req.body.stud[i]!=null){
                User.findOne({email:req.body.stud[i]},function(err,stud){
                    if(stud!=null){
                      stud.invitations.push({
                        sender:req.user.email,
                        receiver: req.body.stud1,
                        teamname: req.body.teamname,
                        role: req.body.sel1
                      });

                      stud.save();
                      // User.findByIdAndUpdate(stud.id,stud,function(err,ustud){
                      //   // console.log(ustud1);
                      // });
                    }
                  });
                }
          }
          res.redirect("/"+team._id+"/productBacklog");
      });
    });

});
app.get("/team_join", function (req, res) {
  if(req.user){
    User.findOne({username:req.user.username},function(err,cur_user){
      res.render("team_join",{cur_user:cur_user});
    });
  } else {
      res.redirect("/auth/google");
  }
});
app.post("/accept_request/:tn/:rl",function(req,res){
  var team_id;
  User.findById(req.user.id,function(err,user){
      user.role=req.params.rl;
      user.invitations=[];
      user.save();
      Team.findOne({username:req.params.tn},function(err,team){
          team.members.push(req.user._id);
          team.save();
          team_id = team.id;
          Session.findOne({status:1},function(err,session){
              user.teams.push(team._id);
              user.currentTeam = team._id;
              user.currentSession = session._id;
              user.save();
              res.redirect("/"+team_id+"/productBacklog");
          });
      });
  });
  //console.log("My team: "+req.params.tn);
});
app.post("/reject_request/:id",function(req,res){
  req.user.invitations.forEach(function(invite){
      if(invite.teamname==req.params.id) {
          invite = null;
      }
  });
  res.redirect("/");
});

//===============
// Auth Routes
//===============

app.get('/flash', function(req, res){
  // Set a flash message by passing the key, followed by the value, to req.flash().
  req.flash('info', 'Flash is back!')
  res.redirect('/');
});

app.get('/auth/google',
    passport.authenticate('google',
    {
      scope: ['https://www.googleapis.com/auth/plus.login',
              'https://www.googleapis.com/auth/userinfo.email']
    })
);


app.get('/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/auth/google' }),
    function(req, res) {
      res.redirect("/");
    }
);
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


//============
// Middlewares
//============

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/auth/google");
}

function sessionActive(req, res, next){

  Session.find({status:1},function(err,ses){
    if(ses.length > 0){
      console.log("length: ",ses.length);
      console.log(ses);
      console.log("sessions found");
      return next();
    } else {
      console.log("No sessions found");
      res.redirect("/");
    }
  });
}

function partOfATeam(req, res, next){
    Session.findOne({status: 1}, function(err, session){

        if(!req.user){
            res.redirect("/auth/google");
        }

        if(err){
            console.log("Error: ", err);
            res.redirect("/");
        } else {
            if(req.user.currentSession == session._id){
                return next();
            }
            // alert the user that he is not part of any team
            if(req.user){
                res.redirect("/");
                console.log("Not part of any team");
            } else {
                res.redirect("/auth/google");
            }
        }
    });
}

app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
