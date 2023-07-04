const { response } = require('express');
const mongoose = require('mongoose');
const Investment = mongoose.model('investments');
  
module.exports = app => {
  app.post('/api/investment', async (req, res) => {
    const { investorPublicKey, referrerPublicKey, investmentAmount } = req.body;

    const investment = new Investment({
      investorPublicKey,
      referrerPublicKey,
      investmentAmount
    });

    try {
      await investment.save();
      res.send({ status: 'success' });
    } catch (err) {
      res.status(422).send(err);
    }
  });
};
