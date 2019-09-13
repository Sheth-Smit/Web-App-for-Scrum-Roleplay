var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var inviteSchema=new mongoose.Schema({
    sender: String,
    teamid: String,
    receiver: String
});
inviteSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Invitation",userSchema);
