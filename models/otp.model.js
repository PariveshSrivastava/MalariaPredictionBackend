const mongoose = require('mongoose');

const OTP = new mongoose.Schema({
    email:{type: String,required:[true,"Email is Required"]},
    mobile:{type:String,required:[true,"Phone Number is Required"]},
    otp:{type:String},
    expireAt: {
        type:Date,
        default: Date.now,
        index:{expires: '2m'}
    }
})

module.exports = mongoose.model("OTP",OTP);