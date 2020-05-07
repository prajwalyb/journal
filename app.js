//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose")

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB",{useNewUrlParser:true,useUnifiedTopology:true});

let posts = [];

const blogEntrySchema = new mongoose.Schema({
  title:String,
  content:String
});

const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  blogs:[blogEntrySchema]
})

userSchema.plugin(passportLocalMongoose);

const Entry = mongoose.model("Entry",blogEntrySchema);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get("/", function(req, res){

  res.render("home.ejs");
  });

app.get("/dashboard",function(req,res){
  console.log(req.user.id);
  User.findById(req.user.id,function(err,foundUser){
    if(!err){
      res.render("dashboard", {
        posts: foundUser.blogs
        });
    }
  })
})


app.get("/signup", function(req, res){
  res.render("signup");
});

app.get("/login", function(req, res){
  res.render("signin");
});

app.get("/compose", function(req, res){
  res.render("compose");
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.get("/posts/:postName", function(req, res){
  const requestedTitle = _.lowerCase(req.params.postName);
  Entry.findOne({title:requestedTitle},function(err,entry){
    if(!err){
      res.render("post",{title:entry.title,
                          content:entry.content})
    }
  })


});

app.post("/signup",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/login");
      });
    }
  });
});

app.post("/login",function(req,res){
  const user = User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/dashboard");
      });

    }
  });

});

app.post("/compose", function(req, res){
  User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        const post = new Entry({
          title: _.lowerCase(req.body.postTitle),
          content: req.body.postBody
        });
        foundUser.blogs.push(post);
        foundUser.save();

        res.redirect("/dashboard");
      }

    }
  })


});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
