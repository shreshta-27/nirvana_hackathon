import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
    visitId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true,
        index: true
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    visitDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    category: {
        type: String,
        enum: ['pregnant', 'child', 'adult'],
        required: true
    },
    pregnantVisit: {
        pregnancyMonth: Number,
        ancVisitCount: Number,
        bp: {
            systolic: Number,
            diastolic: Number
        },
        weight: Number,
        hb: Number,
        ttInjection: Boolean,
        supplements: {
            iron: Boolean,
            calcium: Boolean
        },
        symptoms: [{
            type: String,
            enum: ['swelling', 'dizziness', 'bleeding', 'headache', 'vomiting', 'other']
        }]
    },
    childVisit: {
        ageInMonths: Number,
        weight: Number,
        height: Number,
        vaccinations: [{
            type: String
        }],
        nutritionStatus: {
            type: String,
            enum: ['normal', 'moderate', 'severe']
        },
        symptoms: [{
            type: String,
            enum: ['fever', 'diarrhea', 'cough', 'rash', 'vomiting', 'other']
        }]
    },
    adultVisit: {
        bp: {
            systolic: Number,
            diastolic: Number
        },
        sugar: {
            type: {
                type: String,
                enum: ['fasting', 'random']
            },
            value: Number
        },
        chronicCondition: String,
        medicationAdherence: Boolean,
        symptoms: [{
            type: String,
            enum: ['chest_pain', 'breathlessness', 'fatigue', 'dizziness', 'other']
        }]
    },
    notes: {
        type: String,
        trim: true
    },
    metadata: {
        localId: { type: String, unique: true },
        syncStatus: {
            type: String,
            enum: ['synced', 'pending', 'conflict'],
            default: 'synced'
        },
        deviceTimestamp: { type: Date }
    }
}, {
    timestamps: true
});

visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ recordedBy: 1, visitDate: -1 });
visitSchema.index({ syncStatus: 1 });

visitSchema.pre('save', async function (next) {
    if (!this.visitId) {
        const count = await mongoose.model('Visit').countDocuments();
        this.visitId = `VIS${String(count + 1).padStart(8, '0')}`;
    }
    next();
});

const Visit = mongoose.model('Visit', visitSchema);

export default Visit;
