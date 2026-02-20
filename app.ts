import express from 'express';
import type { Request, Response } from 'express';
import rateLimit from "express-rate-limit";

const app = express();
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
app.use(express.json());
type aport = 4568 | 1212;
const PORT: aport = 1212;
const JWT_SECRET = "my_super_secret_key"; // Use env variable in production

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 15 minutes
    max: 2, // max 100 requests per IP per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable deprecated headers
    message: "Too many requests from this IP, please try again later."
});

// Apply to all requests
app.use(limiter);

// Fake database
const users: any[] = [];

app.get('/', (req: Request, res: Response) => {
    console.log("run");

    res.json({
        status: 'ok',
        message: 'Hostinger Node app running 🚀'
    });
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
app.post("/login", async (req: Request, res: Response) => {
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
const authenticateToken = (req: Request, res: Response, next) => {
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
app.get("/profile", authenticateToken, (req: Request, res: Response) => {
    res.json({
        message: "Protected data",
        user: req.user
    });
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
