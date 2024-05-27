const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

// Crear el entorno de PayPal
function environment() {
  try {
    let clientId = process.env.PAYPAL_CLIENT_ID;
    let clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    console.log(clientId);

    return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  } catch (error) {
    return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
  }
}


// Retornar la instancia del cliente de PayPal con el entorno
function client() {
  try {
    return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
  } catch (error) {
    return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
  }
}

module.exports = { client };