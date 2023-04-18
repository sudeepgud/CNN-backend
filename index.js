const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.set('strictQuery',true);
// const AWS = require('aws-sdk');
//OTP services using AWS, not being used as charges were applied
// const creds = new AWS.SharedIniFileCredentials({profile:'default'});
// const SNS = new AWS.SNS({creds,region:'ap-south-1'});
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cookie = require('cookie-parser');
const bcrypt = require('bcrypt');
const User = require('./Schema/user');
const Otp = require('./Schema/otp');
const Label = require('./Schema/label');
const app = express(); 

dotenv.config({path:'./config.env'});

const PORT = process.env.PORT;

const token_expire = 24*60*60;
const createToken=(id)=>{return jwt.sign({id},'Welcome to CP site',{expiresIn:token_expire});}

const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.mail,
        pass:process.env.mail_authpass
    },
    tls:{
        rejectUnauthorized: false,
    }
});

mongoose.connect(process.env.mongoURL,{useNewUrlParser:true,useUnifiedTopology:true}).then(()=>console.log('Database Connected')).catch(e=>console.log(e));

app.listen(PORT,()=>{console.log("Server Started")});

app.get("/",(req,res)=>{
    res.send("Express is Running");
})

app.use(cors({methods:["GET","POST"],credentials:true}))

app.use(cookie());
app.use(express.json());

// Sign Up
app.post('/signup',async (req,res)=>{
    let errors = {email:"",mobile:""};
        const handleError=(err)=>{
            if(err.name === "ValidationError"){
                Object.keys(err.errors).forEach((key) => {
                    errors[key] = err.errors[key].message;
                  });
            }
            if(err.code === 11000){
                errors.email = "Email is already Registered.";
            }
            return errors;
        }
        try{
            let {email,mobile} = req.body;
            const user_mail = await User.findOne({'email':email}).exec();
            const user_num = await User.findOne({'mobile':mobile}).exec();
            if(user_mail){
                errors.email = "Email is already Registered.";
            }
            if(user_num){
                errors.mobile = "Mobile is already Registered.";
            }
            else{
                res.status(201).json({status:"ok"});
            }
        }catch(err){
            console.log(err);
            const errors = handleError(err);
            res.json({errors,created:false});
        }
});

//OTP Request
app.post('/otp',async(req,res)=>{
    let {email,mobile} = req.body;
    const found = await Otp.findOne({'email':email,'mobile':mobile});
    if(found){
        res.status(201).json({error:"OTP already sent..."});
    }
    else{
        const errors = {
            mail:"",
            mobile:""
        }
        const otp = await Otp.create({'email':email,'mobile':mobile});
        if(otp){
            const mail = {
                from:process.env.mail,
                to: email,
                subject: "6-Digit Verification OTP",
                text: "Your OTP is "+otp.otp+", please verify OTP in 2 minutes",
            };
            // const params = {
            //     Message:"Your OTP is "+otp.otp+", please verify OTP in 2 minutes",
            //     PhoneNumber:mobile,
            //     MessageAttributes:{
            //         'AWS.SNS.SMS.SMSType':{
            //             DataType:'String',
            //             StringValue:'Transactional'
            //         }
            //     }
            // };
            // SNS.publish(params,(err,data)=>{
            //     if(err){
            //         return res.json({error:"Invalid Number."});
            //     }
            // })
            transporter.sendMail(mail,function(err,success){
                if(err){
                    return res.json({error:"E-mail could not be Sent"});
                }
            })
            res.status(201).json({status:"OTP Generated"});
        }else{
            res.status(201).json({error:"Failed to Generate OTP"});
        }
    }
})

//OTP Verification
app.post('/verifyotp',async(req,res)=>{
    let {email,mobile,otp} = req.body;
    const OTP =await Otp.findOne({'email':email,'mobile':mobile});
    if(OTP.otp === otp){
        res.status(201).json({status:"Verified"});
    }else{
        res.status(201).json({status:"Invalid OTP"});
    }
})

//Create Account
app.post('/create',async(req,res)=>{
    const errors = {email:"",mobile:""};
    const handleError=(err)=>{
        if(err.name === "ValidationError"){
            Object.keys(err.errors).forEach((key) => {
                errors[key] = err.errors[key].message;
              });
        }
        if(err.code === 11000){
            errors.email = "Email or Mobile is already Registered.";
        }
        return errors;
    }
    try{
        let user = await User.create(req.body);
        res.status(201).json({status:"Registered"});
    }
    catch(err){
        const errors = handleError(err);
        res.json({errors,create:false});
    }
})

//Log In
app.post('/login',async (req,res)=>{
    const errors = {email:"",pass:""};
    let {email,pass} = req.body;
    const user = await User.findOne({'email':email}).exec();
        if(user){
            const checkPassword = await bcrypt.compare(pass,user.pass);
            if(checkPassword){
                const token  = createToken(user._id,user.admin);
                res.cookie("jwt",token,{
                    withCredentials:true,
                    httpOnly:false,
                    maxAge:token_expire*1000
                })
                res.status(200).json({status:"Login"});
            }
            else{
                if(pass === "") errors.pass = "Password is Required";
                else errors.pass = "Incorrect Password";
                res.status(200).json(errors);
            }
        }   
        else{
            if(email==="") errors.email = "Email is Required";
            else errors.email = "Email is not registered";
            res.status(200).json(errors);
        }
});

//Label Upload
app.post('/uploadlabel',async (req,res)=>{
    try{
        let label = await Label.create(req.body);
        res.status(200).json({status:"ok"})
    }catch(err){
        console.log(err);
    }
})

//Label Download
app.post('/downloadlabel',async(req,res)=>{
    const images = await Label.find({});
    res.status(200).json({
        images:images
    })

})

// //Predict Given Image
// app.post('/predict',async(req,res)=>{
//     try {
//         const fileBuffer = req.body.image;
//         const imageTensor = await preprocessImage(fileBuffer);
//         const model = await tf.loadLayersModel('C:\Users\sudee\Documents\Project\backend\model.json');
//         const prediction = model.predict(imageTensor);
//         console.log(prediction);
//         const result = prediction.dataSync()[0];
//         let predictionResult;
//         if (result >= 0.5) {
//           predictionResult = 'Parasitized';
//         } else {
//           predictionResult = 'Uninfected';
//         }
//         res.json({ prediction: predictionResult });
//       } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: 'Server error'});
//     }
// })