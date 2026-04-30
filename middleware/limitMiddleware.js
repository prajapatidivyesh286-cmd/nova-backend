const User = require('../models/User');

const checkPdfLimit = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.isPremium && user.pdfUploads >= 3) {
            return res.status(403).json({ 
                error: "Limit Reached", 
                message: "You've used your 3 free PDF uploads for this week. Upgrade to Pro for unlimited document analysis!",
                code: "PREMIUM_REQUIRED"
            });
        }

        // Increment count for free users
        if (!user.isPremium) {
            user.pdfUploads += 1;
            await user.save();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: "Limit check failed" });
    }
};

const checkQuizLimit = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.isPremium && user.quizCount >= 5) {
            return res.status(403).json({ 
                error: "Limit Reached", 
                message: "Daily quiz limit reached. Upgrade to Pro for unlimited practice!",
                code: "PREMIUM_REQUIRED"
            });
        }

        if (!user.isPremium) {
            user.quizCount += 1;
            await user.save();
        }
        next();
    } catch (error) {
        res.status(500).json({ error: "Limit check failed" });
    }
};

module.exports = { checkPdfLimit, checkQuizLimit };
