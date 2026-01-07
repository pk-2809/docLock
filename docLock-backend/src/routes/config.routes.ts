import { Router } from 'express';
import { getGlobalConfig } from '../controllers/config.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public or Authenticated?
router.get('/', authenticate, getGlobalConfig);

export default router;
