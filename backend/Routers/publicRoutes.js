import express from 'express';
import { getPublicHealthCard } from '../Controllers/publicController.js';

const router = express.Router();

router.get('/health-card/:id', getPublicHealthCard);

export default router;
