const mongoose = require('mongoose');
const {Schema} = mongoose;

const accountSchema = new Schema({
    publicKey: { 
        type: String, 
        required: true, 
    },
    levelReached: Number,
    
    //包含：
    //1到100关的关卡数字，100个数字，int Number
    //对应的关卡是否已经被解锁，bool IsLocked
    //对应的关卡获得过几颗星，int StarsCount
    //对应的关卡获得的分数，int Number
    levelHistory: Array,

    pointRemain: Number,
    pointHistory: Array,
    pointsEarned: { type: Number, default: 0 },  // 新添加的字段

    tokenRemain: Number,
    tokenHistory: Array,

    bnbPaid: Number,
    bnbPaymentHistory: Array,

    healthRemain: Number,
    healthHistory: Array,

    items: Array,
    itemshistory: Array,
    
    //User Credentials
    //User Twitter ID
    //User Twitter Username
    twitterCredentials: [{
        oauthAccessToken: String,
        oauthAccessTokenSecret: String,
        twitterID: String,
        twitterUsername: String,
    }],
    // Twitter interaction history
    twitterInteractions: Array,

    //referal system
    // The user who referred this user
    referredBy: {
        referrerId: String,
        bonus: { type: Number, default: 0 },
    },

    // The users this user has referred
    referralList: [{
        referrerId: String,
        bonus: { type: Number, default: 0 },
        referralList: [{
            referrerId: String,
            bonus: { type: Number, default: 0 },
            referralList: [{
                referrerId: String,
                bonus: { type: Number, default: 0 },
            }],
        }],
    }],

    lastAuthentication: Date,
});

mongoose.model('accounts', accountSchema);
