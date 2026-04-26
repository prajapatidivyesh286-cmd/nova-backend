const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const UserMemory = require('../models/UserMemory');
const memoryService = require('../services/memoryService');

// Helper: check if DB is connected before querying
const isDbReady = () => mongoose.connection.readyState === 1;

const createChat = async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ error: "Database not ready yet, please retry." });
    try {
        const { userId = 'default', title, subjectTag } = req.body;
        const chatId = crypto.randomUUID();

        let user = await UserMemory.findOne({ userId });
        if (!user) user = new UserMemory({ userId });

        user.chats.push({ chatId, title, subjectTag });
        await user.save();

        return res.status(201).json({ chatId, title, subjectTag });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to create chat" });
    }
};

const listChats = async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ error: "Database not ready yet, please retry." });
    try {
        const { userId = 'default' } = req.query;
        const user = await UserMemory.findOne({ userId });
        if (!user) return res.status(200).json({ chats: [] });

        return res.status(200).json({ chats: user.chats });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to fetch chats" });
    }
};

const deleteChat = async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ error: "Database not ready yet, please retry." });
    try {
        const { userId = 'default', chatId } = req.body;
        const user = await UserMemory.findOne({ userId });
        if (!user) return res.status(404).json({ error: "User not found" });

        user.chats = user.chats.filter(c => c.chatId !== chatId);
        user.episodic = user.episodic.filter(e => e.chatId !== chatId);
        user.semantic = user.semantic.filter(s => s.chatId !== chatId);

        await user.save();
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to delete chat" });
    }
};

const handleChat = async (req, res) => {
    try {
        const incomingMessages = req.body.messages;
        const mode = req.body.mode;
        const userId = req.body.userId || 'default'; 
        const chatId = req.body.chatId;

        if (!chatId) {
             return res.status(400).json({ error: "chatId is strictly required to route intelligence correctly." });
        }
        
        if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
            return res.status(400).json({ error: "Messages array is required and cannot be empty." });
        }

        const currentQuery = incomingMessages[incomingMessages.length - 1].content;

        // Generate Memory Context dynamically via MongoDB bound strictly to the chatId
        const memoryContext = await memoryService.injectMemoryIntoPrompt(userId, chatId, currentQuery);

        let systemContent = `You are Nova AI. Here is what you know about the user:\n${memoryContext}\n`;

        if (mode === "study") {
            systemContent += `You are an expert study assistant.
Your job is to:
- Explain concepts clearly
- Summarize content
- Highlight key points
- Generate possible exam questions
- Use simple language when needed

Ensure your response is highly optimized:
- Use structured output
- Use bullet points when helpful
- Do NOT output unnecessary long text`;
        } else {
            systemContent += `Act as a helpful and personal AI assistant relying on the memory context to provide highly personalized answers.`;
        }

        const messagesForApi = [...incomingMessages];
        messagesForApi.unshift({ role: "system", content: systemContent });

        const payload = {
            model: "openai/gpt-4o-mini",
            messages: messagesForApi
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });
        const aiResponse = response.data.choices[0].message.content;

        // Async Memory Update (Fire and forget, tightly scoped to chatId!)
        memoryService.updateMemoryAsync(userId, chatId, incomingMessages, aiResponse).catch(err => console.error("Memory Update Error: ", err));

        return res.status(200).json({ reply: aiResponse });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Nova AI failed" });
    }
};

module.exports = {
    createChat,
    listChats,
    deleteChat,
    handleChat
};
