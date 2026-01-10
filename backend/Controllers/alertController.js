import Patient from '../Models/patientSchema.js';
import RiskAssessment from '../Models/riskAssessmentSchema.js';
import { sendAlertEmail } from '../Config/emailService.js';

const createAlertMessage = (patient, riskAssessment) => {
    const riskEmoji = { high: '🔴', monitor: '🟡', normal: '🟢' };
    const emoji = riskEmoji[riskAssessment.riskLevel] || '⚠️';

    let message = `${emoji} Nivarna Health Alert\n\n`;
    message += `Dear ${patient.name},\n\n`;
    message += `Your recent health check shows ${riskAssessment.riskLevel.toUpperCase()} risk.\n\n`;

    if (riskAssessment.reasons && riskAssessment.reasons.length > 0) {
        message += `Reason:\n${riskAssessment.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    if (riskAssessment.recommendations && riskAssessment.recommendations.length > 0) {
        message += `Recommendations:\n${riskAssessment.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n`;
    }

    message += `This is not a diagnosis. Please consult a doctor.\n\n- Nivarna Health Team`;
    return message;
};

export const sendAlert = async (req, res) => {
    try {
        const { patientId, riskAssessmentId, email } = req.body;

        if (!patientId) return res.status(400).json({ success: false, error: 'Patient ID is required' });

        const patient = await Patient.findById(patientId);
        if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

        // Use provided email or patient's email (if we had it in schema, but we don't naturally store patient email usually. We will rely on req.body.email or fallback if needed)
        // For hackathon, assuming we send to the provided email in payload OR console log if none.
        // Actually, let's use the provided email in request or mock logs.
        const targetEmail = email || 'swanandi.y.rao@gmail.com'; // Fallback for demo as user requested "do with only nodemailer"

        let riskAssessment;
        if (riskAssessmentId) {
            riskAssessment = await RiskAssessment.findById(riskAssessmentId);
        } else {
            riskAssessment = await RiskAssessment.findOne({ patientId }).sort({ createdAt: -1 });
        }

        if (!riskAssessment) return res.status(404).json({ success: false, error: 'No risk assessment found' });

        const message = createAlertMessage(patient, riskAssessment);

        await sendAlertEmail(targetEmail, `Health Alert for ${patient.name}`, message);

        riskAssessment.alertSent = true;
        riskAssessment.alertSentAt = new Date();
        riskAssessment.alertMethod = 'email';
        await riskAssessment.save();

        res.json({ success: true, message: 'Alert sent successfully via Email' });

    } catch (error) {
        console.error('Send Alert Error:', error);
        res.status(500).json({ success: false, error: 'Failed to send alert', details: error.message });
    }
};

export const sendBulkAlerts = async (req, res) => {
    try {
        const { patientIds, email } = req.body; // Allow overriding email for testing? Or assume patient has email? 
        // Since patient schema doesn't have email usually, we will fallback to a default test email for now or log it.
        const defaultEmail = 'swanandi.y.rao@gmail.com';

        if (!patientIds || !Array.isArray(patientIds)) {
            return res.status(400).json({ success: false, error: 'Patient IDs array is required' });
        }

        const results = [];

        for (const patientId of patientIds) {
            try {
                const patient = await Patient.findById(patientId);
                if (!patient) {
                    results.push({ patientId, success: false, error: 'Patient not found' });
                    continue;
                }

                const riskAssessment = await RiskAssessment.findOne({ patientId }).sort({ createdAt: -1 });
                if (!riskAssessment) {
                    results.push({ patientId, success: false, error: 'No risk assessment found' });
                    continue;
                }

                const message = createAlertMessage(patient, riskAssessment);

                await sendAlertEmail(defaultEmail, `Bulk Alert: ${patient.name}`, message);

                riskAssessment.alertSent = true;
                riskAssessment.alertSentAt = new Date();
                riskAssessment.alertMethod = 'email';
                await riskAssessment.save();

                results.push({ patientId, success: true, patientName: patient.name });

            } catch (error) {
                results.push({ patientId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            message: `Sent ${successCount} out of ${patientIds.length} email alerts`,
            results
        });

    } catch (error) {
        console.error('Bulk Alert Error:', error);
        res.status(500).json({ success: false, error: 'Failed to send bulk alerts', details: error.message });
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
