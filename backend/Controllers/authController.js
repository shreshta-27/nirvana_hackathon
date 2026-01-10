import otpGenerator from 'otp-generator';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import User from '../Models/userSchema.js';
import OTP from '../Models/otpSchema.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

export const sendOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }

        await OTP.deleteMany({ phoneNumber, verified: false });

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });

        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        await OTP.create({
            phoneNumber,
            otp,
            expiresAt
        });

        try {
            await twilioClient.messages.create({
                body: `Your Nivarna verification code is: ${otp}. Valid for ${expiryMinutes} minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });
        } catch (twilioError) {
            console.error('Twilio Error:', twilioError.message);
        }

        res.json({
            success: true,
            message: 'OTP processed',
            expiresIn: `${expiryMinutes} minutes`,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send OTP',
            details: error.message
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { phoneNumber, otp, role, name, village, language } = req.body;

        if (!phoneNumber || !otp || !role) {
            return res.status(400).json({
                success: false,
                error: 'Phone number, OTP, and role are required'
            });
        }

        const otpRecord = await OTP.findOne({
            phoneNumber,
            otp,
            verified: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otpRecord) {
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

        let user = await User.findOne({ phoneNumber });

        if (!user) {
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name is required for new users'
                });
            }

            user = await User.create({
                phoneNumber,
                role,
                name,
                village,
                language: language || 'en'
            });
        } else {
            user.lastLogin = new Date();
            await user.save();
        }

        const token = generateToken(user._id, user.role);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                phoneNumber: user.phoneNumber,
                role: user.role,
                name: user.name,
                language: user.language,
                village: user.village
            }
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify OTP',
            details: error.message
        });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token');

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-__v');

        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get user data'
        });
    }
};
