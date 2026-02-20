import express from 'express';
import upload from '../utils/upload.js';
import {
    testStripe, showCheckout,
    createPaymentIntent,
    paymentSuccess,
    stripeWebhook,
    createSubscription
} from "../controllers/stripe.controller.js";

const router = express.Router();

router.post('/teststripe', upload.none(), testStripe);
router.get('/', showCheckout);
router.post('/create-payment-intent', createPaymentIntent);
router.get('/success', paymentSuccess);
router.get('/cancel', (req, res) => res.render('cancel'));

router.post('/subscription/create', upload.none(), createSubscription)
router.get('/invoices/:userId', createSubscription)

router.post(
    '/webhooks/stripe',

    stripeWebhook
);


export default router;