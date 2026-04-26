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
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nova_ai', {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
})
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

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
const flashcardController = require('./controllers/flashcardController');
const visionController = require('./controllers/visionController');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB Limit

app.get('/', (req, res) => res.json({ status: "Nova AI Backend is running!" }));

// Chat Routes
app.post('/chat', chatController.handleChat);
app.post('/chat/create', chatController.createChat);
app.get('/chat/list', chatController.listChats);
app.post('/chat/delete', chatController.deleteChat);

// Flashcard Routes
app.post('/flashcards/generate', flashcardController.generateFlashcards);
app.get('/flashcards/list', flashcardController.listAllCards);
app.get('/flashcards/review', flashcardController.getReviewCards);
app.post('/flashcards/review', flashcardController.updateReview);

// Vision Routes
app.post('/vision/analyze', upload.single('image'), visionController.analyzeImage);

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nova backend running on http://localhost:${PORT}`);
});
