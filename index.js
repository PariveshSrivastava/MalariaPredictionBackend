// Express server
const dotenv = require('dotenv');
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const speakeasy = require('speakeasy');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const User = require('./models/user.model')
const Otp = require('./models/otp.model')
const Image = require('./models/image.model')

const app = express()
app.use(cors());
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(express.json())

dotenv.config('./.env');

const port = process.env.PORT;
const secretKey = process.env.SECRET_KEY;
const mongoURL = process.env.MONGO_URL;
const otpLoginEmail = process.env.OTP_LOGIN_EMAIL;
const otpLoginpPassword = process.env.OTP_LOGIN_PASSWORD;

mongoose.connect(mongoURL)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const otp = speakeasy.totp({
    secret: speakeasy.generateSecret().base32,
    digits: 6,
    window: 1
});


app.post('/api/register', async (req, res) => {

    console.log(req.body)

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
        })
        res.json({
            status: 'user created'
        })
    } catch (err) {
        console.log(err)
        res.json({
            status: 'Error', error: 'duplicate-email'
        })
    }

})

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({
        email: req.body.email,
    })

    if (!user) {
        return { status: 'error', error: 'Invalid login' }
    }

    const isPasswordValid = await bcrypt.compare(
        req.body.password,
        user.password
    )

    if (isPasswordValid) {
        const token = jwt.sign(
            {
                status: true,
                name: user.name,
                email: user.email,
            },
            secretKey
        )

        return res.json({ status: true, user: token })
    } else {
        return res.json({ status: false, user: 'error' })
    }

})

app.post('/api/sendOtp', async (req, res) => {

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: otpLoginEmail,
            pass: otpLoginpPassword
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    let mailOptions = {
        from: '"Breast Cancer Prediction" <bc.predict@gmail.com>',
        to: req.body.email,
        subject: 'Account Creation',
        text: "You have recently created an account with us.\nYour Verification OTP is " + otp + "\nIf you haven't made an account please contact site administrator."
    };

    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
            console.log(error);
            res.json({ code: 'wrong_email' })
        }
        else {
            // otp.create({ email: req.body.email_phone, otp: new_pass, flag: false, name: req.body.name, insti: req.body.insti, role: req.body.role }).then(val => {
            //     res.json({ code: 'successful_email', temp: val._id });
            // });
            try {
                await Otp.create({
                    email: req.body.email,
                    mobile: req.body.phone,
                    otp: otp,
                })
                res.json({
                    status: 'true'
                })
            } catch (err) {
                console.log(err)
                res.json({
                    status: 'Error',
                })
            }
        }
    })
})

app.post('/api/verify', async (req, res) => {

    let { email, otp } = req.body;
    const OTP = await Otp.findOne({ 'email': email, });
    if (OTP.otp === otp) {
        res.status(201).json({ status: "true" });
    } else {
        res.status(201).json({ status: "false" });
    }

})

//express code for image upload
app.post('/api/uploadImage', (req, res) => {

    const newImage = new Image({
        username: req.body.username,
        img: req.body.image,
        prediction: req.body.prediction,
        truth: req.body.selectedValue,
    });

    newImage
        .save()
        .then(image => {
            console.log('Image uploaded successfully');
            res.json({ status: 'success imgUp' });
        })
        .catch(err => {
            console.log('Error imgUp');
            res.status(500).json({ error: err.message });
        });
}
)

app.post('/api/fetchImage', async (req, res) => {
    try {
        const images = await Image.find({ username: req.body.username });
        console.log(images);
        if (!images) {
            return res.status(404).json({ error: "No images found" });
        }
        res.status(200).json({ images });
    } catch (err) {
        console.log(errorMonitor);
        res.status(500).json({ error: "Server Error" });
    }
})

