var express=require("express");
var app= express();
var bodyParser=require("body-parser");
var mongoose = require("mongoose");
var passport=require("passport");
var localStrategy=require("passport-local").Strategy;
var passportLocalMongoose=require("passport-local-mongoose");
var Dealer=require("./models/Dealer");
var Manager=require("./models/Manager");
var Transaction=require("./models/Transaction");
var flash=require("connect-flash");
var cookieParser=require("cookie-parser");
const { populate } = require("./models/Dealer");


const PORT = process.env.PORT || 5000;

app.use(cookieParser());
app.use(require("express-session")({
    secret:"my name is khan",
    resave:false,
    saveUninitialized:false,
    cookie:{maxAge:60*60*1000}
    }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(Manager.authenticate()));
passport.serializeUser(Manager.serializeUser());
passport.deserializeUser(Manager.deserializeUser());


mongoose.set('useNewUrlParser',true);
mongoose.set('useUnifiedTopology',true);
mongoose.set('useFindAndModify',false);
mongoose.set('useCreateIndex',true);
mongoose.connect("mongodb+srv://fayeque123:fayeque123@devconnector-mxfos.mongodb.net/test?retryWrites=true&w=majority");
// mongoose.connect("mongodb://localhost/yelp_cam");
app.use(bodyParser.urlencoded({extended:true}));
app.use(flash());
app.use(express.static(__dirname + "/public"));
app.set("view engine","ejs");


app.use(function(req, res, next){
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
 });

 app.get("/register",async (req,res) => {
    res.render("register.ejs");
 });

 app.post("/register",async (req,res) => {
     var user= await Manager.findOne({username:req.body.username});
     if(user){
         req.flash("e(rror","E-mail already in use");
         return res.redirect("/register");
     }
     var newUser=await new Manager({username:req.body.username,name:req.body.name});

     Manager.register(newUser,req.body.password,async (err,userr) => {
        if(err){
            console.log(err);
            req.flash("error","Email is already in use.");
            res.redirect("back");
        }else{
            passport.authenticate("local")(req,res,function(){
                req.flash("success","Successfully registered and login");
                res.redirect("/");
            })
        }
     })
 })

 app.get("/login",(req,res) => {
     res.render("login.ejs");
 });

 app.post("/login",passport.authenticate("local",{
     successRedirect:"/",
     failureFlash:"Wrong credential",
     failureRedirect:"/login"
 }),function(req,res){})


app.get("/",async (req,res) => {
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        var dealers=await Dealer.find({name:regex}).lean();
        var noMatch;
        if(dealers.length < 1){
            noMatch="No dealers found";
        }
        res.render('landing',{dealers:dealers,noMatch:noMatch});
    }else{
        var noMatch;
        if(req.user){
            var dealers = await Dealer.find({userId:req.user._id});
            console.log(req.user);
            res.render('landing',{dealers:dealers,noMatch:noMatch,user:req.user});
        }
        else{
            res.render('landing',{dealers:[],noMatch:noMatch,user:undefined})
        }
        

    }
});

app.get("/addDealer",(req,res) => {
    res.render("addDealer");
});

app.post("/addDealer",async (req,res) => {
    var dealerObj={
        name:req.body.name,
        accountNumber:req.body.accountNumber,
        IFSC:req.body.IFSC,
        bankName:req.body.bankName,
        userId:req.user._id
    }
    console.log(dealerObj);
    var dealer=await Dealer.create(dealerObj);
    await dealer.save();
    req.flash('success',"Dealer added successfully");
    res.redirect("/");
});

app.get("/addTransaction/:dealer_id",auth,async (req,res) => {
    var dealer=await Dealer.findOne({_id:req.params.dealer_id},{"name":1});
    console.log(dealer);
    res.render("addTransaction",{dealer:dealer});
})

app.post("/addTransaction/:dealer_id",async (req,res) => {
    console.log("req body",req.body);
    var obj=req.body;
    if(req.body.from){
        obj.from=req.body.from.toLowerCase();
    }
    
    obj.dealer=req.params.dealer_id;
    obj.userId=req.user._id;
    console.log(obj);
    var transaction = await Transaction.create(obj);
    await transaction.save();
    console.log(transaction);
    req.flash("success","Transaction added successfully");
    res.redirect("/");
});

async function auth(req,res,next){
    var dealer=await Dealer.findOne({_id:req.params.dealer_id},{"userId":1});
    if(dealer.userId.toString() == req.user._id){
        next();
    }else{
        req.flash("error","You are not allowed to do that operation")
        res.redirect("/");
    }
}

app.get("/viewTransactions/:dealer_id",async (req,res) => {
    console.log(req.params.dealer_id);
    await Transaction.find({dealer:req.params.dealer_id}).sort({createdAt:-1}).lean().populate("dealer","name accountNumber").select("dealer totalamount createdAt").exec((err,trans) => {
        if(err){
            console.log(err);
        }
        else{
            var totalAmount=0;
            trans.forEach((tran) => {
                totalAmount=totalAmount + parseInt(tran.totalamount);
            });
            console.log(trans);
            res.render("viewTransaction",{transactions:trans,total:totalAmount});
        }
    });
});

app.get("/viewDetail/:trans_id",(async (req,res) => {
    await Transaction.findOne({_id:req.params.trans_id}).populate("dealer","name").exec((err,tran) => {
        if(err){
            console.log(err);
        }
        else{
            console.log(tran);
            res.render("viewDetail",{t:tran});
        }
    })
}));

app.get("/showLimit",async (req,res) => {
    var tran=await Transaction.aggregate([
        {$match:{"userId":req.user._id}},
        {$group:{_id:{"from":"$from","date":{$month:"$date"}},"monthly":{$sum:{$toInt:"$totalamount"}},"dt":{$push:{"d":"$date","a":"$totalamount"}}}},
        {$sort:{"_id.from":-1,"_id.date":1}}
    ]);
        // {$lookup:{
        //     from:"dealers",
        //     localField:"_id.dealers",
        //     foreignField:"_id",
        //     as:"dealers_info"
        // }}
        
        // {$project:{_id:1,total:1,dealers:1,name:"$dealers_info.name",account:"$dealers_info.accountNumber"}}
   if(tran.length < 1){
       req.flash("error","No transaction yet");
       return res.redirect("/");
   }
    console.log(tran);
    var obj={};
    tran.forEach((t) => {
        if(obj[t._id.from] == undefined){
            obj[t._id.from]=t.monthly
        }else{
            obj[t._id.from]=obj[t._id.from]+t.monthly
        }
        
    })
    console.log("obj",obj);
    // console.log(typeof(tran[0].dates[0]));
    // console.log(tran[1].dt);
    // console.log(tran[2]._id.dealers);
    // console.log(tran[1].dealers);
    // res.redirect("/");

    var mnth={
        1:"January",
        2:"February",
        3:"March",
        4:"April",
        5:"May",
        6:"June",
        7:"July",
        8:"August",
        9:"September",
        10:"October",
        11:"November",
        12:"December"
    }
    res.render("showLimit",{t:tran,obj:obj,month:mnth});
});


app.get("/allTransactions",async (req,res) => {
    var tran= await Transaction.aggregate([
        {$match:{"userId":req.user._id}},
        {$group:{_id:{$month:"$date"},"monthly":{$sum:{$toInt:"$totalamount"}},"detail":{$push:{"d":"$dealer","a":"$totalamount","dt":"$date"}}}},
        {$lookup:{
            from:"dealers",
            localField:"detail.d",
            foreignField:"_id",
            as:"dealers_info"
        }},
        {$sort:{"detail.dt":-1}}
    ]);
    if(tran.length < 1){
        req.flash("error","No transaction yet");
        return res.redirect("/");
    }
    var total=0;
    var r={};
    tran.forEach((trn) => {
        trn.dealers_info.forEach((dealer) => {
            r[dealer._id.toString()]={"name":dealer.name,"bank":dealer.bankName};
        });

        trn.detail.forEach((de) => {
                    de["name"]=r[de.d].name;
                    de["bank"]=r[de.d].bank;
                // r[de.d].transaction.push({"a":de.a,"d":de.dt});
            })
        total=total+trn.monthly;
    });
    // console.log("_-----------",r);
    // console.log(tran);
    // console.log(tran[0].detail);
    // console.log(tran[1].detail);
    // console.log(tran[0].dealers_info);
    var mnth={
        1:"January",
        2:"February",
        3:"March",
        4:"April",
        5:"May",
        6:"June",
        7:"July",
        8:"August",
        9:"September",
        10:"October",
        11:"November",
        12:"December"
    }

    res.render("allTransaction",{t:tran,total:total,month:mnth});
});

app.get("/edit/:dealer_id",async (req,res) => {
    var dealer=await Dealer.findOne({_id:req.params.dealer_id}).lean();
    console.log(dealer);
    res.render("editDealer",{dealer,dealer});
});

app.post("/edit/:dealer_id",async (req,res) => {
    var dealer=await Dealer.findByIdAndUpdate({_id:req.params.dealer_id},req.body);
    await dealer.save();
    console.log(dealer);
    req.flash('success',"Dealer info updated");
    res.redirect("/");
});

app.get("/editDetail/:t_id",async (req,res) => {
    // var dealer=await Dealer.findOne({_id:req.params.dealer_id},{"name":1});
    // console.log(dealer);
    res.render("editTransaction",{t_id:req.params.t_id});
})
app.post("/editDetail/:t_id",async (req,res) => {
    var obj=req.body;
    if(req.body.from){
        obj.from=req.body.from.toLowerCase();
    }
    var tran= await Transaction.findByIdAndUpdate({_id:req.params.t_id},obj);
    console.log(tran);
    await tran.save();
    req.flash("success","Transaction updated successfully");
    res.redirect("/");
})
app.get("/delete/:dealer_id",async (req,res) => {
    var dealer=await Dealer.findByIdAndDelete(req.params.dealer_id);
    req.flash("success","Dealer deleted successfully");
    res.redirect("/");
})
app.get("/deleteDetail/:t_id",async (req,res) => {
    await Transaction.findByIdAndDelete(req.params.t_id)
    req.flash("success","Transaction deleted successfully");
    res.redirect("/");
})

app.get("/logout",(req,res) => {
    req.logout();
    req.flash("success","Successfully logged Out");
    res.redirect("/");
})


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


app.listen(PORT,() => console.log(`Server started at ${PORT}`));
