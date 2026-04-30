const axios = require('axios');
const UserMemory = require('../models/UserMemory');
const Flashcard = require('../models/Flashcard');
const memoryService = require('../services/memoryService');

const generateStudyGuide = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId } = req.body;
        if (!chatId) return res.status(400).json({ error: "chatId is required" });

        console.log("Compiling Study Guide for Chat:", chatId);

        // 1. Get Subject Title
        const memory = await UserMemory.findOne({ userId });
        const chat = memory.chats.find(c => c.chatId === chatId);
        const subjectTitle = chat ? chat.title : "Subject";

        // 2. Get Semantic Facts
        const facts = memory.semantic
            .filter(s => s.chatId === chatId)
            .map(s => s.fact)
            .join('\n- ');

        // 3. Get Flashcards
        const flashcards = await Flashcard.find({ chatId }).limit(10);
        const flashcardText = flashcards
            .map(f => `Q: ${f.question} | A: ${f.answer}`)
            .join('\n');

        const systemPrompt = `You are a professional Academic Editor. Your goal is to create a COMPREHENSIVE STUDY GUIDE for the subject: ${subjectTitle}.
Use the provided Facts and Flashcards to structure a professional document.

Structure the guide with these sections:
# ${subjectTitle} - Comprehensive Study Guide
## 📋 Executive Summary
(Write a high-level overview of the subject based on the data)

## 🔑 Core Concepts & Definitions
(List and explain the most important terms and concepts)

## 🧠 Active Recall Section
(List important questions and their detailed answers)

## 💡 Key Takeaways
(Bullet points of the most critical things to remember for an exam)

STRICT RULE: Return the response in CLEAN MARKDOWN format.`;

        const userPrompt = `Here is the data collected by Nova AI for this subject:
        
RELEVANT FACTS:
- ${facts}

FLASHCARDS:
${flashcardText}`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error("No response from AI");
        }

        const studyGuideMarkdown = response.data.choices[0].message.content;
        return res.status(200).json({ 
            title: `${subjectTitle} Study Guide`,
            content: studyGuideMarkdown 
        });

    } catch (error) {
        console.error("Study Guide Error:", error);
        return res.status(500).json({ error: "Failed to compile study guide. Keep studying to gather more data!" });
    }
};

module.exports = { generateStudyGuide };
