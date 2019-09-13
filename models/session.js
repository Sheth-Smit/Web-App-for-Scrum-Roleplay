var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var sessionSchema=new mongoose.Schema({
  username: String,
  status: Number,
  Date: {type:Date,default:Date.now},
  teams:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Team"
  }]
});
sessionSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Session",sessionSchema);
