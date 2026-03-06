import express from 'express';
import upload from '../utils/upload.js';
import {
    testStripe, showCheckout,
    createPaymentIntent,
    paymentSuccess,
    stripeWebhook,
    createSubscription,
    getInvoices
} from "../controllers/stripe.controller.js";

const router = express.Router();

router.post('/teststripe', upload.none(), testStripe);
router.get('/', showCheckout); //Checkout UI
router.post('/create-payment-intent', createPaymentIntent); //One-time payment
router.get('/success', paymentSuccess); // Waiting page
router.get('/cancel', (req, res) => res.render('cancel')); //Cancel UI

router.post('/subscription/create', upload.none(), createSubscription) //Subscription start
router.get('/invoices/:userId', getInvoices) //Invoice history

router.post(
    '/webhooks/stripe',

    stripeWebhook
); //FINAL truth (Stripe → Backend)


export default router;