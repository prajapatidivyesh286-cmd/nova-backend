const Flashcard = require('../models/Flashcard');
const UserMemory = require('../models/UserMemory');
const memoryService = require('../services/memoryService');
const axios = require('axios');

const generateFlashcards = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId, topic } = req.body;

        if (!chatId) return res.status(400).json({ error: "chatId is required" });

        // 1. Get Context from Memory System
        const memoryContext = await memoryService.injectMemoryIntoPrompt(userId, chatId, topic || "general study");

        // 2. Prompt AI to generate Q/A pairs
        const prompt = `Based on this study context, generate 8-12 high-quality flashcards.
Context:
${memoryContext}

Rules:
- Focus on key concepts, definitions, and exam-style questions.
- Questions must be short and clear.
- Answers must be concise.
- Output ONLY valid JSON in this format: [{"question": "...", "answer": "..."}]`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: prompt }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        const cardsData = JSON.parse(response.data.choices[0].message.content);
        const finalCards = Array.isArray(cardsData) ? cardsData : cardsData.flashcards || [];

        // 3. Save to MongoDB
        const createdCards = await Promise.all(finalCards.map(async (card) => {
            return await Flashcard.create({
                userId,
                chatId,
                question: card.question,
                answer: card.answer,
                nextReviewDate: new Date() // Due immediately
            });
        }));

        res.status(201).json({ 
            message: `Successfully generated ${createdCards.length} flashcards!`,
            count: createdCards.length 
        });

    } catch (error) {
        console.error("Flashcard Gen Error:", error);
        res.status(500).json({ error: "Failed to generate flashcards" });
    }
};

const getReviewCards = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId } = req.query;
        const now = new Date();

        const query = { userId, nextReviewDate: { $lte: now } };
        if (chatId) query.chatId = chatId;

        const cards = await Flashcard.find(query).limit(20).sort({ nextReviewDate: 1 });
        res.status(200).json({ cards });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch review cards" });
    }
};

const updateReview = async (req, res) => {
    try {
        const { flashcardId, rating } = req.body; // rating: 0=forgot, 1=hard, 2=good, 3=easy
        
        const card = await Flashcard.findById(flashcardId);
        if (!card) return res.status(404).json({ error: "Card not found" });

        let { easeFactor, interval, repetitions } = card;

        // SM-2 Logic
        if (rating === 0) {
            // Forgot
            repetitions = 0;
            interval = 1;
        } else {
            // Success (Hard, Good, or Easy)
            repetitions += 1;

            if (repetitions === 1) {
                interval = 1;
            } else if (repetitions === 2) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }

            // Update Ease Factor based on rating
            // Formula: EF = EF + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02))
            const adjustment = (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
            easeFactor = Math.max(1.3, easeFactor + adjustment);
        }

        card.repetitions = repetitions;
        card.easeFactor = easeFactor;
        card.interval = interval;
        card.nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
        card.lastReviewedAt = new Date();

        await card.save();
        res.status(200).json({ success: true, nextReview: card.nextReviewDate });

    } catch (error) {
        console.error("Update Review Error:", error);
        res.status(500).json({ error: "Failed to update flashcard progress" });
    }
};

const listAllCards = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId } = req.query;
        const cards = await Flashcard.find({ userId, chatId }).sort({ createdAt: -1 });
        res.status(200).json({ cards });
    } catch (error) {
        res.status(500).json({ error: "Failed to list cards" });
    }
};

module.exports = {
    generateFlashcards,
    getReviewCards,
    updateReview,
    listAllCards
};
