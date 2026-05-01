const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    // TODO: Replace with real SMTP credentials (e.g. Gmail App Password)
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify/${token}`;

    const mailOptions = {
        from: '"Nova AI" <noreply@nova-ai.com>',
        to: email,
        subject: 'Verify your Nova AI Account',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #3b82f6;">Welcome to Nova AI! 🚀</h2>
                <p>You're almost ready to master your subjects. Please click the button below to verify your email and unlock all AI features:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Verify My Account</a>
                </div>
                <p style="color: #666; font-size: 12px;">If you didn't sign up for Nova AI, you can safely ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee;">
                <p style="text-align: center; color: #999; font-size: 11px;">Powered by Nova Intelligence</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    } catch (error) {
        console.error("❌ Failed to send email:", error.message);
        // We don't throw here to avoid crashing the registration flow if SMTP is not set up
    }
};

module.exports = { sendVerificationEmail };
