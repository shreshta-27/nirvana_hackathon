import User from '../Models/userSchema.js';
import Patient from '../Models/patientSchema.js';
import Visit from '../Models/visitSchema.js';

export const getWorkerProfile = async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Worker role required.'
            });
        }

        const worker = await User.findById(req.user.userId).select('-__v');

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: 'Worker profile not found'
            });
        }

        const stats = await getWorkerStats(worker._id);

        res.json({
            success: true,
            worker: {
                ...worker.toObject(),
                stats
            }
        });
    } catch (error) {
        console.error('Get Worker Profile Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get worker profile',
            details: error.message
        });
    }
};

export const updateWorkerProfile = async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Worker role required.'
            });
        }

        const { name, email, phoneNumber, village, language } = req.body;

        const worker = await User.findById(req.user.userId);

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }

        if (email && email !== worker.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: worker._id } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use by another user'
                });
            }
            worker.email = email;
        }

        if (phoneNumber && phoneNumber !== worker.phoneNumber) {
            const existingUser = await User.findOne({ phoneNumber, _id: { $ne: worker._id } });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number already in use by another user'
                });
            }
            worker.phoneNumber = phoneNumber;
        }

        if (name) worker.name = name;
        if (village) worker.village = village;
        if (language && ['en', 'hi', 'mr'].includes(language)) {
            worker.language = language;
        }

        await worker.save();

        res.json({
            success: true,
            message: 'Worker profile updated successfully',
            worker
        });
    } catch (error) {
        console.error('Update Worker Profile Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update worker profile',
            details: error.message
        });
    }
};

export const getAllWorkers = async (req, res) => {
    try {
        const { village, isActive = true } = req.query;

        const query = { role: 'worker' };

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (village) {
            query.village = { $regex: village, $options: 'i' };
        }

        const workers = await User.find(query)
            .select('-__v')
            .sort({ createdAt: -1 })
            .lean();

        const workersWithStats = await Promise.all(
            workers.map(async (worker) => {
                const stats = await getWorkerStats(worker._id);
                return {
                    ...worker,
                    stats
                };
            })
        );

        res.json({
            success: true,
            count: workersWithStats.length,
            workers: workersWithStats
        });
    } catch (error) {
        console.error('Get All Workers Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get workers',
            details: error.message
        });
    }
};

export const getWorkerById = async (req, res) => {
    try {
        const { id } = req.params;

        const worker = await User.findOne({ _id: id, role: 'worker' }).select('-__v').lean();

        if (!worker) {
            return res.status(404).json({
                success: false,
                error: 'Worker not found'
            });
        }

        const stats = await getWorkerStats(worker._id);
        const recentPatients = await Patient.find({ registeredBy: worker._id })
            .select('patientId name age gender category currentRiskLevel createdAt')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.json({
            success: true,
            worker: {
                ...worker,
                stats,
                recentPatients
            }
        });
    } catch (error) {
        console.error('Get Worker By ID Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get worker',
            details: error.message
        });
    }
};

export const getWorkerPatients = async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Worker role required.'
            });
        }

        const { category, riskLevel } = req.query;
        const query = { registeredBy: req.user.userId, isActive: true };

        if (category) {
            query.category = category;
        }

        if (riskLevel) {
            query.currentRiskLevel = riskLevel;
        }

        const patients = await Patient.find(query)
            .select('patientId name age gender category currentRiskLevel village lastRiskUpdate')
            .sort({ lastRiskUpdate: -1 })
            .lean();

        res.json({
            success: true,
            count: patients.length,
            patients
        });
    } catch (error) {
        console.error('Get Worker Patients Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get worker patients',
            details: error.message
        });
    }
};

export const getWorkerDashboard = async (req, res) => {
    try {
        if (req.user.role !== 'worker') {
            return res.status(403).json({
                success: false,
                error: 'Access denied. Worker role required.'
            });
        }

        const stats = await getWorkerStats(req.user.userId);

        const recentVisits = await Visit.find({ recordedBy: req.user.userId })
            .sort({ visitDate: -1 })
            .limit(5)
            .populate('patientId', 'name patientId category')
            .lean();

        const highRiskPatients = await Patient.find({
            registeredBy: req.user.userId,
            currentRiskLevel: 'high',
            isActive: true
        })
            .select('patientId name age gender category village lastRiskUpdate')
            .sort({ lastRiskUpdate: -1 })
            .limit(10)
            .lean();

        res.json({
            success: true,
            dashboard: {
                stats,
                recentVisits,
                highRiskPatients
            }
        });
    } catch (error) {
        console.error('Get Worker Dashboard Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get worker dashboard',
            details: error.message
        });
    }
};

async function getWorkerStats(workerId) {
    const totalPatients = await Patient.countDocuments({
        registeredBy: workerId,
        isActive: true
    });

    const totalVisits = await Visit.countDocuments({
        recordedBy: workerId
    });

    const highRiskCount = await Patient.countDocuments({
        registeredBy: workerId,
        currentRiskLevel: 'high',
        isActive: true
    });

    const monitorCount = await Patient.countDocuments({
        registeredBy: workerId,
        currentRiskLevel: 'monitor',
        isActive: true
    });

    const categoryBreakdown = await Patient.aggregate([
        { $match: { registeredBy: workerId, isActive: true } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 }
            }
        }
    ]);

    return {
        totalPatients,
        totalVisits,
        highRiskCount,
        monitorCount,
        categoryBreakdown
    };
}
