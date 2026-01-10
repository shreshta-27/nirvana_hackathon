import twilio from 'twilio';
import Patient from '../Models/patientSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const createAlertMessage = (patient, riskAssessment) => {
    const riskEmoji = {
        high: '🔴',
        monitor: '🟡',
        normal: '🟢'
    };

    const emoji = riskEmoji[riskAssessment.riskLevel] || '⚠️';

    let message = `${emoji} Nivarna Health Alert\n\n`;
    message += `Dear ${patient.name},\n\n`;
    message += `Your recent health check shows ${riskAssessment.riskLevel.toUpperCase()} risk.\n\n`;

    if (riskAssessment.reasons && riskAssessment.reasons.length > 0) {
        message += `Reason:\n`;
        riskAssessment.reasons.forEach((reason, index) => {
            message += `${index + 1}. ${reason}\n`;
        });
        message += `\n`;
    }

    if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
        message += `Recommendations:\n`;
        riskAssessment.recommendations.forEach((rec, index) => {
            message += `${index + 1}. ${rec}\n`;
        });
        message += `\n`;
    }

    message += `This is not a diagnosis. Please consult a doctor.\n\n`;
    message += `- Nivarna Health Team`;

    return message;
};

export const sendAlert = async (req, res) => {
    try {
        const { patientId, riskAssessmentId, method } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                error: 'Patient ID is required'
            });
        }

        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        if (!patient.phoneNumber) {
            return res.status(400).json({
                success: false,
                error: 'Patient phone number not available'
            });
        }

        let riskAssessment;
        if (riskAssessmentId) {
            riskAssessment = await RiskAssessment.findById(riskAssessmentId);
        } else {
            riskAssessment = await RiskAssessment.findOne({ patientId })
                .sort({ createdAt: -1 });
        }

        if (!riskAssessment) {
            return res.status(404).json({
                success: false,
                error: 'No risk assessment found for patient'
            });
        }

        const message = createAlertMessage(patient, riskAssessment);

        const alertMethod = method || 'sms';
        const results = [];

        try {
            if (alertMethod === 'sms' || alertMethod === 'both') {
                try {
                    const smsResult = await twilioClient.messages.create({
                        body: message,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: patient.phoneNumber
                    });
                    results.push({ type: 'sms', success: true, sid: smsResult.sid });
                } catch (e) {
                    results.push({ type: 'sms', success: false, error: e.message });
                }
            }

            if (alertMethod === 'whatsapp' || alertMethod === 'both') {
                try {
                    const whatsappResult = await twilioClient.messages.create({
                        body: message,
                        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${patient.phoneNumber}`
                    });
                    results.push({ type: 'whatsapp', success: true, sid: whatsappResult.sid });
                } catch (e) {
                    results.push({ type: 'whatsapp', success: false, error: e.message });
                }
            }

            riskAssessment.alertSent = true;
            riskAssessment.alertSentAt = new Date();
            riskAssessment.alertMethod = alertMethod;
            await riskAssessment.save();

            res.json({
                success: true,
                message: 'Alert sent successfully',
                results
            });

        } catch (error) {
            console.error('Unexpected Alert Error:', error);
            res.status(500).json({ success: false, error: error.message });
        }

    } catch (error) {
        console.error('Send Alert Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send alert',
            details: error.message
        });
    }
};

export const sendBulkAlerts = async (req, res) => {
    try {
        const { patientIds, method } = req.body;

        if (!patientIds || !Array.isArray(patientIds)) {
            return res.status(400).json({
                success: false,
                error: 'Patient IDs array is required'
            });
        }

        const results = [];

        for (const patientId of patientIds) {
            try {
                const patient = await Patient.findById(patientId);

                if (!patient || !patient.phoneNumber) {
                    results.push({
                        patientId,
                        success: false,
                        error: 'Patient not found or no phone number'
                    });
                    continue;
                }

                const riskAssessment = await RiskAssessment.findOne({ patientId })
                    .sort({ createdAt: -1 });

                if (!riskAssessment) {
                    results.push({
                        patientId,
                        success: false,
                        error: 'No risk assessment found'
                    });
                    continue;
                }

                const message = createAlertMessage(patient, riskAssessment);

                await twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: patient.phoneNumber
                });

                riskAssessment.alertSent = true;
                riskAssessment.alertSentAt = new Date();
                riskAssessment.alertMethod = method || 'sms';
                await riskAssessment.save();

                results.push({
                    patientId,
                    success: true,
                    patientName: patient.name
                });

            } catch (error) {
                results.push({
                    patientId,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;

        res.json({
            success: true,
            message: `Sent ${successCount} out of ${patientIds.length} alerts`,
            results
        });

    } catch (error) {
        console.error('Bulk Alert Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send bulk alerts',
            details: error.message
        });
    }
};

export const getAlertHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        const alerts = await RiskAssessment.find({
            patientId,
            alertSent: true
        })
            .sort({ alertSentAt: -1 })
            .select('riskLevel reasons alertSentAt alertMethod')
            .lean();

        res.json({
            success: true,
            count: alerts.length,
            alerts
        });

    } catch (error) {
        console.error('Get Alert History Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch alert history',
            details: error.message
        });
    }
};
