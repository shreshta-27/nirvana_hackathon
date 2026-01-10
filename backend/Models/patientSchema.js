import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
    patientId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    age: {
        type: Number,
        required: true
    },
    dob: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    village: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['pregnant', 'child', 'adult'],
        required: true,
        index: true
    },
    pregnancyDetails: {
        lmp: Date,
        edd: Date,
        trimester: {
            type: Number,
            min: 1,
            max: 3
        }
    },
    childDetails: {
        ageInMonths: Number,
        birthWeight: Number
    },
    chronicConditions: [{
        type: String,
        enum: [
            'Diabetes',
            'Hypertension',
            'Thyroid',
            'Asthma',
            'Arthritis',
            'Cardiovascular Disease',
            'Kidney Disease',
            'Tuberculosis',
            'Anemia',
            'PCOS',
            'Epilepsy',
            'Cancer',
            'Other'
        ]
    }],
    medicalHistory: {
        hypertension: {
            type: Boolean,
            default: false
        },
        diabetes: {
            type: Boolean,
            default: false
        },
        thyroid: {
            type: String,
            enum: ['hypo', 'hyper', 'normal', 'none'],
            default: 'none'
        },
        latestVitals: {
            bp: {
                systolic: Number,
                diastolic: Number
            },
            sugarLevel: {
                value: String,
                type: { type: String, enum: ['fasting', 'random', 'pp'] }
            }
        }
    },
    currentRiskLevel: {
        type: String,
        enum: ['normal', 'monitor', 'high'],
        default: 'normal',
        index: true
    },
    missedCare: {
        status: { type: Boolean, default: false },
        type: { type: String, enum: ['ANC', 'Vaccination', 'Medication', 'General', 'None'], default: 'None' },
        missedSince: Date
    },
    lastRiskUpdate: {
        type: Date
    },
    healthCardId: {
        type: String,
        unique: true
    },
    qrCode: {
        type: String
    },
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

patientSchema.index({ category: 1, currentRiskLevel: 1 });
patientSchema.index({ village: 1, category: 1 });
patientSchema.index({ registeredBy: 1, isActive: 1 });

patientSchema.pre('save', async function (next) {
    if (!this.patientId) {
        const count = await mongoose.model('Patient').countDocuments();
        this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
        this.healthCardId = `HC${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
