const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { ifError } = require("assert");

const PORT = 3000;

const app = express();

// 1. Set EJS
// 2. static files
// 3. BodyParser

app.set("view engine","ejs");
app.use(express.static("public/"));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

mongoose.connect("mongodb://127.0.0.1:27017/cric");

const playerSchema = new mongoose.Schema({
    SRNO : Number,
    Name : String,
    Country : String,
    PlayingRole : String,
    IPLMatches : Number,
    CUA : String,
    BasePrice : Number,
    IPL2022Team : String,
    AuctionedPrice : Number,
    IMGURL : String
});

const teamSchema = new mongoose.Schema({
    No : Number,
    Name : String,
    Budget : Number,
    Current : Number,
    Players : {type : [playerSchema],default : undefined}
});

const Player = mongoose.model("Player",playerSchema);
const Team = mongoose.model("Team",teamSchema);

app.route("/upload")
.get((req,res) => {
    res.render("upload",{title : "Upload"});
})
.post(async (req,res) => {
    if(req.body.filename){
        // Convert JSON to Obj
        // Append to new Mongo DB collection and overwrite if there is already by permission
        // Redirect to main page with data
        const raw = fs.readFileSync(req.body.filename);
        const data = JSON.parse(raw);
        for(let i=0;i<data.data.length;i++){
            const player = new Player(data.data[i]);
            await player.save();
        }
        res.json({message : "Success !"});
    }else{
        res.json({message : "filename not received !"});
    }
    
});

app.route("/teams")
.get((req,res) => {
    res.render("teams",{title : "Teams"});
})
.post(async (req,res) => {
    let msg = "ok";
    if(req.body){
        let res = await Team.find({No : req.body.teamIndex});
        if(res.length){
            res[0].updateOne({No : req.body.teamIndex},{Name : req.body.teamName});
            msg = "update";
        }else{
            const t = new Team({
                No : req.body.teamIndex,
                Name : req.body.teamName,
                Budget : 4000,
                Current : 4000
            });
            await t.save();
        }
    }else{
        msg = "error";
    }
    res.json({message : msg});
});

app.route("/update/:player")
.get(async (req,res) => {
    if(+req.params.player){
        let p = await Player.find({SRNO : req.params.player});
        res.render("update",{player : p[0],title : "Update Player"});
    }
})
.post(async (req,res) => {
    console.log(req.body);
    const url = req.body.url;
    if(url){
        let result = await Player.find({SRNO : req.params.player});
        if(result.length){
            await Player.updateOne({SRNO : result[0].SRNO},{IMGURL : url});
            res.json({status : 200});
        }else{
            res.json({status : "No player found !"});
        }
    }else{
        res.json({status : "No url provided !"});
    }
});

app.listen(PORT,() => {
    console.log(`Server started on ${PORT}`);
});