const mongoose = require('mongoose');
const Label = new mongoose.Schema({
    image:{type: String},
    prediction:{type: String},
    label:{type: Boolean}
})
module.exports = mongoose.model("Label",Label);