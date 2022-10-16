const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

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

function swap(json){
    var ret = {};
    for(var key in json){
      ret[json[key]] = key;
    }
    return ret;
}

const mapping = swap(JSON.parse(fs.readFileSync("codes.json")));

let __DBLEN = 0;

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
            console.log(req.body.teamName);
            const result =await Team.updateOne({No : req.body.teamIndex},{Name : req.body.teamName});
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

app.route("/main/:srno")
.get(async (req,res) => {
    const player = await Player.find({SRNO : req.params.srno});
    if(player.length){
        player[0].flagURL = `https://countryflagsapi.com/png/${player[0].Country}`;
        res.render("main",{title : "Main",player : player[0],total : __DBLEN});
    }
    
});

app.listen(PORT,async () => {
    __DBLEN = await Player.countDocuments();
    console.log(`Server started on ${PORT}`);
});