const express = require('express');
const router = express.Router();
const https = require('https');
const USER_COOKIE_KEY = 'USER';

const widgetSecretKey = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
const encryptedSecretKey =
  "Basic " + Buffer.from(widgetSecretKey + ":").toString("base64");

router.post("/confirm", async function (req, res) {
  const { paymentKey, orderId, amount } = req.body;

  const postData = JSON.stringify({
    orderId: orderId,
    amount: amount,
    paymentKey: paymentKey,
  });

  const options = {
    hostname: 'api.tosspayments.com',
    path: '/v1/payments/confirm',
    method: 'POST',
    headers: {
      Authorization: encryptedSecretKey,
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  const request = https.request(options, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        res.status(response.statusCode).json(JSON.parse(data));
      } else {
        res.status(response.statusCode).json(JSON.parse(data));
      }
    });
  });

  request.on('error', (error) => {
    console.error('Request error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  });

  request.write(postData);

  request.end();
});

module.exports = router;
