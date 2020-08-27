var mongoose=require("mongoose");
var transactionSchema=new mongoose.Schema({
    totalamount:String,
    note_2000:String,
    q_2000:String,
    note_500:String,
    q_500:String,
    note_200:String,
    q_200:String,
    note_100:String,
    q_100:String,
    note_50:String,
    q_50:String,
    note_20:String,
    q_20:String,
    note_10:String,
    q_10:String,
    dealer:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Dealer"
    },
    from:{
        type:String,
        default:null
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
        },
    date: {
        type: Date,
        default: Date.now
    }
},
     { timestamps: true }
);

module.exports=mongoose.model("Transaction",transactionSchema);