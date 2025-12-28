import { Router } from 'express';
import { getGlobalConfig } from '../controllers/config.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public or Authenticated? 
// User said "come on login or signup successful via an api called in sync".
// This implies the USER calling it. Authenticate is safer.
router.get('/', authenticate, getGlobalConfig);

export default router;
