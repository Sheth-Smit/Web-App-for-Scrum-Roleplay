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
// var plotly = require('plotly')(, "");

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
    callbackURL: "/auth/google/callback"
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
  res.locals.sprintStart = [2*60*1000, 4*60*1000, 6*60*1000];
  res.locals.sprintEnd = [4*60*1000, 6*60*1000, 7.5*60*1000];
  res.locals.totalTime = 8*60*1000;
  res.locals.numofSprints = 3;

  next();
});

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-roleplay",{useNewUrlParser: true});

var sprintStart = [2*60*1000, 4*60*1000, 6*60*1000];
var sprintEnd = [4*60*1000, 6*60*1000, 7.5*60*1000];
var totalTime = 8*60*1000;
var numofSprints = 3;

//============
// ROUTES
//============

app.get("/",function(req,res){

  if(req.user!=undefined && req.user.role=="admin")
      res.render("admin_main");
  else
      res.render("main");

});

app.post("/:team_id/startActivity", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      var date = new Date();
      team.endTime = (Date.parse(date) + totalTime).toString();
      team.timerFlag = 1;
      team.save();
      res.redirect("/" + team._id + "/productBacklog");
  });
})

app.get("/:team_id/home", partOfATeam, function (req, res) {
    Team.findById(req.params.team_id, function(err, team){
        res.render("home.ejs", {team: team});
    });
});

//============
// DashBoard
//============

app.get("/:team_id/dashBoard", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      var burned = [];
      var estimate = [];
      for(var i = 0; i < numofSprints+1; i++){
        burned.push({x:0,y:0});
        estimate.push({x:0,y:0});
      }
      estimate[team.sprintPoints.length].x = team.sprintPoints.length+1;
      estimate[team.sprintPoints.length].y = 0;
      for(var i = team.sprintPoints.length-1; i >= 0; i--){
        estimate[i].x = i+1;
        estimate[i].y = team.sprintPoints[i].estimate + estimate[i+1].y;
      }
      burned[0].x = 1;
      burned[0].y = estimate[0].y;
      for(var i = 1; i < numofSprints + 1; i++){
        burned[i].x = i+1;
        burned[i].y = burned[i-1].y - team.sprintPoints[i-1].burned;
      }
      res.render("dashboard", {team: team, burned: burned, estimate: estimate});
  });
});

//============
// Product Backlog
//============

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
            var date = new Date();
            var curTime = Date.parse(date);
            if(team.endTime - curTime > 6.5 * 60 * 1000){
              res.render("addUserStory", {team: team});
            } else {
              res.redirect("/" + team._id + "/productBacklog");
            }
        }
    })
});

app.post("/:team_id/productBacklog/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
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
          var rearrangedIndex = req.body.rearrangedIndex
          var temp = []
          for(var i = 0; i < rearrangedIndex.length; i++){
              temp.push(team.productBacklog[rearrangedIndex[i]]);
          }
          team.productBacklog = temp;
          team.save();
      }

      res.redirect("/" + team._id + "/productBacklog");
  })

});

app.post("/:team_id/productBacklog/delete", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          var index = req.body.index;
          team.productBacklog.splice(index, 1);
          console.log("Deleted pb" + index);
          team.save();
      }
      res.redirect("/" + team._id + "/productBacklog");
  })
})

//============
// Sprint Points
//============

app.get("/:team_id/estimateSprintPoints", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("estimateSprintPoints", {team: team});
  })
});

app.post("/:team_id/estimateSprintPoints", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      for(let i=0;i < numofSprints; i++){
          team.sprintPoints[i].estimate=req.body.estimatedSprintPoints[i];
          console.log(team.sprintPoints[i].estimate);
      }
      team.save();
    });
    res.redirect("/" + req.params.team_id + "/releasePlan")
})

//============
// Release Plan
//============



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
          var date = new Date();
          var curTime = Date.parse(date);
          if(team.endTime - curTime > 6 * 60 * 1000){
            res.render("addRelease", {team: team});
          } else {
            res.redirect("/" + team._id + "/releasePlan");
          }
      }
  })
});

app.post("/:team_id/releasePlan/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
            let f=0;
            if(team.releasePlanName){
                team.releasePlanName.forEach(function(rel){
                  if(rel.name==req.body.release.name)
                    f=1;
                });
            }
            if(!f){
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

//===================
// Sprint Text Routes
//===================

app.get("/:team_id/:sprintNo/planSummaryDisplay",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(parseInt(req.params.sprintNo,10)>team.sprint.length){
      res.render("emptySummary",{team:team,sprintNo:req.params.sprintNo});
    }
    else{
      if(team.sprint[req.params.sprintNo-1].planSummary=="") {
        res.render("emptySummary",{team:team,sprintNo:req.params.sprintNo});
      }
      else{
        res.render("currentSummary",{team:team,sprintNo:req.params.sprintNo});
      }
    }
  });
});

app.get("/:team_id/:sprintNo/planSummary",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
    }
    else{
      var date = new Date();
      var curTime = Date.parse(date);
      if(team.endTime - curTime > totalTime - sprintEnd[req.params.sprintNo-1]){
        res.render("planSummary",{team:team,sprintNo:req.params.sprintNo});
      } else {
        res.redirect("/" + team._id + "/" + req.params.sprintNo + "/planSummaryDisplay");
      }

    }
  });
});
app.post("/:team_id/:sprintNo/planSummary",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
    }
    else{
      if(parseInt(req.params.sprintNo,10)>team.sprint.length){
        team.sprint.push(req.body.sprint);
        team.save();
      }
      else{
        team.sprint[parseInt(req.params.sprintNo,10)-1].planSummary=req.body.sprint.planSummary;
        team.save();
      }
      res.redirect("/"+team.id+"/"+req.params.sprintNo+"/planSummaryDisplay");
    }
  });
});
app.get("/:team_id/:sprintNo/sprintRetrospectiveDisplay",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(parseInt(req.params.sprintNo,10)>team.sprint.length){
      res.render("emptyRetrospective",{team:team,sprintNo:req.params.sprintNo});
    }
    else{
      if(team.sprint[req.params.sprintNo-1].retrospective=="") {
        res.render("emptyRetrospective",{team:team,sprintNo:req.params.sprintNo});
      }
      else{
        res.render("currentRetrospective",{team:team,sprintNo:req.params.sprintNo});
      }
    }
  });
});
app.get("/:team_id/:sprintNo/sprintRetrospective",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console,log(err);
    }
    else{
      var date = new Date();
      var curTime = Date.parse(date);
      if(team.endTime - curTime > totalTime - sprintEnd[req.params.sprintNo-1]){
        res.render("sprintRetrospective",{team:team,sprintNo:req.params.sprintNo});
      } else {
        res.redirect("/" + team._id + "/" + req.params.sprintNo + "/sprintRetrospectiveDisplay");
      }
    }
  });
});
app.post("/:team_id/:sprintNo/sprintRetrospective",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
    }
    else{
      if(parseInt(req.params.sprintNo,10)>team.sprint.length){
        team.sprint.push(req.body.sprint);
        team.save();
      }
      else{
        team.sprint[parseInt(req.params.sprintNo,10)-1].retrospective=req.body.sprint.retrospective;
        team.save();
      }
      res.redirect("/"+team.id+"/"+req.params.sprintNo+"/sprintRetrospectiveDisplay");
    }
  });
});
app.get("/:team_id/:sprintNo/sprintReviewDisplay",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(parseInt(req.params.sprintNo,10)>team.sprint.length){
      res.render("emptyReview",{team:team,sprintNo:req.params.sprintNo});
    }
    else{
        if(team.sprint[req.params.sprintNo-1].review=="") {
          res.render("emptyReview",{team:team,sprintNo:req.params.sprintNo});
        }
        else{
          res.render("currentReview",{team:team,sprintNo:req.params.sprintNo});
        }
    }
  });
});
app.get("/:team_id/:sprintNo/sprintReview",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console,log(err);
    }
    else{
      var date = new Date();
      var curTime = Date.parse(date);
      if(team.endTime - curTime > totalTime - sprintEnd[req.params.sprintNo-1]){
        res.render("sprintReview",{team:team,sprintNo:req.params.sprintNo});
      } else {
        res.redirect("/" + team._id + "/" + req.params.sprintNo + "/sprintReviewDisplay");
      }
    }
  });
});
app.post("/:team_id/:sprintNo/sprintReview",function(req,res){
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
    }
    else{
      if(parseInt(req.params.sprintNo,10)>team.sprint.length){
        team.sprint.push(req.body.sprint);
        team.save();
      }
      else{
        team.sprint[parseInt(req.params.sprintNo,10)-1].review=req.body.sprint.review;
        team.save();
      }
      res.redirect("/"+team.id+"/"+req.params.sprintNo+"/sprintReviewDisplay");
    }
  });
});

//===============
// Sprint Routes
//===============

app.get("/:team_id/:sprint_id/selectStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("poSelectStories", {team: team, sprint_id: req.params.sprint_id});
  });
});

app.post("/:team_id/:sprint_id/selectStories/update", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      var checked = req.body.checked;
      var index = 0;
      for(var i = 0; i < team.productBacklog.length; i++){
        if(i == checked[index]){
            team.productBacklog[i].sprintID = req.params.sprint_id;
            index++;
        }
      }
      team.save();
      res.redirect("/"+req.params.team_id+"/"+req.params.sprint_id+"/selectStories");
  });
});

app.get("/:team_id/:sprint_id/estimateStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("estimate_stories", {team: team, sprint_id: req.params.sprint_id});
  });
});

app.post("/:team_id/:sprint_id/estimateStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      var points = req.body.points;
      var index = 0;
      for(var i = 0; i < team.productBacklog.length; i++){
          if(team.productBacklog[i].sprintID == req.params.sprint_id){
              team.productBacklog[i].points = points[index++];
          }
      }
      team.save();
      res.redirect("/"+req.params.team_id+"/"+req.params.sprint_id+"/estimateStories");
  });
});

//===============
// Task Routes
//===============

app.get("/:team_id/:sprint_id/devTasks", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("devTasks", {team: team, sprint_id: req.params.sprint_id});
  });
});

app.get("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          var date = new Date();
          var curTime = Date.parse(date);
          if(team.endTime - curTime > totalTime - sprintEnd[req.params.sprint_id-1]){
            res.render("addTask", {team: team,sprint_id: req.params.sprint_id,us_id: req.params.us_id});
          } else {
            res.redirect("/" + team._id + "/" + req.params.sprint_id + "/devTasks");
          }
      }
  })
});

app.post("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
            team.productBacklog[req.params.us_id].tasks.push(req.body.task);
            team.save();
        }
      res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
    });
});

app.post("/:team_id/:sprint_id/devTasks/:us_id/finish", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
            team.productBacklog[req.params.us_id].status=1;
            team.save();
        }
      res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
    });
});

app.post("/:team_id/:sprintID/devTasks/:us_id/delete", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          var index = req.body.index;
          team.productBacklog[req.params.us_id].tasks.splice(index, 1);
          console.log("Deleted task" + index + "from "+ req.params.us_id);
          team.save();
      }
      res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
  })
})

app.get("/:team_id/:sprint_id/devStorySelection", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      res.render("devStorySelection", {team: team, sprint_id: req.params.sprint_id});
  });
});

app.post("/:team_id/:sprint_id/devStorySelection", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      var checkeddev = req.body.checkeddev;
      var f=0;
      var index=0;
      for(var i = 0; i < team.productBacklog.length; i++){
        if(checkeddev && i == checkeddev[index]){
            if(team.productBacklog[i].takenBy == "nought"){
              team.productBacklog[i].takenBy = res.locals.currentUser.email;
            }
            else if(team.productBacklog[i].takenBy != res.locals.currentUser.email){
              f=1;
            }
            index++;
        }
        else {
          if(team.productBacklog[i].takenBy == res.locals.currentUser.email && team.productBacklog[i].sprintID == req.params.sprint_id){
            team.productBacklog[i].takenBy = "nought";
          }
        }
      }
      team.save();
      if(f)
        console.log("Couldn't Select Overlapping");
      else {
        console.log("Selection Done");
      }
      res.redirect("/"+req.params.team_id+"/"+req.params.sprint_id+"/devStorySelection");
  });
});

//===============
// Accept/Reject
//===============

app.get("/:team_id/:sprint_id/finishedUserStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("finishedUserStories", {team: team,sprint_id: req.params.sprint_id});
      }
  })
});

app.post("/:team_id/:sprint_id/finishedUserStories/:us_id/:status", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
    var flag = 0;
      if(err){
          console.log("Error: ", err);
      } else {
            console.log("reached",req.params.status);
            if(req.params.status == "accept"){
            flag = 1;
            // console.log("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories/" + req.params.us_id + "/accept/actualPoints");
            }
            else{
              team.productBacklog[req.params.us_id].takenBy="nought";
              team.productBacklog[req.params.us_id].status=0;
              team.productBacklog[req.params.us_id].sprintID=0;
              team.productBacklog[req.params.us_id].points=0;
              team.productBacklog[req.params.us_id].tasks=[];
            }
            team.save();
        }
        if(flag)
            res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories/" + req.params.us_id + "/accept/actualPoints");
        else
            res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories");
    });
});

app.get("/:team_id/:sprint_id/finishedUserStories/:us_id/accept/actualPoints", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("actualPoints", {team: team,sprint_id: req.params.sprint_id,us_id: req.params.us_id});
      }
  })
});

app.post("/:team_id/:sprint_id/finishedUserStories/:us_id/accept/actualPoints", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
        team.productBacklog[req.params.us_id].status=2;
        team.productBacklog[req.params.us_id].points = req.body.actualPoints;
        team.sprintPoints[req.params.sprint_id-1].burned += req.body.actualPoints;
        team.save();
      }
    res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories");
  })
});

//===============
// Product Review
//===============

app.get("/:team_id/productReview", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("productReview", {team: team});
      }
  })
});

app.get("/:team_id/productReview/update", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          res.render("updateProductReview", {team: team});
      }
  })
});

app.post("/:team_id/productReview/update", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
      } else {
          team.productReview = req.body.productReview;
          team.save();
      }
      res.redirect("/" + team._id + "/productReview");
  })
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
    var team_id;

    Team.create({username:req.body.teamname},function(err,team){
      if(err)console.log("Error is:"+err);
      else  {
        team_id = team._id;
        team.members.push(req.user._id);
        team.productBacklog = [];
        team.releasePlanName.push({name: "Add to a release"});
        for(var i = 0; i < numofSprints; i++){
          team.sprintPoints.push({burned:0,estimate:0});
        }
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
          res.redirect("/" + team._id + "/home");
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
              res.redirect("/" + team._id + "/home");
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
      return next();
    } else {
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
            } else {
                res.redirect("/auth/google");
            }
        }
    });
}

app.listen(3050,function(req,res){
  console.log("Server active on 3050");
});
