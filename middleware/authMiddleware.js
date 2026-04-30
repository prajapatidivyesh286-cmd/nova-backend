const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: "No authentication token, access denied" });
        }

        const verified = jwt.verify(token, process.env.JWT_SECRET || 'nova_ultra_secret_key');
        req.userId = verified.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: "Token verification failed, authorization denied" });
    }
};

module.exports = authMiddleware;
