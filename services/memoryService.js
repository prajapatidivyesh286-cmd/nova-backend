const axios = require('axios');
const UserMemory = require('../models/UserMemory');

// --- 1. MEMORY PROCESSING QUEUE ---
const memoryQueue = [];
let isProcessingQueue = false;

const processMemoryQueue = async () => {
    if (isProcessingQueue || memoryQueue.length === 0) return;
    isProcessingQueue = true;

    while (memoryQueue.length > 0) {
        const task = memoryQueue.shift();
        try {
            await extractAndUpdateMemory(task.userId, task.chatId, task.messages, task.aiResponse);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
            console.error("Task processing failed", e);
        }
    }
    isProcessingQueue = false;
};

const updateMemoryAsync = (userId = 'default', chatId, messages, aiResponse) => {
    if(!chatId) return;
    memoryQueue.push({ userId, chatId, messages, aiResponse });
    processMemoryQueue();
};

// --- 2. SEMANTIC EMBEDDINGS ---
const generateEmbedding = async (text) => {
    const vec = new Array(256).fill(0);
    for (let i = 0; i < text.length; i++) {
        vec[text.charCodeAt(i) % 256]++;
    }
    const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vec.map(v => v / mag);
};

const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
};

// --- 3. DATABASE MIGRATION & EXTRACTION ---
const extractAndUpdateMemory = async (userId, chatId, messages, aiResponse) => {
    try {
        const conversationStr = messages.map(m => `${m.role}: ${m.content}`).join("\n") + `\nassistant: ${aiResponse}`;
        
        const extractionPrompt = `Extract structured memory from the following conversation.
Return valid JSON exactly matching this structure:
{
  "profile_updates": { "name": "", "interests": [], "goals": [], "preferences": {} },
  "episodic_summary": "A 1-sentence summary of what happened",
  "semantic_facts": [{ "fact": "...", "confidence": 0.95 }]
}
Rules:
- Only store meaningful information
- Be concise and accurate
- Ensure the output is valid JSON.

Conversation:\n${conversationStr}`;

        const payload = {
            model: "openai/gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: extractionPrompt }]
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });
        const extracted = JSON.parse(response.data.choices[0].message.content);

        let user = await UserMemory.findOne({ userId });
        if (!user) {
            user = new UserMemory({ userId });
        }

        if (extracted.profile_updates) {
            if (extracted.profile_updates.name) user.profile.name = extracted.profile_updates.name;
            if (extracted.profile_updates.interests && Array.isArray(extracted.profile_updates.interests)) {
                extracted.profile_updates.interests.forEach(i => { if (!user.profile.interests.includes(i)) user.profile.interests.push(i) });
            }
            if (extracted.profile_updates.goals && Array.isArray(extracted.profile_updates.goals)) {
                extracted.profile_updates.goals.forEach(g => { if (!user.profile.goals.includes(g)) user.profile.goals.push(g) });
            }
            if (extracted.profile_updates.preferences) {
                user.profile.preferences = { ...user.profile.preferences, ...extracted.profile_updates.preferences };
                user.markModified('profile.preferences');
            }
        }

        if (extracted.episodic_summary) {
            user.episodic.push({ chatId, summary: extracted.episodic_summary });
            // Maintain global cap
            if (user.episodic.length > 200) user.episodic.shift();
        }

        if (extracted.semantic_facts && Array.isArray(extracted.semantic_facts)) {
            for (const factObj of extracted.semantic_facts) {
                if (factObj && factObj.fact) {
                    // Check duplicate strictly scoped to this chat
                    const scopedSemantic = user.semantic.filter(s => s.chatId === chatId);
                    if (!scopedSemantic.some(s => s.fact === factObj.fact)) {
                        const embedding = await generateEmbedding(factObj.fact);
                        user.semantic.push({
                            chatId,
                            fact: factObj.fact,
                            confidence: factObj.confidence || 0.9,
                            embedding: embedding
                        });
                    }
                }
            }
        }

        await user.save();
    } catch (e) {
        console.error("Extraction task failed: ", e);
    }
};

// --- 4. CONTEXT-AWARE RETRIEVAL (SCOPED BY CHAT ID) ---
const injectMemoryIntoPrompt = async (userId = 'default', chatId, currentQuery = '') => {
    if (!chatId) return "No active chat instance.";
    const user = await UserMemory.findOne({ userId });
    if (!user) return "No prior memory context.";

    let prompt = `--- MEMORY SYSTEM ---\nUser Profile:\n`;
    prompt += `- Name: ${user.profile.name || 'Unknown'}\n`;
    prompt += `- Interests: ${user.profile.interests.join(", ")}\n`;
    prompt += `- Goals: ${user.profile.goals.join(", ")}\n`;
    prompt += `- Preferences: ${JSON.stringify(user.profile.preferences)}\n\n`;

    prompt += `Relevant Memories (Scoped to this active Subject): \n`;

    // Filter events purely scoped to the active Thread
    const scopedEpisodic = user.episodic.filter(e => e.chatId === chatId);
    const recentEpisodic = scopedEpisodic.slice(-5).map(e => e.summary).join("\n");
    prompt += `Recent Events:\n${recentEpisodic || "None yet"}\n\n`;

    let topSemantic = "None yet";
    const scopedSemantic = user.semantic.filter(s => s.chatId === chatId);
    
    if (scopedSemantic.length > 0 && currentQuery) {
        const queryEmbedding = await generateEmbedding(currentQuery);
        
        const scoredFacts = scopedSemantic.map(s => ({
            fact: s.fact,
            score: cosineSimilarity(s.embedding, queryEmbedding)
        })).sort((a, b) => b.score - a.score);

        topSemantic = scoredFacts.slice(0, 3).map(s => s.fact).join("\n");
    }

    prompt += `Highly Relevant Facts:\n${topSemantic}\n-------------------\n\n`;
    
    // Inject Subject specific mapping rules dynamically based on chat metadata
    const activeChat = user.chats.find(c => c.chatId === chatId);
    if(activeChat && activeChat.subjectTag) {
         prompt += `\nCRITICAL CONTEXT: You are currently acting as an expert tutor for the specific subject of [${activeChat.subjectTag.toUpperCase()}]. Focus entirely on this vertical.\n`;
    }

    return prompt;
};

module.exports = {
    updateMemoryAsync,
    injectMemoryIntoPrompt
};
