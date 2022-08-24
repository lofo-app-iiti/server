const express = require('express');
const route = express.Router();
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user')
const Item = require('../models/item')
const { genToken } = require('../middleware/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

route.post('/', (req, res, next) => {
    const { name , email } = req.body;
    
    async function foundAndSend(user) {
        let user1 = { ...user._doc};
        await Item.find({ _id: { $in: user.favourites } })
            .select('price title images')
            .sort({ date: 'desc' })
            .then(items => {
                user1.favourites = items
            })
            .catch(next);

        await Item.find({ _id: { $in: user.ads } })
            .select('price title images')
            .sort({ date: 'desc' })
            .then(items => {
                user1.ads = items;
            })
            .catch(next);

        const accessToken = genToken({ email: user.email, id: user._id })
        res.status(200).send({ user: user1, accessToken });
    };

    function createdAndSend(user) {
        const accessToken = genToken({ email: user.email, id: user._id })
        res.status(200).send({ user: user, accessToken });
    };

    User.findOne({ email })
        .then((user) => {
            if (user) {
                foundAndSend(user);
            } else {
                User.create({ name, email})
                    .then(user => {
                        createdAndSend(user);
                    })
            }
        })
        .catch(next);
});

module.exports = route;