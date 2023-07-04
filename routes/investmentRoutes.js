const { response } = require('express');
const mongoose = require('mongoose');
const Investment = mongoose.model('investments');
  
module.exports = app => {
app.get('/api/investment', async (req, res) => {
  try {
    console.log('Received request:', req.query);

    const { investorPublicKey, referrerPublicKey, investmentAmount } = req.query;

    const investment = new Investment({
      investorPublicKey,
      referrerPublicKey,
      investmentAmount: parseFloat(investmentAmount)
    });

    await investment.save();
    res.send({ status: 'success' });
  } catch (err) {
    console.error('Error handling request:', err);
    res.status(500).send(err);
  }
});


};
