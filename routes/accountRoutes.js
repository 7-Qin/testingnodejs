const { response } = require('express');
const mongoose = require('mongoose');
const Account = mongoose.model('accounts');

const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;

module.exports = app => {

    // Generate a 6 characters long random string that contains numbers and letters
    function generateReferralCode() {
        const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let referralCode = '';
        for (let i = 0; i < 6; i++) {
            referralCode += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
        }
        return referralCode;
    }
    
    // 当用户打开游戏时
    // 如果用户已经有账户，返回账户信息
    // 如果用户没有账户，只用公钥创建新账户
    // 随机生成一个referalCode: String，这个referalCode: String是一个6位的随机字符串，只包含数字和字母
    
    // 可以帮我在每一层的推荐上加上特殊的数值嘛？
    // 比如第一个人推荐第二个人，第二个人所产生的积分，有额外的10%奖励给第一个人（这10%是额外的，不分走第二个人的积分），第二个人再推荐第三个人时，第三个人的所产生的积分有额外的10%奖励给第二个人，额外的5%奖励给第一个人，第三个人再去推荐给第四个人时，第四个人所产生的积分（额外）的10%奖励给第三个人，额外的5%奖励给第二个人，额外的3%奖励给第一个人。
    
    // 比如一共有Alice，Bob，Charlie，和Dave四个人，
    // Alice推荐了Bob注册，Bob推荐了Charlie注册，Charlie推荐了Dave注册，
    // 这个时候，Alice这边会显示一级推荐有Bob，二级推荐有Charlie，三级推荐有Dave
    // 当Dave在游玩时产生积分，比如产生了100个积分，Dave收获100，Charlie收获10，Bob收获5，Alice收获3
    // Charlie在游玩的时候产的积分，比如产生了1000个积分，Bob会收获10，Alice会收获50

    app.get('/register', async (req, res) => {
        const publicKey = req.query.publicKey;
        let response = {};
    
        try {
            // Check if the public key already exists
            let account = await Account.findOne({ publicKey });
    
            if (account) {
                response = {
                    code: 200,
                    message: 'Account retrieved successfully.',
                    data: account
                };
                return res.status(200).send(response);
            }
    
            // If it doesn't exist, create a new account
            const newReferralCode = generateReferralCode();
    
            // Create levelHistory array
            let levelHistory = [];
            for (let i = 1; i <= 100; i++) {
                levelHistory.push({
                    levelNumber: i,
                    levelIsLocked: i === 1 ? false : true,  // First level is unlocked
                    levelStars: 0,
                    levelScore: 0
                });
            }
    
            account = new Account({
                publicKey,
                levelReached: 0,
                levelHistory,
                pointRemain: 0,
                pointGetHistory: [],
                tokenRemain: 0,
                tokenHistory: [],
                bnbPaid: 0,
                bnbPaymentHistory: [],
                healthRemain: 0,
                healthHistory: [],
                items: [],
                itemshistory: [],
                referalCode: newReferralCode,
                referalLink: `http://app.meme-crush.com/register?referralCode=${newReferralCode}`,
                referalList: [],
                twitterID: '',
                twitterCredentials: [],
                twitterInteractions: [],
                lastAuthentication: Date.now(),
            });
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account created successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // This will print the detailed error message
            response = {
                code: 500,
                message: 'Server error.',
                data: err
            };
        }
    
        res.send(response);
        return;
    });
    
    
    // 使用公钥获取账户信息
    app.get('/account/info', async (req, res) => {
        const { publicKey } = req.query;
        let response = {};
        try {
            // 根据公钥从数据库中获取账户
            let account = await Account.findOne({ publicKey });

            if (account) {
                response = {
                    code: 200,
                    message: 'Account retrieved successfully.',
                    data: account
                };
            } else {
                response = {
                    code: 404,
                    message: 'Account not found.'
                };
            }
        } catch (err) {
            response = {
                code: 500,
                message: 'Server error.',
                data: err
            };
        }

        res.send(response);
        return;
    });

    //升级账户信息的方法
    //根据公钥查找，来确定是哪一个账户
    //输入当前的关卡数字currentLevel，来确定levelHistory中的levelNumber
    //输入当前的关卡所赢得的星星数StarsCount，和分数Score

    //将数据库中的levelHistory中的levelIsLocked改为false，
    //将levelHistory中的levelStars改为StarsCount，
    //将levelHistory中的levelScore改为Score
    //将levelReached改为currentLevel + 1
    //将levelHistory中的下一个关卡的levelIsLocked改为false

    //将分数Score用加法的形式，加入到数据库中的pointRemain
    //并且更新数据库中的pointHistory
    //pointHistory中需要记录目前为止所有的pointRemain与对应的时间

    app.put('/account/update', async (req, res) => {
        const publicKey = req.body.publicKey;
        const currentLevel = req.body.currentLevel;
        const starsCount = req.body.starsCount;
        const score = req.body.score;
        let response = {};
    
        try {
            // Find the account by public key
            let account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 404,
                    message: 'Account not found.',
                };
                return res.status(404).send(response);
            }
    
            // Update the current level
            let levelIndex = account.levelHistory.findIndex(level => level.levelNumber === currentLevel);
            if (levelIndex !== -1) {
                let level = { ...account.levelHistory[levelIndex] };
                level.levelIsLocked = false;
                level.levelStars = starsCount;
                level.levelScore = score;
                account.levelHistory[levelIndex] = level;
            }
    
            // Update the next level
            if (currentLevel < 100) {
                let nextLevelIndex = account.levelHistory.findIndex(level => level.levelNumber === currentLevel + 1);
                if (nextLevelIndex !== -1) {
                    let nextLevel = { ...account.levelHistory[nextLevelIndex] };
                    nextLevel.levelIsLocked = false;
                    account.levelHistory[nextLevelIndex] = nextLevel;
                }
            }
    
            // Update the level reached
            account.levelReached = currentLevel + 1;
    
            // Update pointRemain and pointHistory
            account.pointRemain += score;
            account.pointHistory.push({
                pointRemain: account.pointRemain,
                time: Date.now()
            });
    
            // Save the updated account
            await account.save();
    
            response = {
                code: 200,
                message: 'Account updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // This will print the detailed error message
            response = {
                code: 500,
                message: 'Server error.',
                data: err
            };
        }
    
        res.send(response);
        return;
    });

    passport.use(new TwitterStrategy({
        consumerKey: 'ZoysK2Dch8fsvIDe1LMXCKpsS',
        consumerSecret: 'omklKkKQGVKXiys4rLy6ihAYW7NfaraPqb9PN6ez0YVIxhVAbT',
        callbackURL: "https://nodejs.meme-crush.com/auth/twitter/callback"
      },
      function(token, tokenSecret, profile, cb) {
        // 在这里，您可以选择将用户的Twitter信息存储在数据库中
        // 然后，您可以将用户的ID或其他唯一标识符传递给`cb`函数
        cb(null, profile.id);
      }
    ));

    app.get('/auth/twitter', passport.authenticate('twitter'));

    app.get('/auth/twitter/callback', 
      passport.authenticate('twitter', { failureRedirect: '/login' }),
      function(req, res) {
        // 如果成功，用户将被重定向到Unity应用
        res.redirect('unity://yourgame/?user_id=' + req.user);
      });

}