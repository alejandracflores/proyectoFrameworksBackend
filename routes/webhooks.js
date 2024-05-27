const express = require('express');
const webhook = express.Router();

webhook.post('/webhook', async (req, res) => {
  try {
    const event = req.body;

    // Manejar evento del webhook
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('Payment capture completed');
        break;
      // Manejar otros eventos según sea necesario
      default:
        console.log(`Tipo de evento no manejado ${event.event_type}`);
    }
    res.sendStatus(200);
  } catch (error) {
    return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
  }
});

module.exports = webhook;