require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const app = express();

//Connection to DB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("mongoDB connected...");
    })
    .catch((err) => {
        console.log("Failed to connect to mongoDB...")
        console.log(err.message);
    });

//bodyParser middleware 
app.use(express.json());

//API
app.use('/api', require('./API/api'));

//Error middleWare
app.use((err, req, res, next) => {
    console.log(err.message);
    res.status(500).send("Something went wrong...");
})

//Listening to requests
const port = process.env.PORT || 5000;
var server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})
const io = require('./config/socket').init(server);
io.on('connection', function (socket) {
    socket.on('join', function (email) {
        socket.join(email);
    });
})