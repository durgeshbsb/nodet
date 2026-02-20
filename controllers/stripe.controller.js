import stripe from '../utils/stripe.js';
import admin from '../utils/firebase.js';
import db from '../utils/db.js';

export const testStripe = async (req, res) => {

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: req.body.amount || 10000, // ₹10.00 (amount is in smallest currency unit)
            currency: req.body.currency || 'inr',
            payment_method_types: req.body.payment_method_types || ['card'],
        });

        console.log('PaymentIntent created:', paymentIntent.id);
        res.json({ success: true, message: "PaymentIntent created", data: paymentIntent });
    } catch (error) {
        res.status(500).json({ success: false, message: err.message });
    }
}

// export const createSubscription = async (req, res) => {
//     const { email, paymentMethodId, priceId } = req.body;

//     try {
//         // 1. Create customer
//         const customer = await stripe.customers.create({
//             email,
//             payment_method: paymentMethodId,
//             invoice_settings: {
//                 default_payment_method: paymentMethodId,
//             },
//         });

//         // 2. Create subscription
//         const subscription = await stripe.subscriptions.create({
//             customer: customer.id,
//             items: [{ price: priceId }],
//             payment_settings: {
//                 payment_method_types: ['card'],
//             },
//             expand: ['latest_invoice.payment_intent'],
//         });

//         res.json(subscription);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// export const createSubscription = async (req, res) => {
//     const { userId, email, paymentMethodId, priceId } = req.body;

//     // 1. Create Stripe Customer
//     const customer = await stripe.customers.create({
//         email,
//         payment_method: paymentMethodId,
//         invoice_settings: {
//             default_payment_method: paymentMethodId,
//         },
//     });

//     await db.query(
//         'UPDATE users SET stripe_customer_id=? WHERE id=?',
//         [customer.id, userId]
//     );

//     // 2. Create Subscription
//     const subscription = await stripe.subscriptions.create({
//         customer: customer.id,
//         items: [{ price: priceId }],
//         payment_behavior: 'default_incomplete',
//         expand: ['latest_invoice.payment_intent'],
//     });

//     // 3. Save subscription
//     await db.query(
//         `INSERT INTO subscriptions 
//      (user_id, stripe_subscription_id, status, current_period_end)
//      VALUES (?, ?, ?, FROM_UNIXTIME(?))`,
//         [
//             userId,
//             subscription.id,
//             subscription.status,
//             subscription.current_period_end,
//         ]
//     );

//     res.json({
//         clientSecret:
//             subscription.latest_invoice.payment_intent.client_secret,
//     });
// };

export const createSubscription = async (req, res) => {
    const { userId, email, plan } = req.body;

    const PRICE_IDS = {
        basic: 'price_1T2mtl2cXaszDcHdG9wLQhND',
        pro: 'price_456',
    };

    const priceId = PRICE_IDS[plan];

    // 1. Create customer
    const customer = await stripe.customers.create({
        email,
    });

    await db.query(
        'UPDATE users SET stripe_customer_id=? WHERE id=?',
        [customer.id, userId]
    );

    // 2. Create subscription (incomplete)
    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
            save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
    });

    res.json({
        clientSecret:
            subscription.latest_invoice.payment_intent.client_secret,
    });
};




// export const stripeWebhook = async (req, res) => {
//     const sig = req.headers['stripe-signature'];

//     let event;
//     try {
//         event = stripe.webhooks.constructEvent(
//             req.body,
//             sig,
//             process.env.STRIPE_WEBHOOK_SECRET
//         );
//     } catch (err) {
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     if (event.type === 'payment_intent.succeeded') {
//         const intent = event.data.object;
//         console.log('✅ Payment succeeded:', intent.id);
//         // update DB, mark order paid
//     }

//     if (event.type === 'invoice.payment_failed') {
//         console.log('❌ Subscription payment failed');
//         // notify user, retry logic
//     }

//     res.json({ received: true });
// };

export const stripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;

        await db.query(
            `INSERT INTO invoices 
     (stripe_invoice_id, subscription_id, amount, status, created_at)
     VALUES (?, ?, ?, ?, FROM_UNIXTIME(?))`,
            [
                invoice.id,
                invoice.subscription,
                invoice.amount_paid,
                invoice.status,
                invoice.created,
            ]
        );

        // 🔔 Firebase notification can be triggered here
        // update DB
        // send Firebase push
    }
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;

        // Grace period: 7 days
        await db.query(
            `UPDATE subscriptions
     SET status='past_due',
         grace_until = DATE_ADD(NOW(), INTERVAL 7 DAY)
     WHERE stripe_subscription_id=?`,
            [invoice.subscription]
        );
    }

    res.json({ received: true });
};

export const sendPaymentNotification = async (token) => {
    await admin.messaging().send({
        token,
        notification: {
            title: 'Payment Successful',
            body: 'Your subscription is active 🎉',
        },
    });
};

export const showCheckout = (req, res) => {
    res.render('checkout', {
        stripeKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
};

export const createPaymentIntent = async (req, res) => {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // INR → paise
        currency: 'inr',
        automatic_payment_methods: { enabled: true },
    });

    res.json({
        clientSecret: paymentIntent.client_secret,
    });
};

export const paymentSuccess = (req, res) => {
    res.render('success');
};

export const getInvoices = async (req, res) => {
    const [rows] = await db.query(
        `SELECT i.amount, i.status, i.created_at
     FROM invoices i
     JOIN subscriptions s ON s.stripe_subscription_id = i.subscription_id
     WHERE s.user_id = ?`,
        [req.params.userId]
    );

    res.json(rows);
};