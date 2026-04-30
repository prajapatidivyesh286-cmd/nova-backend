const axios = require('axios');
const memoryService = require('../services/memoryService');

const analyzeImage = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No image uploaded" });
        if (!chatId) return res.status(400).json({ error: "chatId is required for memory context" });

        // Convert image buffer to base64
        const base64Image = file.buffer.toString('base64');
        let mimeType = file.mimetype;
        if (!mimeType || mimeType === 'application/octet-stream') {
            const ext = file.originalname ? file.originalname.split('.').pop().toLowerCase() : 'jpg';
            mimeType = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
        }

        const systemPrompt = `You are an expert AI tutor. Analyze the uploaded image and return structured educational output. 
Follow this format strictly and return ONLY JSON:
{
  "extractedText": "...",
  "explanation": "...",
  "solution": "...",
  "keyPoints": ["...", "..."]
}
If there is no problem to solve, set solution to 'N/A'. Use clear, student-friendly language.`;

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please analyze this study material." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("Vision API Response received.");

        if (!response.data.choices || response.data.choices.length === 0) {
            console.error("Vision API returned no choices:", response.data);
            throw new Error("No response from Vision AI");
        }

        const analysis = JSON.parse(response.data.choices[0].message.content);
        console.log("Analysis parsed successfully.");

        // Memory Integration: Save the core facts into Semantic Memory
        const memoryFact = `Visual Analysis Result: ${analysis.explanation}. Key Facts: ${analysis.keyPoints.join(', ')}`;
        memoryService.updateMemoryAsync(userId, chatId, [{role: 'user', content: 'Image Upload'}], memoryFact);

        return res.status(200).json(analysis);

    } catch (error) {
        console.error("Vision API Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to analyze image with Nova Lens" });
    }
};

module.exports = { analyzeImage };
