const axios = require('axios');

// This function handles the incoming POST request to /chat
const handleChat = async (req, res) => {
    try {
        // 1. Input Validation
        const incomingMessages = req.body.messages;
        
        if (!incomingMessages || !Array.isArray(incomingMessages) || incomingMessages.length === 0) {
            return res.status(400).json({ error: "Messages array is required and cannot be empty." });
        }

        // 2. Prepare the Request payload for OpenRouter API
        const payload = {
            model: "openai/gpt-4o-mini",
            messages: incomingMessages
        };

        // 3. Setup Headers (Inject API Key securely from the .env environment)
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        };

        // 4. Call the OpenRouter API Securely
        // Using wait/await handles the asynchronous promise from axios nicely.
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, { headers });

        // Extract the generated response string deeply from structure
        const aiResponse = response.data.choices[0].message.content;

        // 5. Send a clean JSON response back to the client (Flutter app)
        return res.status(200).json({ reply: aiResponse });

    } catch (error) {
        // 6. Graceful Error Handling & Debugging

        // Log full error in console
        console.error(error);

        // Return clean JSON
        return res.status(500).json({ error: "Nova AI failed" });
    }
};

module.exports = {
    handleChat
};
