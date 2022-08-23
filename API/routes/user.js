//Route module for handeling queries regarding user json 
const mongoose = require('mongoose')
const express = require('express');
const route = express.Router();
const User = require('../models/user')
const Item = require('../models/item')

route.get('/getUser', async (req, res) => {
    
    const email = req.auth.email

    console.log("Get user called adsad ",email)
    console.log("Returning correct")

    try{
        const user  = await User.findOne({email})
        let user1 = { ...user._doc };
        await Item.find({ _id: { $in: user.favourites } })
            .select('price title images')
            .sort({ date: 'desc' })
            .then(items => {
                user1.favourites = items
            })
            .catch(()=>{console.log("error1"); return res.status(403).json({message:"JWT Auth Failed"})});

        await Item.find({ _id: { $in: user.ads } })
            .select('price title images')
            .sort({ date: 'desc' })
            .then(items => {
                user1.ads = items;
            })
            .catch(()=>{console.log("error2"); return res.status(403).json({message:"JWT Auth Failed"})});

        console.log("no error")
        return res.status(200).send({ user: user1});
    }
    catch(error){
        console.log("error3 ",error);
        return res.status(403).json({message:"JWT Auth Failed"})
    }
})

//API handlers
//--------------------------------------------------------------------------//
//Get orders
route.get('/orders', (req, res, next) => {
    User.findById(req.auth.id)
        .then(user => {
            Item.find({ _id: { $in: user.orders } })
                .select('price title images')
                .sort({ date: 'desc' })
                .then(items => {
                    res.status(200).send(items);
                })
        })
        .catch(next);
})
//--------------------------------------------------------------------------//
//POST request:
//NIL
//-------------------------------------------------------------------------//

//Updates:
//PUT requests
//Mark an Item  favourite
route.put('/favourites/:item', (req, res, next) => {
    User.updateOne({ _id: req.auth.id },
        { "$push": { "favourites": req.params.item } }
    )
        .then(() => {
            res.status(204).end();
        }).catch(next);
})

//Mark an item for order
route.put('/order/:item', (req, res, next) => {
    User.updateOne({ _id: req.auth.id },
        { "$push": { "orders": { _id: req.params.item } } }
    )
        .then(a => {
            res.status(204).end();
        }).catch(next);
})


//Buy request/Approve Buy request
route.put('/approve/:userEmail', (req, res, next) => {
    User.findOne({
        email: req.params.userEmail,
        notifications: {
            $elemMatch: {
                message: req.body.notification.message,
                userEmail: req.auth.email,
                itemId: req.body.notification.itemId
            }
        }
    })
        .then(user => {
            if (user != null) {
                User.findById(req.auth.id)
                    .select('notifications')
                    .then(user => {
                        res.status(200).send({ msg: `Already notified`, notifications: user.notifications });
                    })
                    .catch(next);
            } else {
                User.findById(req.auth.id)
                    .select('name')
                    .then(user => {
                        req.body.notification['userName'] = user.name;
                        req.body.notification['userEmail'] = req.auth.email;
                        req.body.notification['read'] = false;
                        req.body.notification['_id'] = new mongoose.Types.ObjectId();

                        const io = require('../../config/socket').get();
                        io.to(req.params.userEmail).emit('notification', req.body.notification)

                        User.updateOne({ email: req.params.userEmail },
                            {
                                "$push": { "notifications": req.body.notification },
                                "$set": {
                                    "orders.$[elem].success": true
                                }
                            },
                            {
                                arrayFilters: [{ "elem": { _id: req.body.notification.itemId } }]
                            }
                        )
                            .then(() => {
                                User.updateOne({ _id: req.auth.id },
                                    { "$pull": { notifications: { itemId: req.body.notification.itemId, userEmail: { $ne: req.params.userEmail } } } }
                                ).then(() => {
                                    User.findById(req.auth.id)
                                        .select('notifications')
                                        .then(user => {
                                            Item.updateOne({ _id: req.body.notification.itemId }, {
                                                $set: { sold: true }
                                            })
                                                .catch(next);
                                            res.status(200).send({ msg: "Notified", notifications: user.notifications });
                                        })
                                        .catch(next);
                                })
                                    .catch(next);
                            })
                            .catch(next);
                    })
                    .catch(next);
            }
        })
        .catch(next);
})
//Delete Notification
route.delete('/notif/:item', (req, res, next) => {
    User.updateOne({ _id: req.auth.id },
        { "$pull": { notifications: { _id: req.params.item } } }
    )
        .then(() => {
            res.status(204).end();
        })
        .catch(next);
})

//Set notifications to read
route.put('/notifbell', (req, res, next) => {
    User.updateOne(
        { _id: req.auth.id },
        {
            $set: {
                "notifications.$[].read": true
            }
        })
        .then(() => {
            res.status(204).end();
        })
        .catch(next);
});


//---------------------------------------------------------------------------//

//DELETE requests:
//Removed an Item from favourite:
route.delete('/favourites/:item', (req, res, next) => {
    User.updateOne({ _id: req.auth.id },
        { "$pull": { "favourites": req.params.item } }
    )
        .then(() => {
            User.findById(req.params.id)
                .select('favourites')
                .then(() => {
                    res.status(204).end();
                })
        }).catch(next);
})

//Update user info
route.put('/', (req, res, next) => {
    User.updateOne({ _id: req.auth.id }, req.body)
        .then(user => {
            res.status(204).end();
        })
        .catch(next);
})

module.exports = route;