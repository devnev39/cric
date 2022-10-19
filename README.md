# Cric

Cric is a web application designed to conduct a cricket auction. It is a web application (without a front end). 

# Properties

It uses MongoDB for storing the players and teams. It will create a database with the name cric and init two collections namely players and teams which will contain the players.

Players can be added to the database via JSON file.

### Player Schema : 

    SRNO : Number
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


### Team Schema : 

    No : Number,
    Name : String,
    Budget : Number,
    Current : Number,
    Players : {type : [playerSchema]},
    Score : Number

# Features

1. Upload JSON file
2. Upload/Change Image URLs
3. Search, delete, and add players
4. Live team stats
