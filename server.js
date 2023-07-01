const express = require('express');
const keys = require('./config/key');
var cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(cors());

//connect mongodb with Mongoose
const mongoose = require('mongoose');
//moongose connect
mongoose.connect(keys.mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});

//set up model
require('./model/Account');

//Routes
require('./routes/accountRoutes')(app);

app.listen(keys.port,()=>{
    console.log(`Server is running on port ${keys.port}`);
});

