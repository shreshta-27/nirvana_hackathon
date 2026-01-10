import express from 'express';
import {
    getPatientsByRisk,
    getPatientDetailForDoctor,
    addDoctorNotes,
    markPatientReviewed,
    getDashboardStats
} from '../Controllers/doctorController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.get('/patients', authenticate, authorize('doctor'), getPatientsByRisk);
router.get('/patients/:id', authenticate, authorize('doctor'), getPatientDetailForDoctor);
router.post('/notes', authenticate, authorize('doctor'), addDoctorNotes);
router.put('/review/:id', authenticate, authorize('doctor'), markPatientReviewed);
router.get('/stats', authenticate, authorize('doctor'), getDashboardStats);

export default router;
