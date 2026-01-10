import express from 'express';
import {
    sendPhoneOTP,
    sendEmailOTP,
    verifyPhoneOTP,
    verifyEmailOTP,
    logout,
    getCurrentUser
} from '../Controllers/authController.js';
import { authenticate } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send-phone-otp', sendPhoneOTP);
router.post('/verify-phone-otp', verifyPhoneOTP);

router.post('/send-email-otp', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);

// Common Routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
