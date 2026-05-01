const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve MongoDB SRV records (fixes ECONNREFUSED)
dns.setServers(['8.8.8.8', '8.8.4.4']);

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
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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
const dailyPlanController = require('./controllers/dailyPlanController');
const pdfController = require('./controllers/pdfController');
const quizController = require('./controllers/quizController');
const authController = require('./controllers/authController');
const authMiddleware = require('./middleware/authMiddleware');
const { checkPdfLimit, checkQuizLimit } = require('./middleware/limitMiddleware');
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Increase to 10MB for PDFs too
}); 

app.get('/', (req, res) => res.json({ status: "Nova AI Backend is running!" }));

// Auth Routes
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.get('/auth/verify/:token', authController.verifyEmail);

// PDF Analyzer Route
app.post('/pdf/analyze', authMiddleware, checkPdfLimit, upload.single('pdf'), pdfController.analyzePdf);

// Chat Routes
app.post('/chat', authMiddleware, chatController.handleChat);
app.post('/chat/create', authMiddleware, chatController.createChat);
app.get('/chat/list', authMiddleware, chatController.listChats);
app.post('/chat/delete', authMiddleware, chatController.deleteChat);
app.post('/chat/sync', authMiddleware, chatController.syncMessages);
app.get('/chat/messages', authMiddleware, chatController.getMessages);

// Flashcard Routes
app.post('/flashcards/generate', authMiddleware, flashcardController.generateFlashcards);
app.get('/flashcards/list', authMiddleware, flashcardController.listAllCards);
app.get('/flashcards/review', authMiddleware, flashcardController.getReviewCards);
app.post('/flashcards/review', authMiddleware, flashcardController.updateReview);

// Vision Routes
app.post('/vision/analyze', authMiddleware, upload.single('image'), visionController.analyzeImage);

// Daily Plan Routes
app.get('/daily-plan', authMiddleware, dailyPlanController.getTodayPlan);
app.post('/daily-plan/complete', authMiddleware, dailyPlanController.completeTask);

// Quiz Routes
app.post('/quiz/generate', authMiddleware, checkQuizLimit, quizController.generateQuiz);
app.post('/quiz/save', authMiddleware, quizController.saveQuizResult);

// Stats Routes
const statsController = require('./controllers/statsController');
app.get('/stats/mastery', authMiddleware, statsController.getMasteryStats);

// Study Guide Routes
const studyGuideController = require('./controllers/studyGuideController');
app.post('/study-guide/generate', authMiddleware, studyGuideController.generateStudyGuide);

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nova backend running on http://localhost:${PORT}`);
});
