import express from 'express';
import {
    getPatientsByRisk,
    getPatientDetailForDoctor,
    addDoctorNotes,
    markPatientReviewed,
    getDashboardStats,
    getDiseaseStats
} from '../Controllers/doctorController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';
import { cacheMiddleware } from '../Middlewares/cacheMiddleware.js';

const router = express.Router();

router.get('/patients', authenticate, authorize('doctor'), cacheMiddleware(180), getPatientsByRisk);
router.get('/patients/:id', authenticate, authorize('doctor'), cacheMiddleware(120), getPatientDetailForDoctor);
router.post('/notes', authenticate, authorize('doctor'), addDoctorNotes);
router.put('/review/:id', authenticate, authorize('doctor'), markPatientReviewed);
router.get('/stats', authenticate, authorize('doctor'), cacheMiddleware(300), getDashboardStats);
router.get('/disease-stats', authenticate, authorize('doctor'), cacheMiddleware(300), getDiseaseStats);

export default router;
