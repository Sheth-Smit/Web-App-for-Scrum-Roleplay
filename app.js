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

app.set("view engine", "ejs");
mongoose.connect("mongodb://localhost:27017/scrum-roleplay",{useNewUrlParser: true});
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

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  res.locals.sprintStart = [10*60*1000, 20*60*1000, 30*60*1000];
  res.locals.sprintEnd = [20*60*1000, 30*60*1000, 40*60*1000];
  res.locals.totalTime = 45*60*1000;
  res.locals.numofSprints = 3;
  res.locals.currentSprint = 0;
  next();
});

app.get('/auth/google',function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/login",function(req,res){
  res.render("login");
});
app.get("/login2",function(req,res){
  res.render("login2");
});
app.post("/login",passport.authenticate("local",{
  successRedirect:"/",
  failureRedirect:"/login2"
}),function(req,res){
  console.log("authentication: ");
});
app.post("/register",function(req,res){
  console.log("Register start");
  User.find({username:req.body.email},function(err,user){
    console.log("User: "+user);
    if(err){
      console.log("Error: "+err);
    }
    if(user==""){
      User.register(new User({username:req.body.email }), req.body.password, function(err,user){
        console.log("User created");
        if(err){
          console.log("Error Generated : "+err);
        }else {
          user.name = req.body.username;
          user.email = req.body.email;
          user.save();
          console.log("Saved");
          passport.authenticate("local")(req,res,function(){
            console.log("New User: "+user);
          });
          res.redirect("/");
        }
      });
    }
    else{
      console.log("User already exists");
      res.render("register2");
    }
  });
});


var sprintStart = [10*60*1000, 20*60*1000, 30*60*1000];
var sprintEnd = [20*60*1000, 30*60*1000, 40*60*1000];
var totalTime = 45*60*1000;
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
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        var date = new Date();
        team.endTime = (Date.parse(date) + totalTime).toString();
        team.timerFlag = 1;
        team.save();
        res.redirect("/" + team._id + "/productBacklog");
      }
  });
})

app.get("/:team_id/home", partOfATeam, function (req, res) {
  if(!req.user)
      res.redirect("/login");
    Team.findById(req.params.team_id, function(err, team){
      if(err){
        console.log(err);
        res.redirect("/");
      }
        res.render("home.ejs", {team: team});
    });
});

//============
// DashBoard
//============

app.get("/:team_id/dashBoard", function(req, res){
  if(!req.user)
      res.redirect("/login");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
        console.log(err);
        res.redirect("/");
      }
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
app.get("/create_session/productBacklog", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  else if(req.user.role != "admin")
      res.redirect("/");
  else{
    Session.findOne({status:1},function(err,ses){
      if(err){
        console.log(err);
        res.redirect("/");
      }
        res.render("adminproductBacklog.ejs", {ses: ses});
    });
  }
});

app.get("/:team_id/productBacklog", function(req, res){
    if(!req.user)
        res.redirect("/auth/google");
    Team.findById(req.params.team_id, function(err, team){
      if(err){
        console.log(err);
        res.redirect("/");
      }
        res.render("productBacklog.ejs", {team: team});
    });
});

app.get("/create_session/productBacklog/new", function(req, res){
    if(!req.user)
        res.redirect("/auth/google");
    else if(req.user.role != "admin")
        res.redirect("/");
    res.render("addUserStory",{team: undefined});
});

app.post("/create_session/productBacklog", function(req, res){
    res.redirect("/");
});

app.post("/create_session/productBacklog/new", function(req, res){
  Session.findOne({status:1},function(err,ses){
      if(err){
          console.log("Error: ", err);
          res.redirect("/")
      } else {
          ses.productBacklog.push(req.body.story);
          ses.save();
          res.redirect("/create_session/productBacklog");
      }
  })
});

app.get("/:team_id/productBacklog/new", function(req, res){
    if(!req.user)
        res.redirect("/auth/google");
    Team.findById(req.params.team_id, function(err, team){
        if(err){
            console.log("Error: ", err);
            res.redirect("/");
        } else {
            var date = new Date();
            var curTime = Date.parse(date);
            if(team.endTime - curTime > totalTime - sprintStart[0]){
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
          res.redirect("/");
      } else {
          team.productBacklog.push(req.body.story);
          team.save();
          res.redirect("/" + team._id + "/productBacklog");
      }
  })
});

app.post("/:team_id/productBacklog/update", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          var rearrangedIndex = req.body.rearrangedIndex
          var temp = []
          for(var i = 0; rearrangedIndex != undefined && i < rearrangedIndex.length; i++){
              temp.push(team.productBacklog[rearrangedIndex[i]]);
          }
          team.productBacklog = temp;
          team.save();
          res.redirect("/" + team._id + "/productBacklog");
      }
  })

});

app.post("/create_session/productBacklog/delete", function(req, res){
  Session.findOne({status:1},function(err,ses){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          var index = req.body.index;
          ses.productBacklog.splice(index, 1);
          ses.save();
          res.redirect("/create_session/productBacklog");
      }
  })
})

app.post("/:team_id/productBacklog/delete", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          var index = req.body.index;
          team.productBacklog.splice(index, 1);
          console.log("Deleted pb" + index);
          team.save();
          res.redirect("/" + team._id + "/productBacklog");
      }
  })
})

//============
// Sprint Points
//============

app.get("/:team_id/estimateSprintPoints", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
    if(err){
        console.log(err);
        res.redirect("/");
    }
    else{
        var date = new Date();
        var curTime = Date.parse(date);
        if(team.endTime - curTime > totalTime - sprintStart[0]){
          res.render("estimateSprintPoints", {team: team});
        } else {
          res.redirect("/" + team._id + "/productBacklog");
        }
      }
  })
});

app.post("/:team_id/estimateSprintPoints", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
     if(err){
       console.log(err);
       res.redirect("/");
     }
     else{
      for(let i=0;i < numofSprints; i++){
            team.sprintPoints[i].estimate=req.body.estimatedSprintPoints[i];
        }
        team.save();
      res.redirect("/" + req.params.team_id + "/releasePlan");
    }
  });
})

//============
// Release Plan
//============



app.get("/:team_id/releasePlan", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        if(team.timerFlag == 1){
          res.render("releasePlan.ejs", {team: team});
        } else {
          res.redirect("/" + team._id + "/productBacklog");
        }
      }
  })
});

app.post("/:team_id/releasePlan", function(req, res){
  Team.findById(req.params.team_id, function(err, team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
        for(let i=0; team.productBacklog != undefined && i < team.productBacklog.length; i++){
            team.productBacklog[i].releasePlan=req.body.releasePlanValue[i];
        }
        team.save();
        res.redirect("/" + req.params.team_id + "/releasePlan");
      }
    });
})

app.get("/:team_id/releasePlan/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          var date = new Date();
          var curTime = Date.parse(date);
          if(team.endTime - curTime > totalTime - sprintStart[0]){
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
          res.redirect("/");
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
            res.redirect("/" + team._id + "/releasePlan");
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
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
        var date = new Date();
        var curTime = Date.parse(date);
        if(team.timerFlag == 0 || team.endTime - curTime > totalTime - sprintStart[req.params.sprint_id - 1]){
          res.redirect("/");
        } else {
            res.locals.currentSprint = req.params.sprint_id;
            res.render("poSelectStories", {team: team, sprint_id: req.params.sprint_id});
        }
      }
  });
});

app.post("/:team_id/:sprint_id/selectStories/update", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        var checked = req.body.checked;
        var index = 0;
        for(var i = 0; team != undefined && team.productBacklog != undefined && i < team.productBacklog.length; i++){
          if(i == checked[index]){
              team.productBacklog[i].sprintID = req.params.sprint_id;
              index++;
          }
        }
        team.save();
        res.redirect("/"+req.params.team_id+"/"+req.params.sprint_id+"/selectStories");
      }
    });
});

app.get("/:team_id/:sprint_id/estimateStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
    if(err){
      console.log(err);
      res.redirect("/");
    } 
    else{
      var date = new Date();
      var curTime = Date.parse(date);
      if(team.timerFlag == 0 || team.endTime - curTime > totalTime - sprintStart[req.params.sprint_id - 1]){
        res.redirect("/");
      } else {
        res.locals.currentSprint = req.params.sprint_id;
        res.render("estimate_stories", {team: team, sprint_id: req.params.sprint_id});
      }
    }
  });
});

app.post("/:team_id/:sprint_id/estimateStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      var points = req.body.points;
      var index = 0;
      for(var i = 0; team != undefined && team.productBacklog != undefined && i < team.productBacklog.length; i++){
          if(team.productBacklog[i].sprintID == req.params.sprint_id){
              team.productBacklog[i].points = points[index++];
          }
      }
      team.save();
      res.redirect("/"+req.params.team_id+"/"+req.params.sprint_id+"/estimateStories");
    }
  });
});

//===============
// Task Routes
//===============

app.get("/:team_id/:sprint_id/devTasks", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
        var date = new Date();
        var curTime = Date.parse(date);
        if(team.timerFlag == 0 || team.endTime - curTime > totalTime - sprintStart[req.params.sprint_id - 1]){
          res.redirect("/");
        } else {
          res.locals.currentSprint = req.params.sprint_id;
          res.render("devTasks", {team: team, sprint_id: req.params.sprint_id});
        }
    }
  });
});

app.get("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
        var date = new Date();
        var curTime = Date.parse(date);
        if(team.timerFlag == 0 || team.endTime - curTime > totalTime - sprintStart[req.params.sprint_id - 1]){
            res.redirect("/");
        } else {
            res.locals.currentSprint = req.params.sprint_id;
            if(team.endTime - curTime > totalTime - sprintEnd[req.params.sprint_id-1]){
              res.render("addTask", {team: team,sprint_id: req.params.sprint_id,us_id: req.params.us_id});
            } else {
              res.redirect("/" + team._id + "/" + req.params.sprint_id + "/devTasks");
            }
          }
      }
  })
});
////////////////////////////////////////////////////////////////////////
app.post("/:team_id/:sprint_id/devTasks/:us_id/new", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
            team.productBacklog[req.params.us_id].tasks.push(req.body.task);
            team.save();
            res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
        }
    });
});

app.post("/:team_id/:sprint_id/devTasks/:us_id/finish", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
            team.productBacklog[req.params.us_id].status=1;
            team.save();
            res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
        }
    });
});

app.post("/:team_id/:sprintID/devTasks/:us_id/delete", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          var index = req.body.index;
          team.productBacklog[req.params.us_id].tasks.splice(index, 1);
          console.log("Deleted task" + index + "from "+ req.params.us_id);
          team.save();
          res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/devTasks");
      }
  })
})

app.get("/:team_id/:sprint_id/devStorySelection", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      }
      else{
        res.locals.currentSprint = req.params.sprint_id;
        res.render("devStorySelection", {team: team, sprint_id: req.params.sprint_id});
      }
  });
});

app.post("/:team_id/:sprint_id/devStorySelection", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      }
      else{
        var checkeddev = req.body.checkeddev;
        var f=0;
        var index=0;
        for(var i = 0; team != undefined && team.productBacklog != undefined && i < team.productBacklog.length; i++){
          if(checkeddev && i == checkeddev[index]){
              if(team.productBacklog[i].takenBy == "nought"){
                team.productBacklog[i].takenBy = res.locals.currentUser.email;
                team.productBacklog[i].takenByName = res.locals.currentUser.name;
              }
              else if(team.productBacklog[i].takenBy != res.locals.currentUser.email){
                f=1;
              }
              index++;
          }
          else {
            if(team.productBacklog[i].takenBy == res.locals.currentUser.email && team.productBacklog[i].sprintID == req.params.sprint_id){
              team.productBacklog[i].takenBy = "nought";
              team.productBacklog[i].takenByName = "";
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
      }
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
          res.redirect("/");
      } else {
          res.locals.currentSprint = req.params.sprint_id;
          res.render("finishedUserStories", {team: team,sprint_id: req.params.sprint_id});
      }
  })
});

app.post("/:team_id/:sprint_id/finishedUserStories/:us_id/:status", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
    var flag = 0;
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
            console.log("reached",req.params.status);
            if(req.params.status == "accept"){
            flag = 1;
            // console.log("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories/" + req.params.us_id + "/accept/actualPoints");
            }
            else{
              team.productBacklog[req.params.us_id].takenBy="nought";
              team.productBacklog[req.params.us_id].takenByName="";
              team.productBacklog[req.params.us_id].status=0;
              team.productBacklog[req.params.us_id].sprintID=0;
              team.productBacklog[req.params.us_id].points=0;
              team.productBacklog[req.params.us_id].tasks=[];
            }
            team.save();

            if(flag)
                res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories/" + req.params.us_id + "/accept/actualPoints");
            else
                res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories");
        }
    });
});


app.get("/:team_id/:sprint_id/finishedUserStories/:us_id/accept/actualPoints", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
          res.locals.currentSprint = req.params.sprint_id;
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
          res.redirect("/");
      } else {
        if(team.productBacklog[req.params.us_id].status==2){
          team.sprintPoints[req.params.sprint_id-1].burned -= team.productBacklog[req.params.us_id].points;
        }
        team.productBacklog[req.params.us_id].status=2;
        team.productBacklog[req.params.us_id].points = parseInt(req.body.actualPoints,10);
        team.sprintPoints[req.params.sprint_id-1].burned += parseInt(req.body.actualPoints,10);
        team.save();
        res.redirect("/" + team._id + "/"+ req.params.sprint_id + "/finishedUserStories");
      }
  })
});

app.post("/:team_id/:sprint_id/rejectRemainingStories", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
      } else {
      for(var i = 0; team != undefined && team.productBacklog != undefined && i < team.productBacklog.length; i++){
          if(team.productBacklog[i].sprintID == req.params.sprint_id && team.productBacklog[i].status != 2){
              team.productBacklog[i].takenBy="nought";
              team.productBacklog[i].takenByName="";
              team.productBacklog[i].status=0;
              team.productBacklog[i].sprintID=0;
              team.productBacklog[i].points=0;
              team.productBacklog[i].tasks=[];
          }
      }
      team.save();
      if(req.params.sprint_id < numofSprints){
          res.redirect("/" + team._id + "/"+ (req.params.sprint_id + 1) + "/selectStories");
      } else {
      // Route to project Review
          res.redirect("/" + team._id + "/productReview");
      }
    }
      
  });
});


//===================
// Sprint Text Routes
//===================

app.get("/:team_id/:sprintNo/planSummaryDisplay",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;
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
    }
  });
});

app.get("/:team_id/:sprintNo/planSummary",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;
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
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
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
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;

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
      }``
    }
  });
});

app.get("/:team_id/:sprintNo/sprintRetrospective",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console,log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;
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
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
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
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;

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
    }
  });
});

app.get("/:team_id/:sprintNo/sprintReview",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console,log(err);
      res.redirect("/");
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
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id,function(err,team){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      res.locals.currentSprint = req.params.sprintNo;


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
// Product Review
//===============

app.get("/:team_id/productReview", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.redirect("/");
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
          res.redirect("/");
      } else {
          res.render("updateProductReview", {team: team});
      }
  })
});

app.post("/:team_id/productReview/update", function(req, res){
  if(!req.user)
      res.redirect("/auth/google");
  Team.findById(req.params.team_id, function(err, team){
      if(err){
          console.log("Error: ", err);
          res.render("/");
      } else {
          team.productReview = req.body.productReview;
          team.save();
          res.redirect("/" + team._id + "/productReview");
      }
  })
});

//===============
// Creating teams
//===============

app.get("/create_session",function(req,res){
  res.render("create_session");
});

app.post("/create_session",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  console.log("Session Name:"+ req.body.sessionname);
  Session.updateMany({},{status:0},function(err,ses){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
    Session.create({username:req.body.sessionname,status:1,caseTitle:req.body.caseTitle,numofSprints: parseInt(req.body.numofSprints)},function(err,ses){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        console.log("1st Session: "+ses);
        res.redirect("/create_session/timeDetails");
      }
      });
    }
  });
});

app.get("/create_session/timeDetails",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
    Session.findOne({status:1},function(err,ses){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        console.log(ses);
        var numofSprints = ses.numofSprints;
        res.render("timeDetails",{numofSprints: numofSprints});
      }
    })
});

app.post("/create_session/timeDetails",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Session.findOne({status:1},function(err,ses){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      ses.pbTime = req.body.pbTime;
      ses.productReviewTime = req.body.productReviewTime;
      ses.sprintTime = req.body.sprintTime;
      ses.save();
      res.redirect("/create_session/caseStudyDetails");
    }
  })
});

app.get("/create_session/caseStudyDetails",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Session.findOne({status:1},function(err,ses){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      var numofSprints = ses.numofSprints;
      res.render("caseStudyDescription");
    }
  })
});

app.post("/create_session/caseStudyDetails",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  Session.findOne({status:1},function(err,ses){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      ses.caseStudyDescription = req.body.caseStudyDescription;
      ses.caseStudyImg = req.body.caseStudyImg;
      ses.save();
      res.redirect("/create_session/productBacklog");
    }
  })
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
    if(!req.user)
    res.redirect("/auth/google");
    req.user.role="Product Owner";
    req.user.save();
    var team_id;

    Team.create({username:req.body.teamname},function(err,team){

      if(err){
        console.log("Error is:"+err);
        res.redirect("/");
      }
      else  {
        team_id = team._id;
        team.members.push(req.user._id);
        team.productBacklog = [];
        team.releasePlanName.push({name: "Add to a release"});
        for(var i = 0; i < numofSprints; i++){
          team.sprintPoints.push({burned:0,estimate:0});
        }
        Session.findOne({status:1},function(err,ses){
          ses.teams.push(team._id);
          ses.save();
          req.user.teams.push(team._id);
          req.user.currentTeam = team._id;
          req.user.currentSession = ses._id;
          req.user.save();
          team.productBacklog = ses.productBacklog;
          team.save();
          for (var i = 0; i < req.body.stud.length; i++) {
              if(req.body.stud[i]!=null && req.body.sel[i] == 'Scrum Master'){
                User.findOne({email:req.body.stud[i]},function(err,student){
                    if(student!=null){

                      student.invitations.push({
                        sender:req.user.email,
                        teamname: req.body.teamname,
                        role: "Scrum Master"
                      });

                      student.save();
                    }
                  });
                }
          }

          for (var i = 0; i < req.body.stud.length; i++) {
              if(req.body.stud[i]!=null && req.body.sel[i] == 'Developer'){
                User.findOne({email:req.body.stud[i]},function(err,student){
                  if(err){
                    console.log(err);
                    res.redirect("/");
                  }
                  else{
                      if(student!=null){

                        student.invitations.push({
                          sender:req.user.email,
                          teamname: req.body.teamname,
                          role: "Developer"
                        });

                        student.save();
                      }
                    }
                    });
                }
          }

          res.redirect("/" + team._id + "/home");
      });
      }
            
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
  if(!req.user)
      res.redirect("/auth/google");
  var team_id;
  User.findById(req.user.id,function(err,user){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        user.role=req.params.rl;
        user.invitations=[];
        user.save();
        Team.findOne({username:req.params.tn},function(err,team){
          if(err){
            console.log(err);
            res.redirect("/");
          }
          else{
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
            }
        });
      }
  });
  //console.log("My team: "+req.params.tn);
});

app.post("/reject_request/:id",function(req,res){
  if(!req.user)
      res.redirect("/auth/google");
  var invites=[];
  req.user.invitations.forEach(function(invite){
      if(invite.teamname==req.params.id) {
          console.log("Invite: "+ invite);
      }
      else{
        invites.push(invite);
      }
  });
  User.findByIdAndUpdate(req.user.id,{invitations:invites},function(err,user){
    if(err){
      console.log(err);
    }
    else{
      console.log("User invite changes: "+user);
    }
  });
  req.user.save();
  res.redirect("/");
});

//===============
// ADMIN Routes
//===============

app.get('/sessions', function(req, res){
  if(req.user.role != 'admin')
    res.redirect('/');
  Session.find({}, function(err, sessions){
    if(err){
      console.log(err);
      res.redirect('/');
    } else {
      res.render("admin_sessions", {sessions: sessions});
    }
  });
});

app.get('/:session_id/teams', function(req, res){
  if(req.user.role != 'admin')
    res.redirect('/');
  Session.findById(req.params.session_id).populate('teams').exec(function(err, session){
    if(err){
      console.log(err);
      res.redirect('/');
    } else {
      res.render("admin_teams", {teams: session.teams, session: session.username});
    }
  })
});

app.get('/:team_id/report', function(req, res){
  if(req.user.role != 'admin')
    res.redirect('/');
  Team.findById(req.params.team_id).populate('members').exec(function(err, team){
    if(err){
      console.log(err);
      res.redirect('/');
    } else {
      res.render("team_report", {team: team});
    }
  })
});

//===============
// Direction Routes
//===============

app.get("/directions",function(req,res){
  res.render("directions");
  console.log("Instructions: done");
});

//===============
// Auth Routes
//===============

app.get('/flash', function(req, res){
  // Set a flash message by passing the key, followed by the value, to req.flash().
  req.flash('info', 'Flash is back!')
  res.redirect('/');
});

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
