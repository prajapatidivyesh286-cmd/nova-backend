const DailyPlan = require('../models/DailyPlan');
const Flashcard = require('../models/Flashcard');
const UserMemory = require('../models/UserMemory');
const axios = require('axios');
const crypto = require('crypto');

const generateDailyPlan = async (userId = 'default') => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check if plan exists
        let plan = await DailyPlan.findOne({ userId, date: todayStr });
        if (plan) return plan;

        // 1. Gather Data
        const user = await UserMemory.findOne({ userId });
        if (!user || user.chats.length === 0) return null;

        const tasks = [];
        const subjectsSummary = [];

        // 2. Analyze Each Subject
        for (const chat of user.chats) {
            const dueCardsCount = await Flashcard.countDocuments({
                userId,
                chatId: chat.chatId,
                nextReviewDate: { $lte: new Date() }
            });

            // Add Flashcard Task
            if (dueCardsCount > 0) {
                tasks.push({
                    id: crypto.randomUUID(),
                    chatId: chat.chatId,
                    subjectName: chat.title,
                    type: 'flashcard',
                    title: `Review ${chat.title} Flashcards`,
                    description: `You have ${dueCardsCount} cards ready for recall.`,
                    priority: dueCardsCount > 10 ? 'high' : 'medium'
                });
            }

            // Add Revision Task for Weak Topics (Confidence < 0.7)
            const weakTopics = user.semantic
                .filter(s => s.chatId === chat.chatId && s.confidence < 0.7)
                .slice(0, 2);

            if (weakTopics.length > 0) {
                tasks.push({
                    id: crypto.randomUUID(),
                    chatId: chat.chatId,
                    subjectName: chat.title,
                    type: 'revision',
                    title: `Revise ${weakTopics[0].fact.substring(0, 30)}...`,
                    description: `Your confidence in this topic is low. Let's fix it!`,
                    priority: 'high'
                });
            }

            subjectsSummary.push(`${chat.title}: ${dueCardsCount} cards due, ${weakTopics.length} weak topics.`);
        }

        // 3. Generate AI Smart Message
        const messagePrompt = `Act as an elite AI Study Coach. Based on today's status, write a 1-sentence punchy motivational message for the user.
Status:
${subjectsSummary.join('\n')}

Rules:
- Be personal and proactive.
- Mention a specific subject if it's high priority.
- Be extremely concise (max 20 words).`;

        const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [{ role: "system", content: messagePrompt }]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        const smartMessage = aiResponse.data.choices[0].message.content;

        // 4. Create and Save Plan
        plan = new DailyPlan({
            userId,
            date: todayStr,
            smartMessage,
            tasks: tasks.slice(0, 6) // Max 6 tasks to avoid overwhelm
        });

        await plan.save();
        return plan;

    } catch (error) {
        console.error("Study Engine Error:", error);
        return null;
    }
};

module.exports = { generateDailyPlan };
