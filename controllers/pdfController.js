const pdfParse = require('pdf-parse');
const axios = require('axios');
const memoryService = require('../services/memoryService');

const analyzePdf = async (req, res) => {
    try {
        const userId = req.userId;
        const { chatId } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No PDF uploaded" });
        if (!chatId) return res.status(400).json({ error: "chatId is required for memory context" });

        console.log("Parsing PDF...");
        let pdfData;
        try {
            pdfData = await pdfParse(file.buffer);
        } catch (parseError) {
            console.error("pdf-parse failed:", parseError);
            return res.status(400).json({ error: `PDF Engine failed to read file. (Error: ${parseError.message || "Unknown Format"})` });
        }

        const fullText = pdfData.text || "";
        if (fullText.trim().length < 10) {
            return res.status(400).json({ error: "The PDF appears to be empty or contains only images. Nova currently only analyzes text-based documents." });
        }

        // If the PDF is massive, we only take the first 15,000 characters for the summary 
        const textToAnalyze = fullText.length > 15000 ? fullText.substring(0, 15000) + "..." : fullText;

        const systemPrompt = `You are a world-class AI Study Assistant. The user has uploaded a PDF chapter/document.
Analyze the following text and generate a COMPLETE Study Suite.
Return a STRICT JSON response with this structure:
{
  "title": "Clear title of the chapter",
  "summary": "A high-level 2-sentence overview.",
  "explanation": "A deep, simple, professor-level explanation of the entire chapter in 3-4 paragraphs.",
  "studyNotes": [
    {"topic": "Subtopic Title", "content": "Detailed bullet points or explanation"}
  ],
  "keyConcepts": ["Concept 1", "Concept 2"],
  "mindmap": {
     "topic": "Chapter Title",
     "branches": [
        {
          "title": "Main Concept",
          "color": "#2196F3",
          "nodes": [
            {"title": "Subtopic", "description": "Short explanation"}
          ]
        }
     ]
  },
  "examQuestions": [
    {"question": "Predicted Exam Question", "answer": "The core answer concept"}
  ]
}`;

        console.log("Sending PDF text to AI for analysis...");
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: "openai/gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Here is the PDF text:\n\n${textToAnalyze}` }
            ],
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
        // Strip markdown if AI added it
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const analysis = JSON.parse(content);
        console.log("PDF Analysis complete:", analysis.title);

        // Save the massive context to the Semantic Memory!
        const memoryFact = `Chapter Analysis: ${analysis.title}. Summary: ${analysis.summary}. 
        Key Explanation: ${analysis.explanation.substring(0, 500)}... 
        Exam Predictions: ${analysis.examQuestions.map(q => q.question).join(' | ')}`;
        
        memoryService.updateMemoryAsync(userId, chatId, [{role: 'user', content: 'Uploaded a PDF for full transformation'}], memoryFact);

        return res.status(200).json(analysis);

    } catch (error) {
        console.error("PDF API Error:", error.response ? error.response.data : error.message);
        const detailedError = error.message || "Unknown error";
        return res.status(500).json({ error: `Failed to analyze PDF document. (Internal: ${detailedError})` });
    }
};

module.exports = { analyzePdf };
