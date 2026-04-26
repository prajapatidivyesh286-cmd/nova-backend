const axios = require('axios');

const generateMindMap = async (topic, chatId) => {
    try {
        const prompt = `You are a world-class educational architect. Transform "${topic}" into a structured, visual Mind Map.
Rules:
- 4-6 Main Branches (use vibrant HEX colors).
- Each branch has 3-5 Nodes.
- Descriptions must be 2-3 lines max.
- Use clear, exam-focused hierarchy.

OUTPUT STRICT JSON:
{
  "topic": "${topic}",
  "branches": [
    {
      "title": "Branch Title",
      "color": "#HEXCODE",
      "nodes": [
        {
          "title": "Subtopic",
          "description": "...",
          "children": [
             { "title": "Detail", "description": "..." }
          ]
        }
      ]
    }
  ]
}`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" }
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        return JSON.parse(response.data.choices[0].message.content);
    } catch (e) {
        console.error("Mind Map Gen Error:", e);
        return null;
    }
};

module.exports = { generateMindMap };
