import mongoose from 'mongoose';

const riskAssessmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    visitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Visit',
        required: true
    },
    riskLevel: {
        type: String,
        enum: ['normal', 'monitor', 'high'],
        required: true,
        index: true
    },
    reasons: [{
        type: String
    }],
    trendAnalysis: {
        metric: {
            type: String,
            enum: ['bp', 'sugar', 'weight', 'hb', 'vaccination']
        },
        trend: {
            type: String,
            enum: ['increasing', 'decreasing', 'stable', 'irregular']
        },
        values: [Number],
        dates: [Date]
    },
    recommendations: [{
        type: String
    }],
    requiresDoctorReview: {
        type: Boolean,
        default: false,
        index: true
    },
    alertSent: {
        type: Boolean,
        default: false
    },
    alertSentAt: {
        type: Date
    },
    alertMethod: {
        type: String,
        enum: ['sms', 'whatsapp', 'both']
    },
    aiModel: {
        type: String,
        default: 'gemini-2.5-flash'
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1
    }
}, {
    timestamps: true
});

riskAssessmentSchema.index({ patientId: 1, createdAt: -1 });
riskAssessmentSchema.index({ riskLevel: 1, requiresDoctorReview: 1 });
riskAssessmentSchema.index({ alertSent: 1 });

const RiskAssessment = mongoose.model('RiskAssessment', riskAssessmentSchema);

export default RiskAssessment;
