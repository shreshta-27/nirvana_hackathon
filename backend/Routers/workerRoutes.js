import express from 'express';
import {
    getWorkerProfile,
    updateWorkerProfile,
    getAllWorkers,
    getWorkerById,
    getWorkerPatients,
    getWorkerDashboard
} from '../Controllers/workerController.js';
import { authenticate } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profile', authenticate, getWorkerProfile);
router.put('/profile', authenticate, updateWorkerProfile);
router.get('/dashboard', authenticate, getWorkerDashboard);
router.get('/patients', authenticate, getWorkerPatients);
router.get('/all', authenticate, getAllWorkers);
router.get('/:id', authenticate, getWorkerById);

export default router;
