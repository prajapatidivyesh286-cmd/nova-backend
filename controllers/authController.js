const User = require('../models/User');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        const user = new User({ name, email, password });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'nova_ultra_secret_key', { expiresIn: '7d' });
        
        return res.status(201).json({ 
            token, 
            user: { id: user._id, name: user.name, email: user.email } 
        });
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ error: "Registration failed" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'nova_ultra_secret_key', { expiresIn: '7d' });

        return res.status(200).json({ 
            token, 
            user: { id: user._id, name: user.name, email: user.email } 
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Login failed" });
    }
};

module.exports = { register, login };
