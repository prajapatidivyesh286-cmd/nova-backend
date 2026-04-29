const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
    userId: { type: String, default: 'default' },
    chatId: { type: String, required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    subject: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
