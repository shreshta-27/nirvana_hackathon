import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
    role: {
        type: String,
        enum: ['worker', 'doctor'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        enum: ['en', 'hi', 'mr'],
        default: 'en'
    },
    village: {
        type: String,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

userSchema.index({ role: 1, isActive: 1 });

const User = mongoose.model('User', userSchema);

export default User;
