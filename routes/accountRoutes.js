const { response } = require('express');
const mongoose = require('mongoose');
const Account = mongoose.model('accounts');

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
    
    
    
    
    
    




    ////////////////////////////





    // 升级账户信息：根据公钥查找，并且不能修改公钥
    // 输入这一局游戏中所得到的point + 公钥
    // 根据之前的pointRemain: Number，更新pointRemain: Number，就是之前的pointRemain: Number + 这一局游戏中所得到的point
    // 并且将每一次更新过的pointRemain: Number存入pointHistory: Array中
    // pointHistory: Array中需要记录目前为止所有的pointRemain: Number与对应的时间

    // 在这段代码中，pointGained是这一局游戏中所获得的点数
    // pointGained 可以是0或者负数
    app.put('/account/updatePoint', async (req, res) => {
        const { publicKey, pointGained } = req.body;
        let response = {};
    
        try {
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 400,
                    message: 'No account found with this public key.'
                };
                return res.status(400).send(response);
            }
    
            account.pointRemain += pointGained;
            account.pointHistory.push({point: account.pointRemain, date: Date.now()});
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account point updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // Log the error to console
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
        }
    
        res.send(response);
        return;
    });
    
    //根据公钥查找
    //获得玩家现在mongoDB上的pointRemain: Number
    app.get('/account/points', async (req, res) => {
        const { publicKey } = req.query;
        let response = {};
    
        try {
            // 使用公钥查找账户
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 404,
                    message: 'Account not found.',
                    data: {}
                };
                return res.status(404).send(response);
            }
    
            response = {
                code: 200,
                message: 'Account points retrieved successfully.',
                data: {
                    points: account.pointRemain
                }
            };
            res.status(200).send(response);
        } catch (err) {
            console.error(err);
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
            res.status(500).send(response);
        }
    
        return;
    });

    
    
    // 升级账户信息：根据公钥查找，并且不能修改公钥
    // 这个游戏是GameFi游戏，所以有Token加密货币（MCC）的参与，这里的mccRemain: Number就是用户目前拥有的Token加密货币（MCC）的数量
    // 根据之前的mccRemain: Number，更新mccRemain: Number，就是之前的mccRemain: Number + 用户刚刚充值进来的Token加密货币（MCC）
    // 并且将每一次更新过的mccRemain: Number存入mccHistory: Array中
    // mccHistory: Array中需要记录目前为止所有的mccRemain: Number与对应的时间

    // mccGained是用户刚刚充值进来的Token加密货币（MCC）的数量，当区块链上的充值交易被确认后，就可以调用这个API
    // mccGained 不可以是0或者负数
    app.put('/account/updateMcc', async (req, res) => {
        const { publicKey, mccGained } = req.body;
        let response = {};
    
        if (mccGained <= 0) {
            response = {
                code: 400,
                message: 'MCC gained must be greater than 0.',
            };
            return res.status(400).send(response);
        }
    
        try {
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 400,
                    message: 'No account found with this public key.',
                };
                return res.status(400).send(response);
            }
    
            account.mccRemain += mccGained;
            account.mccHistory.push({mcc: account.mccRemain, date: Date.now()});
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account MCC updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // Log the error to console
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
        }
    
        res.send(response);
        return;
    });
    
    // 升级账户信息：根据公钥查找，并且不能修改公钥
    // 这个游戏是GameFi游戏，并且是部署在币安智能链上，所以会使用到BNB（币安智能链上的原生加密货币）支付
    // 会有加密货币BNB的参与，这里的bnbPaid: Number就是用户目前所支付过的BNB的数量
    // 根据之前的bnbPaid: Number，更新bnbPaid: Number，就是之前的bnbPaid: Number + 用户刚刚支付的BNB
    // 并且将每一次更新过的bnbPaid: Number存入bnbPaymentHistory: Array中
    // bnbPaymentHistory: Array中需要记录目前为止所有的bnbPaid: Number与对应的时间

    // bnb是用户刚刚充值进来的Token加密货币（BNB）的数量，当区块链上的充值交易被确认后，就可以调用这个API
    // bnb 不可以是0或者负数
    app.put('/account/updateBnbPayment', async (req, res) => {
        const { publicKey, bnb } = req.body;
        let response = {};
    
        if (bnb <= 0) {
            response = {
                code: 400,
                message: 'BNB paid must be greater than 0.',
            };
            return res.status(400).send(response);
        }
    
        try {
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 400,
                    message: 'No account found with this public key.',
                };
                return res.status(400).send(response);
            }
    
            account.bnbPaid += bnb;
            account.bnbPaymentHistory.push({bnbPaid: account.bnbPaid, date: Date.now()});
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account BNB payment updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // Log the error to console
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
        }
    
        res.send(response);
        return;
    });

    // 升级账户信息：根据公钥查找，并且不能修改公钥
    // Health是游戏中玩家的健康值，当玩家的健康值为0时，玩家将无法继续游戏
    // 输入目前玩家得到的Health或者损失的Health + 公钥
    // 根据之前的healthRemain: Number，更新healthRemain: Number，就是之前的healthRemain: Number + 玩家得到的Health或者损失的Health
    // healthRemain可以为0，但是不可以为负数
    // 并且将每一次更新过的healthRemain: Number存入healthHistory: Array中
    // healthHistory: Array中需要记录目前为止所有的healthHistory: Number与对应的时间

    // 在这段代码中，healthGained是玩家得到的Health或者损失的Health
    // healthGained 可以是负数
    app.put('/account/updateHealth', async (req, res) => {
        const { publicKey, healthGained } = req.body;
        let response = {};
    
        try {
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 400,
                    message: 'No account found with this public key.',
                };
                return res.status(400).send(response);
            }
    
            account.healthRemain += healthGained;
            
            // Ensure that healthRemain does not fall below 0
            if (account.healthRemain < 0) {
                account.healthRemain = 0;
            }
    
            account.healthHistory.push({health: account.healthRemain, date: Date.now()});
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account health updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // Log the error to console
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
        }
    
        res.send(response);
        return;
    });

    
    // 升级账户信息：根据公钥查找，并且不能修改公钥
    // items是游戏中玩家可以用到的游戏道具们，有很多很多种，并且每个玩家在进入不同的关卡后，道具的种类和对应的价格会发生变化
    // 这段代码需要来根据输入的json数据，更新items: Array，来更新玩家的道具的种类和对应的价格

    // 在这个API中，newItems 应该是一个数组，其中包含了玩家当前应该拥有的所有道具和他们的价格。
    // newItems 可能类似于这样的数组：[{itemName: "sword", price: 100}, {itemName: "shield", price: 200}]。这个API将会用 newItems 替换 items 数组。

    // 请注意，如果你想要只添加一项新的道具而不是替换整个数组，那么你需要对API进行一些修改，例如使用 account.items.push(newItem) 来添加新道具，而不是 account.items = newItems。

    app.put('/account/updateItems', async (req, res) => {
        const { publicKey, newItems } = req.body;
        let response = {};
    
        try {
            const account = await Account.findOne({ publicKey });
    
            if (!account) {
                response = {
                    code: 400,
                    message: 'No account found with this public key.',
                };
                return res.status(400).send(response);
            }
    
            account.items = newItems;
    
            await account.save();
    
            response = {
                code: 200,
                message: 'Account items updated successfully.',
                data: account,
            };
        } catch (err) {
            console.error(err);  // Log the error to console
            response = {
                code: 500,
                message: 'Server error.',
                data: err,
            };
        }
    
        res.send(response);
        return;
    });
    
}