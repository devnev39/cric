require("dotenv").config();
const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const PORT = 3000;

const app = express();

const SDATableLen = 15;

// 1. Set EJS
// 2. static files
// 3. BodyParser

app.set("view engine","ejs");
app.use(express.static("public/"));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

mongoose.connect("mongodb+srv://devnev:Password-123@cluster0.uayzvos.mongodb.net/cric");

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
    IMGURL : String,
    SOLD : {type : String,default : "None"},
    SoldPrice : Number
});

const teamSchema = new mongoose.Schema({
    No : Number,
    Name : String,
    Budget : Number,
    Current : Number,
    Players : {type : [playerSchema]},
    Score : Number
});

const Player = mongoose.model("Player",playerSchema);
const Team = mongoose.model("Team",teamSchema);

let __DBLEN = 0;

let Teams = null;

app.get("/",(req,res) => {
    res.render("router",{title : "Router"});
});

app.route("/sda")
.get(async (req,res) => {
    res.render("sda",{title : "SDA",tableLen : SDATableLen,total : __DBLEN});
})
.post(async (req,res) => {
    // 1 -> get player list request
    // 2 -> remove player from list request
    const opt = req.body;
    if(opt.type == 1){
        const count = opt.current;
        const data = await Player.find({SRNO : {$gt : count-1, $lt : count+SDATableLen}});
        res.json({data : data});
    }
    if(opt.type == 2){
        await Player.deleteOne({SRNO : opt.srno});
        let result = await Player.updateMany({SRNO : {$gt : opt.srno}},{$inc : {SRNO : -1}});
        if(result.acknowledged) res.json({status : 200});
        else res.json({status : "Error !"});
    }
}); 

app.route("/new")
.get((req,res) => {
    res.render("new",{title : "New"});
})
.post(async (req,res) => {
    let opt = req.body;
    opt.SRNO = __DBLEN+1;
    const player = new Player(opt);
    player.save((err,result) => {
        if(err) res.json({status : err});
        else res.json({status : 200,srno : opt.SRNO});
    });
    __DBLEN = await Player.countDocuments();
});

app.route("/upload")
.get((req,res) => {
    res.render("upload",{title : "Upload"});
})
.post(async (req,res) => {
    if(req.body.filename){
        // Convert JSON to Obj
        // Append to new Mongo DB collection and overwrite if there is already by permission
        // Redirect to main page with data
        bcrypt.compare(req.body.pass,process.env.SECRET,async (result) => {
            if(result){
                const raw = fs.readFileSync(req.body.filename);
                const data = JSON.parse(raw);
                for(let i=0;i<data.data.length;i++){
                    const player = new Player(data.data[i]);
                    await player.save();
                }
                res.json({message : "Success !"});
            }else res.json({message : "Invalid pass !"});
        });
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
            console.log(req.body.teamName);
            const result =await Team.updateOne({No : req.body.teamIndex},{Name : req.body.teamName,Budget : req.body.teamBudget,Current:req.body.teamBudget});
            msg = "update";
        }else{
            const t = new Team({
                No : req.body.teamIndex,
                Name : req.body.teamName,
                Budget : req.body.teamBudget,
                Current : req.body.teamBudget,
                Score : 100
            });
            await t.save();
        }
    }else{
        msg = "error";
    }
    res.json({message : msg});
    Teams = await Team.find();
});

app.get("/getTeams",(req,res) => {
    res.json({teams : Teams});
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

app.route("/main/:srno")
.get(async (req,res) => {
    if(isNaN(+req.params.srno)){
        return;
    }
    const player = await Player.find({SRNO : req.params.srno});
    if(player.length){
        player[0].flagURL = `https://countryflagsapi.com/png/${player[0].Country}`;
        res.render("main",{title : "Main",player : player[0], total : __DBLEN, teams : Teams});
    }
})
.post(async (req,res) => {
    const teamIndex = req.body.teamIndex;
    const playerIndex = req.body.player;
    const bidPrice = req.body.bidPrice;
    const team = await Team.find({No : teamIndex});
    const player = await Player.find({SRNO : playerIndex});

    if(player[0].SOLD != "None"){
        res.json({status : "Player already taken !"});
    }else{
        player[0].SOLD = team[0].Name;
        player[0].SoldPrice = bidPrice;
        await player[0].save();
        team[0].Players.push(player[0]);
        await team[0].save();
        let score = Math.round(((player[0].AuctionedPrice - bidPrice)*100)/player[0].AuctionedPrice,2);
    
        const resp = await Team.updateOne({No : teamIndex},{$inc : {Current : -bidPrice,Score : score}});
        if(resp.acknowledged){
            res.json({status : 200});
        }else{
            res.json({status : "Error from server !"});
        }
    }
    Teams = await Team.find();
});

app.get("/stat",(req,res) => {
    res.render("stat",{title : "Stats"});
});

app.route("/reset")
.post(async (req,res) => {
    if(req.body.reset){
        try {
            bcrypt.compare(req.body.pass,process.env.SECRET).then(async (result) => {
                console.log(result);
                if(result){
                    mongoose.connection.db.dropCollection('teams');
                    const result = await Player.updateMany({SRNO : {$gt : 0}},{$set : {SOLD : "None"}});
                    if(result.acknowledged){
                        res.json({status : 200});
                    }else{
                        res.json({status : "Error from server !"});
                    }    
                }else{
                    res.json({status : "Invalid pass !"});
                }
            })
        } catch (error) {
            res.json({status : error.message});
        }
        
    }else{
        res.json({status : "Error from client !"});
    }
    Teams = await Team.find();
});

app.post("/auth",(req,res) => {
    bcrypt.compare(req.body.pass,process.env.SECRET,(err,result) => {
        res.json({result : result});
    });
});

app.listen(PORT,async () => {
    __DBLEN = await Player.countDocuments();
    Teams = await Team.find();
    // console.log(Teams);
    console.log(`Server started on ${PORT}`);
});