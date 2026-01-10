import express from 'express';
import { sendOTP, verifyOTP, logout, getCurrentUser } from '../Controllers/authController.js';
import { authenticate } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
