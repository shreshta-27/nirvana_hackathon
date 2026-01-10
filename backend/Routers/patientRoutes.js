import express from 'express';
import {
    registerPatient,
    getAllPatients,
    getPatientById,
    updatePatient,
    getHealthCard
} from '../Controllers/patientController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', authenticate, authorize('frontline_worker', 'doctor'), registerPatient);
router.get('/', authenticate, getAllPatients);
router.get('/:id', authenticate, getPatientById);
router.put('/:id', authenticate, authorize('frontline_worker', 'doctor'), updatePatient);
router.get('/:id/health-card', authenticate, getHealthCard);

export default router;
