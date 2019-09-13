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
    value: String
  }]
});
teamSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Team",teamSchema);
