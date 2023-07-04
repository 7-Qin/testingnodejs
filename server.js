
const express = require('express');
const keys = require('./config/key');
var cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(cors());

//connect mongodb with Mongoose
const mongoose = require('mongoose');
//moongose connect
mongoose.connect(keys.mongoURI, {useNewUrlParser: true, useUnifiedTopology: true});

//set up model
require('./model/Account');
require('./model/Investment');


//Routes
require('./routes/accountRoutes')(app);
require('./routes/investmentRoutes')(app);


// Twitter OAuth
var oauth = require('oauth');
var twitterRouter = express.Router();
var consumer = new oauth.OAuth(
  'https://api.twitter.com/oauth/request_token', 
  'https://api.twitter.com/oauth/access_token', 
  'ZoysK2Dch8fsvIDe1LMXCKpsS', 
  'omklKkKQGVKXiys4rLy6ihAYW7NfaraPqb9PN6ez0YVIxhVAbT', 
  '1.0', 
  'https://nodejs.meme-crush.com/api/twitter-callback', 
  'HMAC-SHA1'
);

var oauthTokenSecrets = {};

twitterRouter.get('/twitter-login-url', function (req, res) {
    var publicKey = req.query.publicKey;
    consumer.getOAuthRequestToken(function (err, oauthToken, oauthTokenSecret, results) {
      if (err) {
        res.send(err);
      } else {
        oauthTokenSecrets[oauthToken] = {oauthTokenSecret: oauthTokenSecret, publicKey: publicKey};
        res.send('https://api.twitter.com/oauth/authorize?oauth_token=' + oauthToken);
      }
    });
  });
  

  twitterRouter.get('/twitter-callback', async function (req, res) {
    var oauthToken = req.query.oauth_token;
    var oauthVerifier = req.query.oauth_verifier;
    var oauthTokenSecret = oauthTokenSecrets[oauthToken].oauthTokenSecret;
    var publicKey = oauthTokenSecrets[oauthToken].publicKey;
    
    consumer.getOAuthAccessToken(oauthToken, oauthTokenSecret, oauthVerifier, async function(err, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (err) {
        res.send(err);
      } else {
        console.log('oauthAccessToken: ' + oauthAccessToken);
        console.log('oauthAccessTokenSecret: ' + oauthAccessTokenSecret);
        console.log('results: ' + JSON.stringify(results));

        // Prepare the Twitter credentials
        var twitterCredentials = {
          oauthAccessToken: oauthAccessToken,
          oauthAccessTokenSecret: oauthAccessTokenSecret,
          twitterID: results.user_id,
          twitterUsername: results.screen_name
        };

        // Get the Account model
        var Account = mongoose.model('accounts');

        try {
          // Update the account with the Twitter credentials
          let account = await Account.findOneAndUpdate(
            { publicKey: publicKey },
            { $set: { twitterCredentials: twitterCredentials } },
            { new: true }
          );
    
        //   res.send(account);
          res.redirect('https://azukicrush.com');
        } catch (err) {
          console.error(err);
          res.send(err);
        }
      }
    });
});

// Add the Twitter API v2 library
const { TwitterApi } = require('twitter-api-v2');

twitterRouter.get('/check-follow-and-interaction', async function (req, res) {
    var publicKey = req.query.publicKey;
  
    // Get the Account model
    var Account = mongoose.model('accounts');
  
    try {
      let account = await Account.findOne({ publicKey: publicKey });
      if (!account || !account.twitterCredentials) {
        res.status(400).send('No Twitter credentials found for this account');
        return;
      }

      console.log('1');
  
      var client = new TwitterApi({
        appKey: 'ZoysK2Dch8fsvIDe1LMXCKpsS',
        appSecret: 'omklKkKQGVKXiys4rLy6ihAYW7NfaraPqb9PN6ez0YVIxhVAbT',
        accessToken: account.twitterCredentials[0].oauthAccessToken,
        accessSecret: account.twitterCredentials[0].oauthAccessTokenSecret        
      });
      console.log('2');
      console.log('accessToken: ' + account.twitterCredentials[0].oauthAccessToken);
      console.log('accessSecret: ' + account.twitterCredentials[0].oauthAccessTokenSecret);      

      try {
        const followers = await client.v1.get('followers/ids', { screen_name: account.twitterCredentials[0].twitterUsername });
        var isFollowing = followers.ids.includes('3235813496');
      } catch (err) {
        console.log('Error when checking followers: ', err);
        console.error('Error when checking followers: ', err);
        res.send(err);
        return;
      }
      console.log('3');
  
      try {
        const tweets = await client.v1.get('statuses/user_timeline', { screen_name: account.twitterCredentials[0].twitterUsername });
        var hasInteracted = tweets.some(function(tweet) {
          return tweet.in_reply_to_status_id_str === '1675489775455813632' || 
            (tweet.retweeted_status && tweet.retweeted_status.id_str === '1675489775455813632') || 
            (tweet.favorited && tweet.id_str === '1675489775455813632');
        });
      
        console.log('Has interacted: ' + hasInteracted);
      } catch (err) {
        console.log('Error when checking interactions: ', err);
        console.error('Error when checking interactions: ', err);
        res.send(err);
        return;
      }
      
      console.log('4');

      res.send({ isFollowing: isFollowing, hasInteracted: hasInteracted });
      console.log('isFollowing: ' + isFollowing);
      console.log('hasInteracted: ' + hasInteracted);
    } catch (err) {
      console.error('Error when finding account: ', err);
      res.send(err);
    }
  });

  
  


  

app.use('/api', twitterRouter);

app.listen(keys.port,()=>{
    console.log(`Server is running on port ${keys.port}`);
});
