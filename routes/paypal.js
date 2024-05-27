const express = require('express');
const paypal = express.Router();
const paypalClient = require('../paypalClient');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

// Crear una orden
paypal.post('/create', async (req, res) => {
    try {
        // Arreglo de objetos
        const { payments } = req.body;

        try {
            const orders = [];
            for (const payment of payments) {
                const { amount, sellerEmail } = payment;

                const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
                request.prefer("return=representation");
                request.requestBody({
                    intent: 'CAPTURE',
                    purchase_units: [{
                        amount: {
                            currency_code: 'MXN',
                            value: amount
                        },
                        payee: {
                            email_address: sellerEmail
                        }
                    }],
                    application_context: {
                        brand_name: "Comunarte",
                        landing_page: "BILLING",
                        user_action: "PAY_NOW",
                        return_url: "https://return.com/return",
                        cancel_url: "https://cancel.com/cancel"
                    }
                });

                const order = await paypalClient.client().execute(request);
                const approveLink = order.result.links.find(link => link.rel === 'approve').href;
                orders.push({
                    orderId: order.result.id,
                    approveLink: approveLink
                });
            }
            res.status(201).json(orders);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } catch (error) {
        return res.status(501).json({code: 501, message: "Ocurrió un error (servidor)", error: error.message});
    }
});

// Capturar una orden
paypal.post('/capture/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Obtener el estado de la orden antes de capturarla
        const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
        const orderDetails = await paypalClient.client().execute(request);

        // Verificar si la orden ya ha sido capturada
        if (orderDetails.result.status === 'COMPLETED') {
            res.status(200).json({
                status: 'PAGADO',
                message: 'La orden ya ha sido pagada.',
                capture: orderDetails.result
            });
            return;
        }

        // Intentar capturar la orden si no ha sido completada
        const captureRequest = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
        captureRequest.requestBody({});

        const capture = await paypalClient.client().execute(captureRequest);

        if (capture.result.status === 'COMPLETED') {
            res.status(200).json({
                status: 'PAGADO',
                message: 'La orden ha sido pagada.',
                capture: capture.result
            });
        } else {
            res.status(200).json({
                status: 'NO PAGADO',
                message: 'La orden no ha sido pagada aún.'
            });
        }
    } catch (err) {
        if (err.statusCode && err.statusCode === 422) {
            res.status(200).json({
                status: 'NO PAGADO',
                message: 'La orden no ha sido pagada aún.'
            });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = paypal;





