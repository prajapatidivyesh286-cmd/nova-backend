const axios = require('axios');

const generateMindMap = async (topic, chatId) => {
    try {
        const prompt = `You are a world-class educational architect. Transform the topic "${topic}" into a structured, interactive Mind Map.
Rules:
- Focus on clarity and logical hierarchy.
- Use simple, punchy labels (max 3 words).
- Provide a 1-sentence summary for every node.
- Max 5-7 main branches.
- Max 2-3 levels of depth.

OUTPUT STRICT JSON FORMAT:
{
  "title": "${topic}",
  "nodes": [
    {
      "id": "1",
      "label": "Main Branch",
      "summary": "...",
      "children": [
        { "id": "1.1", "label": "Subtopic", "summary": "...", "children": [] }
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

        const data = JSON.parse(response.data.choices[0].message.content);
        return data;
    } catch (e) {
        console.error("Mind Map Gen Error:", e);
        return null;
    }
};

module.exports = { generateMindMap };
