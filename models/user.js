var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var userSchema=new mongoose.Schema({
  username: String,
  email: String,
  role: String,
  name: String,
  invitations:[{
    sender: String,
    receiver:String,
    role: String,
    teamname: String
  }],
  teams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team"
    }
  ],
  currentTeam: String,
  currentSession: String
});
userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);
