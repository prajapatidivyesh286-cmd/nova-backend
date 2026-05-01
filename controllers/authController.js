const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../services/mailService');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = new User({ 
            name, 
            email, 
            password,
            verificationToken,
            isVerified: false // Explicitly false for new users
        });
        await user.save();

        // Send Email (Async)
        sendVerificationEmail(email, verificationToken);
        
        return res.status(201).json({ 
            message: "Registration successful! Please check your email to verify your account.",
            needsVerification: true
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

        if (!user.isVerified) {
            return res.status(403).json({ 
                error: "Email not verified", 
                message: "Please verify your email address before logging in." 
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'nova_ultra_secret_key', { expiresIn: '7d' });

        return res.status(200).json({ 
            token, 
            user: { id: user._id, name: user.name, email: user.email, isPremium: user.isPremium } 
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Login failed" });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });

        if (!user) {
            return res.status(400).send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: #ef4444;">Verification Failed</h1>
                    <p>Invalid or expired verification token.</p>
                    <a href="/">Go back to Nova AI</a>
                </div>
            `);
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        return res.status(200).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #3b82f6;">Account Verified! 🎉</h1>
                <p>Your email has been successfully verified. You can now log in to Nova AI.</p>
                <a href="/" style="color: #3b82f6; font-weight: bold;">Return to App</a>
            </div>
        `);
    } catch (error) {
        res.status(500).json({ error: "Verification failed" });
    }
};

module.exports = { register, login, verifyEmail };
