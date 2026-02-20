export const checkSubscriptionAccess = async (req, res, next) => {
    const userId = req.user.id;

    const [[sub]] = await db.query(
        `SELECT status, grace_until
     FROM subscriptions WHERE user_id=?`,
        [userId]
    );

    if (!sub) return res.status(403).json({ error: 'No subscription' });

    if (sub.status === 'active') return next();

    if (
        sub.status === 'past_due' &&
        new Date(sub.grace_until) > new Date()
    ) {
        return next(); // grace allowed
    }

    return res.status(402).json({ error: 'Subscription expired' });
};