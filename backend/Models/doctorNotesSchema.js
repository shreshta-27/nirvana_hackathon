import mongoose from 'mongoose';

const doctorNotesSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notes: {
        type: String,
        required: true,
        trim: true
    },
    advice: {
        type: String,
        trim: true
    },
    escalation: {
        type: Boolean,
        default: false
    },
    escalationDetails: {
        type: String,
        trim: true
    },
    reviewedAt: {
        type: Date,
        default: Date.now
    },
    followUpRequired: {
        type: Boolean,
        default: false
    },
    followUpDate: {
        type: Date
    }
}, {
    timestamps: true
});

doctorNotesSchema.index({ patientId: 1, createdAt: -1 });
doctorNotesSchema.index({ doctorId: 1, reviewedAt: -1 });
doctorNotesSchema.index({ escalation: 1 });

const DoctorNotes = mongoose.model('DoctorNotes', doctorNotesSchema);

export default DoctorNotes;
