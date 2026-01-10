import Patient from '../Models/patientSchema.js';
import Visit from '../Models/visitSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';
import DoctorNotes from '../Models/doctorNotesSchema.js';

export const getPatientsByRisk = async (req, res) => {
    try {
        const { risk, category, village } = req.query;

        let query = { isActive: true };

        if (risk) {
            query.currentRiskLevel = risk;
        } else {
            query.currentRiskLevel = { $in: ['monitor', 'high'] };
        }

        if (category) {
            query.category = category;
        }

        if (village) {
            query.village = { $regex: village, $options: 'i' };
        }

        const patients = await Patient.find(query)
            .select('patientId name age gender category currentRiskLevel village lastRiskUpdate')
            .sort({ currentRiskLevel: -1, lastRiskUpdate: -1 })
            .lean();

        const patientsWithDetails = await Promise.all(
            patients.map(async (patient) => {
                const lastVisit = await Visit.findOne({ patientId: patient._id })
                    .sort({ visitDate: -1 })
                    .select('visitDate')
                    .lean();

                const latestRisk = await RiskAssessment.findOne({ patientId: patient._id })
                    .sort({ createdAt: -1 })
                    .select('riskLevel reasons requiresDoctorReview')
                    .lean();

                return {
                    ...patient,
                    lastVisitDate: lastVisit?.visitDate || null,
                    latestRiskReasons: latestRisk?.reasons || []
                };
            })
        );

        res.json({
            success: true,
            count: patientsWithDetails.length,
            patients: patientsWithDetails
        });

    } catch (error) {
        console.error('Get Patients By Risk Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patients',
            details: error.message
        });
    }
};

export const getPatientDetailForDoctor = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .populate('registeredBy', 'name phoneNumber village')
            .lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const visits = await Visit.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .populate('recordedBy', 'name')
            .lean();

        const riskHistory = await RiskAssessment.find({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const doctorNotes = await DoctorNotes.find({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .populate('doctorId', 'name')
            .lean();

        const trends = {};

        if (patient.category === 'pregnant' || patient.category === 'adult') {
            const bpData = visits
                .filter(v => v.pregnantVisit?.bp || v.adultVisit?.bp)
                .map(v => ({
                    date: v.visitDate,
                    systolic: v.pregnantVisit?.bp?.systolic || v.adultVisit?.bp?.systolic,
                    diastolic: v.pregnantVisit?.bp?.diastolic || v.adultVisit?.bp?.diastolic
                }))
                .reverse();

            if (bpData.length > 0) {
                trends.bloodPressure = bpData;
            }
        }

        if (patient.category === 'adult') {
            const sugarData = visits
                .filter(v => v.adultVisit?.sugar?.value)
                .map(v => ({
                    date: v.visitDate,
                    value: v.adultVisit.sugar.value,
                    type: v.adultVisit.sugar.type
                }))
                .reverse();

            if (sugarData.length > 0) {
                trends.bloodSugar = sugarData;
            }
        }

        if (patient.category === 'pregnant') {
            const weightData = visits
                .filter(v => v.pregnantVisit?.weight)
                .map(v => ({
                    date: v.visitDate,
                    weight: v.pregnantVisit.weight
                }))
                .reverse();

            if (weightData.length > 0) {
                trends.weight = weightData;
            }
        }

        res.json({
            success: true,
            patient: {
                ...patient,
                visits,
                riskHistory,
                doctorNotes,
                trends
            }
        });

    } catch (error) {
        console.error('Get Patient Detail Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patient details',
            details: error.message
        });
    }
};

export const addDoctorNotes = async (req, res) => {
    try {
        const { patientId, notes, advice, escalation, escalationDetails, followUpRequired, followUpDate } = req.body;

        if (!patientId || !notes) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID and notes are required'
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const doctorNote = await DoctorNotes.create({
            patientId,
            doctorId: req.user.userId,
            notes,
            advice,
            escalation: escalation || false,
            escalationDetails,
            followUpRequired: followUpRequired || false,
            followUpDate
        });

        res.status(201).json({
            success: true,
            message: 'Doctor notes added successfully',
            doctorNote
        });

    } catch (error) {
        console.error('Add Doctor Notes Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add doctor notes',
            details: error.message
        });
    }
};

export const markPatientReviewed = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const latestRisk = await RiskAssessment.findOne({ patientId: patient._id })
            .sort({ createdAt: -1 });

        if (latestRisk) {
            latestRisk.requiresDoctorReview = false;
            await latestRisk.save();
        }

        res.json({
            success: true,
            message: 'Patient marked as reviewed'
        });

    } catch (error) {
        console.error('Mark Reviewed Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark patient as reviewed',
            details: error.message
        });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const highRiskCount = await Patient.countDocuments({
            currentRiskLevel: 'high',
            isActive: true
        });

        const monitorCount = await Patient.countDocuments({
            currentRiskLevel: 'monitor',
            isActive: true
        });

        const normalCount = await Patient.countDocuments({
            currentRiskLevel: 'normal',
            isActive: true
        });

        const needsReview = await RiskAssessment.countDocuments({
            requiresDoctorReview: true
        });

        const categoryBreakdown = await Patient.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            stats: {
                riskLevels: {
                    high: highRiskCount,
                    monitor: monitorCount,
                    normal: normalCount
                },
                needsReview,
                categoryBreakdown
            }
        });

    } catch (error) {
        console.error('Get Dashboard Stats Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard stats',
            details: error.message
        });
    }
};

export const getDiseaseStats = async (req, res) => {
    try {
        // Get chronic conditions statistics from patients
        const chronicConditionsStats = await Patient.aggregate([
            { $match: { isActive: true, chronicConditions: { $exists: true, $ne: [] } } },
            { $unwind: '$chronicConditions' },
            {
                $group: {
                    _id: '$chronicConditions',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get symptoms statistics from recent visits
        const symptomStats = await Visit.aggregate([
            {
                $facet: {
                    pregnantSymptoms: [
                        { $match: { 'pregnantVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$pregnantVisit.symptoms' },
                        {
                            $group: {
                                _id: '$pregnantVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    childSymptoms: [
                        { $match: { 'childVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$childVisit.symptoms' },
                        {
                            $group: {
                                _id: '$childVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    adultSymptoms: [
                        { $match: { 'adultVisit.symptoms': { $exists: true, $ne: [] } } },
                        { $unwind: '$adultVisit.symptoms' },
                        {
                            $group: {
                                _id: '$adultVisit.symptoms',
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        // Combine all symptoms
        const allSymptoms = [
            ...(symptomStats[0]?.pregnantSymptoms || []),
            ...(symptomStats[0]?.childSymptoms || []),
            ...(symptomStats[0]?.adultSymptoms || [])
        ];

        // Merge duplicate symptoms
        const symptomsMap = {};
        allSymptoms.forEach(symptom => {
            if (symptomsMap[symptom._id]) {
                symptomsMap[symptom._id] += symptom.count;
            } else {
                symptomsMap[symptom._id] = symptom.count;
            }
        });

        const combinedSymptoms = Object.entries(symptomsMap)
            .map(([symptom, count]) => ({ _id: symptom, count }))
            .sort((a, b) => b.count - a.count);

        // Format data for Chart.js
        const chartData = {
            chronicConditions: {
                labels: chronicConditionsStats.map(item => item._id || 'Unknown'),
                data: chronicConditionsStats.map(item => item.count),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40',
                    '#FF6384',
                    '#C9CBCF'
                ]
            },
            symptoms: {
                labels: combinedSymptoms.map(item => item._id || 'Unknown'),
                data: combinedSymptoms.map(item => item.count),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40',
                    '#FF6384',
                    '#C9CBCF',
                    '#E7E9ED',
                    '#8E44AD'
                ]
            },
            categoryDistribution: {
                labels: ['Pregnant', 'Child', 'Adult'],
                data: await Promise.all([
                    Patient.countDocuments({ category: 'pregnant', isActive: true }),
                    Patient.countDocuments({ category: 'child', isActive: true }),
                    Patient.countDocuments({ category: 'adult', isActive: true })
                ]),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
            }
        };

        res.json({
            success: true,
            chartData,
            rawData: {
                chronicConditions: chronicConditionsStats,
                symptoms: combinedSymptoms
            }
        });

    } catch (error) {
        console.error('Get Disease Stats Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch disease statistics',
            details: error.message
        });
    }
};
