// src/utils/stripe.js
import Stripe from 'stripe';


if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret key missing');
}


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

export default stripe;