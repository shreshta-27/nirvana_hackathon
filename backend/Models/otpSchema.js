import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        index: true
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
    }
}, {
    timestamps: true
});

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ phoneNumber: 1, verified: 1, expiresAt: 1 });

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
