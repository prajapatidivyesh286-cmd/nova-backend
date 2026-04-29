const axios = require('axios');
const memoryService = require('../services/memoryService');

const generateQuiz = async (req, res) => {
    try {
        const { userId = 'default', chatId } = req.body;
        if (!chatId) return res.status(400).json({ error: "chatId is required" });

        console.log("Generating Quiz for Chat:", chatId);

        // 1. Get the subject context from memory
        const memoryContext = await memoryService.injectMemoryIntoPrompt(userId, chatId, "Generate a quiz");

        const systemPrompt = `${memoryContext}
You are a strict but helpful Tutor. Based on the "Relevant Memories" and "Facts" provided above, generate a challenging 5-question Multiple Choice Quiz.
Ensure the questions are specific to the material discussed.

Return a STRICT JSON response with this structure:
{
  "subject": "The subject name",
  "questions": [
    {
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "A short explanation of why this is correct."
    }
  ]
}`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }],
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error("No response from AI");
        }

        let content = response.data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const quiz = JSON.parse(content);
        return res.status(200).json(quiz);

    } catch (error) {
        console.error("Quiz Generation Error:", error.message);
        return res.status(500).json({ error: "Failed to generate quiz. Try chatting a bit more first!" });
    }
};

module.exports = { generateQuiz };
