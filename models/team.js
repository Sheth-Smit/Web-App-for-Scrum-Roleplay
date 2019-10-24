var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var teamSchema=new mongoose.Schema({
  username: String,
  members:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  }],
  productBacklog:[{
    role: String,
    action: String,
    benefit: String,
    value: String,
    releasePlan : {type:String,default:"Add to a release"},
    tasks: [{
      description: String,
      points: Number
    }], 
    sprintID: {type: Number, default: 0},
    takenBy: {type: String, default: "nought"},
    points: {type: Number, default: 0},
    status:{type: Number, default: 0}
  }],
  releasePlanName : [{
    name: String
  }],
  sprint:[{
    planSummary: {type:String,default:""},
    review:{type:String,default:""},
    retrospective:{type:String,default:""}
  }]
});
teamSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Team",teamSchema);
