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
    sprintID: {type: Number, default: 0},
    takenBy: String,
    points: {type: Number, default: 0}
  }],
  releasePlanName : [{
    name: String
  }]
});
teamSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Team",teamSchema);
