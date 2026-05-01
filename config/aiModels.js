const AI_MODELS = {
    FREE: {
        id: "openai/gpt-4o-mini",
        name: "Nova Fast",
        description: "Balanced speed and intelligence."
    },
    PRO: [
        {
            id: "openai/gpt-4o",
            name: "GPT-4o (Ultra)",
            description: "Deep reasoning for complex subjects."
        },
        {
            id: "anthropic/claude-3.5-sonnet",
            name: "Claude 3.5",
            description: "Exceptional for writing and creative analysis."
        },
        {
            id: "google/gemini-pro-1.5",
            name: "Gemini Pro",
            description: "The best for long documents and massive context."
        }
    ]
};

const getModelForUser = (user, requestedModelId) => {
    // If user is not premium, they are locked to the FREE model
    if (!user.isPremium) return AI_MODELS.FREE.id;

    // If premium user requests a specific pro model, give it to them
    const proModel = AI_MODELS.PRO.find(m => m.id === requestedModelId);
    return proModel ? proModel.id : AI_MODELS.FREE.id;
};

module.exports = { AI_MODELS, getModelForUser };
