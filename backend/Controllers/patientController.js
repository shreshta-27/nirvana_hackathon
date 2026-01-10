import Patient from '../Models/patientSchema.js';
import Visit from '../Models/visitSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';
import QRCode from 'qrcode';
import { clearCache } from '../Middlewares/cacheMiddleware.js';

export const registerPatient = async (req, res) => {
    try {
        const { name, age, dob, gender, phoneNumber, village, category, pregnancyDetails, childDetails, chronicConditions } = req.body;

        if (!name || !age || !gender || !village || !category) {
            return res.status(400).json({
                success: false,
                error: 'Name, age, gender, village, and category are required'
            });
        }

        const patient = await Patient.create({
            name,
            age,
            dob,
            gender,
            phoneNumber,
            village,
            category,
            pregnancyDetails,
            childDetails,
            chronicConditions,
            registeredBy: req.user.userId
        });

        const qrData = JSON.stringify({
            patientId: patient.patientId,
            healthCardId: patient.healthCardId,
            name: patient.name,
            category: patient.category
        });

        const qrCode = await QRCode.toDataURL(qrData);
        patient.qrCode = qrCode;
        await patient.save();

        clearCache('/api/patients');
        clearCache('/api/doctor');
        clearCache('/api/charts');

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            patient: {
                id: patient._id,
                patientId: patient.patientId,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                category: patient.category,
                healthCardId: patient.healthCardId,
                qrCode: patient.qrCode
            }
        });

    } catch (error) {
        console.error('Register Patient Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register patient',
            details: error.message
        });
    }
};

export const getAllPatients = async (req, res) => {
    try {
        const { search, category, risk, village } = req.query;

        let query = { isActive: true };

        if (req.user.role === 'frontline_worker') {
            query.registeredBy = req.user.userId;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { patientId: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (risk) {
            query.currentRiskLevel = risk;
        }

        if (village) {
            query.village = { $regex: village, $options: 'i' };
        }

        const patients = await Patient.find(query)
            .select('patientId name age gender category currentRiskLevel village updatedAt')
            .sort({ updatedAt: -1 })
            .lean();

        const patientsWithLastVisit = await Promise.all(
            patients.map(async (patient) => {
                const lastVisit = await Visit.findOne({ patientId: patient._id })
                    .sort({ visitDate: -1 })
                    .select('visitDate')
                    .lean();

                return {
                    ...patient,
                    lastVisitDate: lastVisit?.visitDate || null
                };
            })
        );

        res.json({
            success: true,
            count: patientsWithLastVisit.length,
            patients: patientsWithLastVisit
        });

    } catch (error) {
        console.error('Get Patients Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patients',
            details: error.message
        });
    }
};

export const getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .populate('registeredBy', 'name phoneNumber')
            .lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const visits = await Visit.find({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .limit(10)
            .lean();

        const latestRisk = await RiskAssessment.findOne({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            patient: {
                ...patient,
                recentVisits: visits,
                latestRiskAssessment: latestRisk
            }
        });

    } catch (error) {
        console.error('Get Patient Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch patient',
            details: error.message
        });
    }
};

export const updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, age, phoneNumber, village, pregnancyDetails, childDetails, chronicConditions } = req.body;

        const patient = await Patient.findById(id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        if (name) patient.name = name;
        if (age) patient.age = age;
        if (phoneNumber) patient.phoneNumber = phoneNumber;
        if (village) patient.village = village;
        if (pregnancyDetails) patient.pregnancyDetails = { ...patient.pregnancyDetails, ...pregnancyDetails };
        if (childDetails) patient.childDetails = { ...patient.childDetails, ...childDetails };
        if (chronicConditions) patient.chronicConditions = chronicConditions;

        await patient.save();

        clearCache('/api/patients');
        clearCache('/api/doctor');
        clearCache('/api/charts');

        res.json({
            success: true,
            message: 'Patient updated successfully',
            patient
        });

    } catch (error) {
        console.error('Update Patient Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update patient',
            details: error.message
        });
    }
};

export const getHealthCard = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .select('patientId healthCardId name age gender category currentRiskLevel qrCode chronicConditions')
            .lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        const latestVisit = await Visit.findOne({ patientId: patient._id })
            .sort({ visitDate: -1 })
            .lean();

        const latestRisk = await RiskAssessment.findOne({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .select('riskLevel reasons recommendations')
            .lean();

        res.json({
            success: true,
            healthCard: {
                ...patient,
                latestVisit,
                latestRiskAssessment: latestRisk
            }
        });

    } catch (error) {
        console.error('Get Health Card Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch health card',
            details: error.message
        });
    }
};
