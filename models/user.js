var mongoose=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");
var userSchema=new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: {type:String,default:""},
  name: {type:String,default:""},
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
  currentTeam: {type:String,default:""},
  currentSession: {type:String,default:""}
});
userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);
