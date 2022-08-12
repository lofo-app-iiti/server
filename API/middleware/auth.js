const User = require('../models/user')
const jwt = require('jsonwebtoken')

function genToken(data) {
    return jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
};

// function authToken(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader ? authHeader.split(' ')[1] : null;
//     if (token === null) return res.status(403).end();

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, auth) => {
//         if (err) return res.status(403).end();
//         req['auth'] = auth;
//         next();
//     })
// };

const authToken = async (req,res,next)=>{
    try{
      // return next()
      console.log("JWT Middleware",req.headers.authorization)
      const decoded = jwt.verify(req.headers.authorization, process.env.ACCESS_TOKEN_SECRET)
      console.log("Decoded token ",decoded)
  
      const email = decoded.email
      const user = await User.findOne({email})

      if(user)
      {
        req.auth = decoded
        console.log("passed")
        return next()
      }
      else
      {
        console.log("failed")
        return res.status(403).json({message:"JWT Auth Failed"})
      }
    }
    catch(error){
      console.log(error)
      return res.status(403).json({message:"JWT Auth Failed"})
    }
}


module.exports = { genToken, authToken };
