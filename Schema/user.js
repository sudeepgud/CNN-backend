const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userSchema = new mongoose.Schema({
    name: {type: String, required: [true,"Username is Required"]},
    email: {type: String, required: [true,"Email is Required"],unique: true},
    mobile: {type:String, required: [true,"Phone Number is Required"],unique: true},
    pass: {type: String, required: [true,"Password is Required"]},
})
userSchema.pre("save",async function(){
    const salt = bcrypt.genSaltSync();
    this.pass = bcrypt.hashSync(this.pass,salt);
})
module.exports = mongoose.model("Users",userSchema);