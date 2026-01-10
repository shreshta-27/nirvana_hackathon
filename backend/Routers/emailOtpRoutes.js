import express from 'express';
import { sendEmailOTP, verifyEmailOTP, resendEmailOTP } from '../Controllers/emailOtpController.js';
import { applyRateLimit } from '../Middlewares/rateLimitMiddleware.js';

const router = express.Router();

router.post('/send-otp', applyRateLimit('emailOtp'), sendEmailOTP);
router.post('/verify-otp', applyRateLimit('emailOtp'), verifyEmailOTP);
router.post('/resend-otp', applyRateLimit('emailOtp'), resendEmailOTP);

export default router;
