import { GoogleGenerativeAI } from '@google/generative-ai';
import Visit from '../Models/visitSchema.js';
import Patient from '../Models/patientSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const analyzeRiskWithAI = async (patient, currentVisit, previousVisits) => {
    try {
        const prompt = `You are a healthcare risk assessment AI for rural India analyzing patient data.

Patient Category: ${patient.category}
Patient Age: ${patient.age}
Gender: ${patient.gender}

Current Visit Data:
${JSON.stringify(currentVisit, null, 2)}

Previous 3 Visits:
${JSON.stringify(previousVisits, null, 2)}

Analyze the patient's health data and provide:
1. Risk Level: Choose ONLY one of these: "normal", "monitor", or "high"
2. Reasons: 2-3 specific bullet points explaining the risk level
3. Trend Analysis: If applicable, describe any concerning trends
4. Recommendations: 2-3 actionable recommendations

Respond ONLY with valid JSON in this exact format:
{
  "riskLevel": "normal|monitor|high",
  "reasons": ["reason1", "reason2"],
  "trendAnalysis": {
    "metric": "bp|sugar|weight|hb",
    "trend": "increasing|decreasing|stable",
    "description": "brief description"
  },
  "recommendations": ["recommendation1", "recommendation2"],
  "requiresDoctorReview": true|false
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in AI response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return analysis;
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return null;
    }
};

const calculateRuleBased = (patient, currentVisit, previousVisits) => {
    let riskLevel = 'normal';
    const reasons = [];
    let requiresDoctorReview = false;

    if (patient.category === 'pregnant') {
        const bp = currentVisit.pregnantVisit?.bp;
        if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
            riskLevel = 'high';
            reasons.push('Blood pressure elevated above normal range (140/90)');
            requiresDoctorReview = true;
        }

        if (currentVisit.pregnantVisit?.symptoms?.includes('bleeding')) {
            riskLevel = 'high';
            reasons.push('Bleeding symptoms detected');
            requiresDoctorReview = true;
        }

        if (currentVisit.pregnantVisit?.hb && currentVisit.pregnantVisit.hb < 11) {
            if (riskLevel === 'normal') riskLevel = 'monitor';
            reasons.push('Low hemoglobin level detected');
        }
    }

    if (patient.category === 'child') {
        if (currentVisit.childVisit?.nutritionStatus === 'severe') {
            riskLevel = 'high';
            reasons.push('Severe malnutrition detected');
            requiresDoctorReview = true;
        }

        const feverSymptom = currentVisit.childVisit?.symptoms?.includes('fever');
        const diarrheaSymptom = currentVisit.childVisit?.symptoms?.includes('diarrhea');

        if (feverSymptom && diarrheaSymptom) {
            if (riskLevel === 'normal') riskLevel = 'monitor';
            reasons.push('Multiple symptoms present (fever and diarrhea)');
        }
    }

    if (patient.category === 'adult') {
        const bp = currentVisit.adultVisit?.bp;
        if (bp && (bp.systolic >= 140 || bp.diastolic >= 90)) {
            const highBPCount = previousVisits.filter(v =>
                v.adultVisit?.bp?.systolic >= 140 || v.adultVisit?.bp?.diastolic >= 90
            ).length;

            if (highBPCount >= 2) {
                riskLevel = 'high';
                reasons.push(`Blood pressure consistently elevated over ${highBPCount + 1} visits`);
                requiresDoctorReview = true;
            } else {
                if (riskLevel === 'normal') riskLevel = 'monitor';
                reasons.push('Blood pressure elevated');
            }
        }

        const sugar = currentVisit.adultVisit?.sugar;
        if (sugar) {
            if ((sugar.type === 'fasting' && sugar.value >= 126) ||
                (sugar.type === 'random' && sugar.value >= 200)) {
                riskLevel = 'high';
                reasons.push('Blood sugar levels in diabetic range');
                requiresDoctorReview = true;
            }
        }

        if (currentVisit.adultVisit?.medicationAdherence === false) {
            if (riskLevel === 'normal') riskLevel = 'monitor';
            reasons.push('Medication non-adherence reported');
        }
    }

    if (reasons.length === 0) {
        reasons.push('All vital signs within normal range');
    }

    return {
        riskLevel,
        reasons,
        requiresDoctorReview,
        recommendations: riskLevel === 'high'
            ? ['Visit PHC immediately', 'Continue monitoring symptoms']
            : ['Continue regular checkups', 'Maintain healthy lifestyle']
    };
};

export const addVisit = async (req, res) => {
    try {
        const { patientId, category, pregnantVisit, childVisit, adultVisit, notes, localTimestamp } = req.body;

        if (!patientId || !category) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID and category are required'
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const visit = await Visit.create({
            patientId,
            recordedBy: req.user.userId,
            category,
            pregnantVisit,
            childVisit,
            adultVisit,
            notes,
            localTimestamp: localTimestamp || new Date()
        });

        const previousVisits = await Visit.find({
            patientId,
            _id: { $ne: visit._id }
        })
            .sort({ visitDate: -1 })
            .limit(3)
            .lean();

        let riskAnalysis = await analyzeRiskWithAI(patient, visit, previousVisits);

        if (!riskAnalysis) {
            riskAnalysis = calculateRuleBased(patient, visit, previousVisits);
        }

        const trendData = {};
        if (riskAnalysis.trendAnalysis) {
            trendData.trendAnalysis = riskAnalysis.trendAnalysis;
        }

        const riskAssessment = await RiskAssessment.create({
            patientId,
            visitId: visit._id,
            riskLevel: riskAnalysis.riskLevel,
            reasons: riskAnalysis.reasons,
            ...trendData,
            recommendations: riskAnalysis.recommendations,
            requiresDoctorReview: riskAnalysis.requiresDoctorReview || false
        });

        if (adultVisit?.bp || pregnantVisit?.bp) {
            const bp = adultVisit?.bp || pregnantVisit?.bp;
            if (bp.systolic && bp.diastolic) {
                if (!patient.medicalHistory) patient.medicalHistory = {};
                if (!patient.medicalHistory.latestVitals) patient.medicalHistory.latestVitals = {};
                patient.medicalHistory.latestVitals.bp = bp;
            }
        }

        if (adultVisit?.sugar) {
            if (adultVisit.sugar.value) {
                if (!patient.medicalHistory) patient.medicalHistory = {};
                if (!patient.medicalHistory.latestVitals) patient.medicalHistory.latestVitals = {};
                patient.medicalHistory.latestVitals.sugarLevel = adultVisit.sugar;
            }
        }

        patient.currentRiskLevel = riskAnalysis.riskLevel;
        patient.lastRiskUpdate = new Date();
        patient.markModified('medicalHistory');
        await patient.save();

        res.status(201).json({
            success: true,
            message: 'Visit recorded successfully',
            visit: {
                id: visit._id,
                visitId: visit.visitId,
                visitDate: visit.visitDate
            },
            riskAssessment: {
                riskLevel: riskAssessment.riskLevel,
                reasons: riskAssessment.reasons,
                recommendations: riskAssessment.recommendations,
                requiresDoctorReview: riskAssessment.requiresDoctorReview
            }
        });

    } catch (error) {
        console.error('Add Visit Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record visit',
            details: error.message
        });
    }
};

export const getVisitHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        const visits = await Visit.find({ patientId })
            .populate('recordedBy', 'name')
            .sort({ visitDate: -1 })
            .lean();

        const visitsWithRisk = await Promise.all(
            visits.map(async (visit) => {
                const risk = await RiskAssessment.findOne({ visitId: visit._id })
                    .select('riskLevel reasons')
                    .lean();

                return {
                    ...visit,
                    riskAssessment: risk
                };
            })
        );

        res.json({
            success: true,
            count: visitsWithRisk.length,
            visits: visitsWithRisk
        });

    } catch (error) {
        console.error('Get Visit History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch visit history',
            details: error.message
        });
    }
};

export const syncBatchVisits = async (req, res) => {
    try {
        const { visits } = req.body;

        if (!visits || !Array.isArray(visits)) {
            return res.status(400).json({
                success: false,
                error: 'Visits array is required'
            });
        }

        const results = [];

        for (const visitData of visits) {
            try {
                const visit = await Visit.create({
                    ...visitData,
                    recordedBy: req.user.userId,
                    syncStatus: 'synced'
                });

                results.push({
                    success: true,
                    visitId: visit.visitId,
                    localId: visitData.localId
                });
            } catch (error) {
                results.push({
                    success: false,
                    localId: visitData.localId,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: 'Batch sync completed',
            results
        });

    } catch (error) {
        console.error('Batch Sync Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync visits',
            details: error.message
        });
    }
};
