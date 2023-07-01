const mongoose = require('mongoose');
const {Schema} = mongoose;

const accountSchema = new Schema({
    publicKey: { 
        type: String, 
        required: true, 
    },
    levelReached: Number,
    levelHistory: Array,
    starsEarnedPerLevel: [Number], // 新添加的字段

    pointRemain: Number,
    pointHistory: Array,
    pointsEarned: { type: Number, default: 0 },  // 新添加的字段

    mccRemain: Number,
    mccHistory: Array,

    bnbPaid: Number,
    bnbPaymentHistory: Array,

    healthRemain: Number,
    healthHistory: Array,

    items: Array,
    itemshistory: Array,

    //referal system
    referalCode: String,
    referalLink: String,
    referalList: Array,
    referralBonus: { type: Number, default: 0 },  // 新添加的字段

    lastAuthentication: Date,

    
});


mongoose.model('accounts', accountSchema);
