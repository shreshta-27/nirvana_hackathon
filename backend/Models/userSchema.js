import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    role: {
        type: String,
        enum: ['frontline_worker', 'doctor', 'patient'],
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
