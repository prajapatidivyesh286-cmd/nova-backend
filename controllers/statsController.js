const Chat = require('../models/UserMemory').Chat;
const QuizResult = require('../models/QuizResult');
const Flashcard = require('../models/Flashcard');

const getMasteryStats = async (req, res) => {
    try {
        const { userId = 'default' } = req.query;

        // 1. Get all subjects (chats)
        const chats = await Chat.find({}); // Get all for now since we're in default mode
        console.log(`Found ${chats.length} chats for stats.`);
        
        const stats = await Promise.all(chats.map(async (chat) => {
            // 2. Get Quiz Results for this subject
            const quizResults = await QuizResult.find({ chatId: chat.chatId });
            const avgScore = quizResults.length > 0 
                ? (quizResults.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / quizResults.length)
                : 0;

            // 3. Get Flashcards count
            const flashcardCount = await Flashcard.countDocuments({ chatId: chat.chatId });

            // 4. Message count
            const messageCount = chat.messages ? chat.messages.length : 0;

            // 5. Calculate Mastery (0.0 to 1.0)
            // Weight: 60% Quiz Scores, 20% Interactions, 20% Flashcards
            let mastery = (avgScore * 0.6) + (Math.min(messageCount / 50, 1) * 0.2) + (Math.min(flashcardCount / 20, 1) * 0.2);
            mastery = Math.min(Math.max(mastery, 0.05), 1.0); // Min 5% if they started

            return {
                chatId: chat.chatId,
                title: chat.title,
                subjectTag: chat.subjectTag,
                mastery: mastery,
                avgScore: Math.round(avgScore * 100),
                totalQuizzes: quizResults.length,
                flashcards: flashcardCount,
                messages: messageCount,
                lastStudied: chat.updatedAt
            };
        }));

        // Sort by mastery descending
        stats.sort((a, b) => b.mastery - a.mastery);

        return res.status(200).json(stats);

    } catch (error) {
        console.error("Stats Error:", error);
        return res.status(500).json({ error: "Failed to load mastery stats" });
    }
};

module.exports = { getMasteryStats };
