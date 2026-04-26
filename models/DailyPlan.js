const mongoose = require('mongoose');

const DailyPlanSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    smartMessage: { type: String },
    tasks: [{
        id: { type: String, required: true },
        chatId: { type: String, required: true },
        subjectName: { type: String, required: true },
        type: { type: String, enum: ['flashcard', 'revision', 'practice'], required: true },
        title: { type: String, required: true },
        description: { type: String },
        isCompleted: { type: Boolean, default: false },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
    }]
}, { timestamps: true });

DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyPlan', DailyPlanSchema);
