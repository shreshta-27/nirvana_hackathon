import express from 'express';
import { getDiseaseStatsData } from '../Controllers/chartController.js';
import { authenticate, authorize } from '../Middlewares/authMiddleware.js';
import { cacheMiddleware } from '../Middlewares/cacheMiddleware.js';

const router = express.Router();

router.get('/disease-stats', authenticate, authorize('doctor'), cacheMiddleware(300), getDiseaseStatsData);

export default router;
