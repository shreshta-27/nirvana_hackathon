import Patient from '../Models/patientSchema.js';
import Visit from '../Models/visitSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';

export const getPublicHealthCard = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { patientId: id },
                { healthCardId: id }
            ]
        }).select('patientId healthCardId name age gender category currentRiskLevel medicalHistory chronicConditions isActive').lean();

        if (!patient || !patient.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Health card not found or inactive'
            });
        }

        const lastVisit = await Visit.findOne({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .select('visitDate category')
            .lean();

        const risk = await RiskAssessment.findOne({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .select('riskLevel')
            .lean();

        res.json({
            success: true,
            healthCard: {
                id: patient.patientId,
                cardId: patient.healthCardId,
                personal: {
                    name: patient.name,
                    age: patient.age,
                    gender: patient.gender,
                    category: patient.category
                },
                health: {
                    riskLevel: risk?.riskLevel || patient.currentRiskLevel,
                    conditions: patient.chronicConditions,
                    bloodType: patient.medicalHistory?.bloodGroup || 'Unknown',
                    hypertension: patient.medicalHistory?.hypertension,
                    diabetes: patient.medicalHistory?.diabetes,
                    thyroid: patient.medicalHistory?.thyroid
                },
                lastVisit: lastVisit ? lastVisit.visitDate : 'No visits recorded',
                generatedAt: new Date()
            }
        });

    } catch (error) {
        console.error('Public Health Card Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to access health card'
        });
    }
};
