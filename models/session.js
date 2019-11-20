var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var sessionSchema=new mongoose.Schema({
  username: String,
  status: Number,
  Date: {type:Date,default:Date.now},
  teams:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Team"
  }],
  caseTitle: String,
  caseStudyDescription: {type:String,default:""},
  productBacklog:[{
    role: String,
    action: String,
    benefit: String,
    value: String,
    tasks: [{
      description: String,
      points: Number
    }]
  }],
  caseStudyImg: {type:String,default:""},
  numofSprints: {type:Number,default:0},
  pbTime: {type:Number,default:0},
  productReviewTime: {type:Number,default:0},
  sprintTime: []
});
sessionSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Session",sessionSchema);
