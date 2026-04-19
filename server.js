// Import necessary modules
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables from the .env file
dotenv.config();

// Import routes
const chatRoutes = require('./routes/chatRoutes');

// Initialize the Express application
const app = express();

// =======================
// Middleware Setup
// =======================

// 1. CORS Middleware: Allows your Flutter/Web frontend to communicate with this backend securely
app.use(cors());

// 2. JSON Middleware: Parses incoming requests with JSON payloads properly
app.use(express.json());

// 3. Rate Limiting: Prevents abuse by limiting the number of requests per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: { error: "Too many requests, please try again later." }
});
app.use('/chat', limiter);

// =======================
// Routes Setup
// =======================

// All routes starting with '/chat' will be handled by chatRoutes
app.use('/chat', chatRoutes);

// Add a simple health check endpoint
app.get('/', (req, res) => {
    res.json({ status: "Nova AI Backend is running securely!" });
});

// =======================
// Server Initialization
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nova backend is running securely and actively bound to http://0.0.0.0:${PORT}`);
    console.log(`Local Access: http://localhost:${PORT}`);
});
