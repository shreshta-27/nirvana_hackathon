import express from 'express';
import { addVisit, getVisitHistory, syncBatchVisits } from '../Controllers/visitController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/add', authenticate, authorize('worker', 'doctor'), addVisit);
router.get('/:patientId', authenticate, getVisitHistory);
router.post('/sync/batch', authenticate, authorize('worker'), syncBatchVisits);

export default router;
