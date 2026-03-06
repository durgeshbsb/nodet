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
        res.status(500).json({ success: false, message: error.message });
    }
}


export const createSubscription = async (req, res) => {
    try {
        const { userId, email, plan } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const PRICE_IDS = {
            basic: process.env.STRIPE_PRICE_BASIC,
            pro: process.env.STRIPE_PRICE_PRO,
        };

        if (!PRICE_IDS[plan]) {
            return res.status(400).json({ success: false, message: 'Invalid plan selected.' });
        }

        // 1️⃣ Get or create customer
        const [[user]] = await db.query(
            'SELECT stripe_customer_id FROM users WHERE id=?',
            [userId]
        );

        let customerId = user?.stripe_customer_id; // Use optional chaining to safely access property

        if (!customerId) {
            const customer = await stripe.customers.create({ email });
            customerId = customer.id;

            await db.query(
                'UPDATE users SET stripe_customer_id=? WHERE id=?',
                [customerId, userId]
            );
        }

        // 2️⃣ Create subscription
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: PRICE_IDS[plan] }],
            payment_behavior: 'default_incomplete',
            payment_settings: {
                save_default_payment_method: 'on_subscription',
            },
            expand: ['latest_invoice.payment_intent'],
            metadata: { userId, plan },
        });

        // 3️⃣ Save subscription as pending
        await db.query(
            `INSERT INTO subscriptions 
         (user_id, stripe_subscription_id, status)
         VALUES (?, ?, 'pending')`,
            [userId, subscription.id]
        );

        res.json({
            clientSecret:
                subscription.latest_invoice.payment_intent.client_secret,
        });
    } catch (error) {
        console.error('Error in createSubscription:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};



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

    // 🔹 ONE-TIME PAYMENT SUCCESS
    if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;

        await db.query(
            `UPDATE payments
       SET status='paid'
       WHERE stripe_payment_intent_id=?`,
            [pi.id]
        );
    }

    // 🔹 SUBSCRIPTION PAYMENT SUCCESS
    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;

        await db.query(
            `UPDATE subscriptions
       SET status='active'
       WHERE stripe_subscription_id=?`,
            [invoice.subscription]
        );

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
    }

    // 🔹 PAYMENT FAILURE
    if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object;

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
    try {
        const { amount, userId, purpose } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: 'inr',
            automatic_payment_methods: { enabled: true },
            metadata: {
                userId,
                purpose, // order / wallet / subscription_setup
            },
        });

        // 🔴 IMPORTANT: Save intent in DB
        await db.query(
            `INSERT INTO payments 
         (user_id, stripe_payment_intent_id, amount, status)
         VALUES (?, ?, ?, 'pending')`,
            [userId, paymentIntent.id, amount]
        );

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Error in createPaymentIntent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const paymentSuccess = (req, res) => {
    res.render('success', {
        message: 'Payment received. Verifying...',
    });
};

export const getInvoices = async (req, res) => {
    try {
        // if (req.user.id !== Number(req.params.userId)) {
        //     return res.status(403).json({ message: 'Forbidden' });
        // }
        const [rows] = await db.query(
            `SELECT i.amount, i.status, i.created_at
         FROM invoices i
         JOIN subscriptions s ON s.stripe_subscription_id = i.subscription_id
         WHERE s.user_id = ?`,
            [req.params.userId]
        );

        res.json(rows);
    } catch (error) {
        console.error('Error in getInvoices:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};