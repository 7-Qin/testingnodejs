const mongoose = require('mongoose');
const { Schema } = mongoose;

const investmentSchema = new Schema({
  investorPublicKey: String,
  referrerPublicKey: String,
  investmentAmount: Number
});

mongoose.model('investments', investmentSchema);
