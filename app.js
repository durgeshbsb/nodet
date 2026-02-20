import './bootstrap.js'; // ✅ MUST be first, no variables before this


import express from 'express';
import rateLimit from "express-rate-limit";
import exphbs from 'express-handlebars';
const app = express();
app.engine(
    'handlebars',
    exphbs.engine({
        extname: '.handlebars',
        defaultLayout: false,
    })
);
app.set('view engine', 'handlebars');
app.set('views', './views'); // VERY IMPORTANT

app.use(express.static('public'));
// IMPORTANT: webhook uses raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
import stripeRoutes from './routes/stripe.route.js';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
app.use(express.json());
const PORT = process.env.PORT || 4568;
const JWT_SECRET = "my_super_secret_key"; // Use env variable in production

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable deprecated headers
    message: "Too many requests from this IP, please try again later."
});

// Apply to all requests
app.use(limiter);

app.use('/api/stripe', stripeRoutes);

// Fake database
const users = [];

app.get('/', (req, res) => {

    res.json({
        status: 'ok',
        message: 'Hostinger Node app running 🚀'
    });
    console.log(typeof res);
});

app.get('/health', (req, res) => {
    res.send('OK');
});

/**
 * Register Route
 */
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // Check if user exists
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({
        username,
        password: hashedPassword
    });

    res.json({ message: "User registered successfully" });
});

/**
 * Login Route
 */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ token });
});

/**
 * Middleware to Verify JWT
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

/**
 * Protected Route
 */
app.get("/profile", authenticateToken, (req, res) => {
    res.json({
        message: "Protected data",
        user: req.user
    });
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
