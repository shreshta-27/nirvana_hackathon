import express from 'express';
import { addVisit, getVisitHistory, syncBatchVisits } from '../Controllers/visitController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.post('/add', authenticate, authorize('frontline_worker', 'doctor'), addVisit);
router.get('/:patientId', authenticate, getVisitHistory);
router.post('/sync/batch', authenticate, authorize('frontline_worker'), syncBatchVisits);

export default router;
