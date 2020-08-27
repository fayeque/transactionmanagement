var mongoose=require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var managerSchema=new mongoose.Schema({
    username:String,
    name:String,
    password:String
    },
    { timestamps: true }
);
managerSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("Manager",managerSchema);