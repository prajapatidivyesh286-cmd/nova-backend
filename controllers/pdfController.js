const pdf = require('pdf-parse');
const axios = require('axios');
const memoryService = require('../services/memoryService');

// Deep Inspector for PDF Library
const parsePdfContent = async (buffer) => {
    try {
        // Style 1: Direct function
        if (typeof pdf === 'function') return await pdf(buffer);
        
        // Style 2: Named property (Found to be PDFParse on this system)
        if (pdf && typeof pdf.PDFParse === 'function') return await pdf.PDFParse(buffer);
        
        // Style 3: Default export
        if (pdf && typeof pdf.default === 'function') return await pdf.default(buffer);

        const type = typeof pdf;
        const keys = Object.keys(pdf || {}).join(', ');
        throw new Error(`PDF Library loaded as ${type}. Keys: [${keys}]`);
    } catch (e) {
        throw e;
    }
};

const analyzePdf = async (req, res) => {
    try {
        const { userId = 'default', chatId } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ error: "No PDF uploaded" });
        if (!chatId) return res.status(400).json({ error: "chatId is required for memory context" });

        console.log("Parsing PDF...");
        let pdfData;
        try {
            pdfData = await parsePdfContent(file.buffer);
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

        const systemPrompt = `You are a world-class AI Study Assistant. The user has uploaded a PDF document.
Analyze the following text extracted from the PDF.
Return a STRICT JSON response with this structure:
{
  "title": "A short, descriptive title of the document",
  "summary": "A 3-4 sentence high-level summary of what this document is about.",
  "keyConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4", "Concept 5"]
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
        const memoryFact = `Uploaded Document: ${analysis.title}. Summary: ${analysis.summary}. Core Concepts: ${analysis.keyConcepts.join(', ')}`;
        memoryService.updateMemoryAsync(userId, chatId, [{role: 'user', content: 'Uploaded a PDF document'}], memoryFact);

        return res.status(200).json(analysis);

    } catch (error) {
        console.error("PDF API Error:", error.response ? error.response.data : error.message);
        const detailedError = error.message || "Unknown error";
        return res.status(500).json({ error: `Failed to analyze PDF document. (Internal: ${detailedError})` });
    }
};

module.exports = { analyzePdf };
