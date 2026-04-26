const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// =======================
// Database Connection
// =======================
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nova_ai')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// =======================
// Middleware
// =======================
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: "Too many requests, please try again later." }
});
app.use('/chat', limiter);

// =======================
// Routes
// =======================
const chatController = require('./controllers/chatController');

app.get('/', (req, res) => res.json({ status: "Nova AI Backend is running!" }));
app.post('/chat', chatController.handleChat);
app.post('/chat/create', chatController.createChat);
app.get('/chat/list', chatController.listChats);
app.post('/chat/delete', chatController.deleteChat);

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nova backend running on http://localhost:${PORT}`);
});
