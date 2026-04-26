const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    chatId: { type: String, required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    
    // Spaced Repetition (SM-2 Algorithm)
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 }, // in days
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now, index: true },
    lastReviewedAt: { type: Date },

    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for fast retrieval of due cards per subject
FlashcardSchema.index({ userId: 1, chatId: 1, nextReviewDate: 1 });

module.exports = mongoose.model('Flashcard', FlashcardSchema);
