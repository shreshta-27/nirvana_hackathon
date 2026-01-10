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

router.post('/register', authenticate, authorize('worker', 'doctor'), registerPatient);
router.get('/', authenticate, getAllPatients);
router.get('/:id', authenticate, getPatientById);
router.put('/:id', authenticate, authorize('worker', 'doctor'), updatePatient);
router.get('/:id/health-card', authenticate, getHealthCard);

export default router;
