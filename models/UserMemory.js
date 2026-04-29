const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true },
    title: String,
    subjectTag: String,
    createdAt: { type: Date, default: Date.now },
    messages: [{
        text: String,
        isUser: Boolean,
        timestamp: { type: Date, default: Date.now },
        mindmapData: mongoose.Schema.Types.Mixed
    }]
});

const UserMemorySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    profile: {
        name: { type: String, default: "" },
        interests: [{ type: String }],
        goals: [{ type: String }],
        preferences: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    chats: [ChatSchema], // Stores multi-subject threads
    episodic: [{
        chatId: { type: String, required: true }, // Memory Isolation Hook
        timestamp: { type: Date, default: Date.now },
        summary: String
    }],
    semantic: [{
        chatId: { type: String, required: true }, // Memory Isolation Hook
        fact: String,
        confidence: Number,
        embedding: [{ type: Number }]
    }]
});

module.exports = mongoose.model('UserMemory', UserMemorySchema);
