import otpGenerator from 'otp-generator';
import jwt from 'jsonwebtoken';
import User from '../Models/userSchema.js';
import OTP from '../Models/otpSchema.js';
import { sendOTPEmail, sendWelcomeEmail } from '../Config/emailService.js';

const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

export const sendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        await OTP.deleteMany({ email, verified: false });

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        await OTP.create({
            email,
            otp,
            expiresAt,
            type: 'email'
        });

        try {
            await sendOTPEmail(email, otp, expiryMinutes);
        } catch (emailError) {
            console.error('Email sending error:', emailError.message);
            return res.status(500).json({
                success: false,
                error: 'Failed to send OTP email',
                details: emailError.message
            });
        }

        res.json({
            success: true,
            message: 'OTP sent to your email',
            expiresIn: `${expiryMinutes} minutes`,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Send Email OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send OTP',
            details: error.message
        });
    }
};

export const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp, role, name, village, language } = req.body;

        if (!email || !otp || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email, OTP, and role are required'
            });
        }

        const otpRecord = await OTP.findOne({
            email,
            otp,
            type: 'email',
            verified: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
            const existingOTP = await OTP.findOne({ email, type: 'email', verified: false });
            if (existingOTP) {
                existingOTP.attempts += 1;
                await existingOTP.save();

                if (existingOTP.attempts >= existingOTP.maxAttempts) {
                    await OTP.deleteOne({ _id: existingOTP._id });
                    return res.status(400).json({
                        success: false,
                        error: 'Maximum OTP attempts exceeded. Please request a new OTP.'
                    });
                }
            }

            return res.status(400).json({
                success: false,
                error: 'Invalid or expired OTP'
            });
        }

        if (otpRecord.attempts >= otpRecord.maxAttempts) {
            return res.status(400).json({
                success: false,
                error: 'Maximum OTP attempts exceeded. Please request a new OTP.'
            });
        }

        otpRecord.verified = true;
        await otpRecord.save();

        let user = await User.findOne({ email });

        if (!user) {
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required for new users'
                });
            }

            user = await User.create({
                email,
                role,
                name,
                village,
                language: language || 'en'
            });

            await sendWelcomeEmail(email, name);
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        const token = generateToken(user._id, user.role);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                name: user.name,
                language: user.language,
                village: user.village
            }
        });

    } catch (error) {
        console.error('Verify Email OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify OTP',
            details: error.message
        });
    }
};

export const resendEmailOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const recentOTP = await OTP.findOne({
            email,
            type: 'email',
            createdAt: { $gt: new Date(Date.now() - 60000) }
        });

        if (recentOTP) {
            return res.status(429).json({
                success: false,
                error: 'Please wait 60 seconds before requesting a new OTP'
            });
        }

        await OTP.deleteMany({ email, verified: false });

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        await OTP.create({
            email,
            otp,
            expiresAt,
            type: 'email'
        });

        await sendOTPEmail(email, otp, expiryMinutes);

        res.json({
            success: true,
            message: 'New OTP sent to your email',
            expiresIn: `${expiryMinutes} minutes`,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Resend Email OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resend OTP',
            details: error.message
        });
    }
};
