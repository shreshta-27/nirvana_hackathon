import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        trim: true,
        index: true,
        sparse: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
        sparse: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    type: {
        type: String,
        enum: ['phone', 'email'],
        default: 'phone'
    }
}, {
    timestamps: true
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ phoneNumber: 1, verified: 1, expiresAt: 1 });
otpSchema.index({ email: 1, verified: 1, expiresAt: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
