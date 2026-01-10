import express from 'express';
import { sendAlert, sendBulkAlerts, getAlertHistory } from '../Controllers/alertController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticate, authorize('worker', 'doctor'), sendAlert);
router.post('/send-bulk', authenticate, authorize('doctor'), sendBulkAlerts);
router.get('/history/:patientId', authenticate, getAlertHistory);

export default router;
