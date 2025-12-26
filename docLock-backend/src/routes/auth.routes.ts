import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateMobile, validateSignup, validateIdToken } from '../middleware/validator';

const router = Router();

router.post('/check-user', validateMobile, AuthController.checkUser);
router.post('/login-verify', validateIdToken, AuthController.verifyLogin);
router.post('/signup', validateSignup, AuthController.signup);
router.post('/logout', AuthController.logout);
router.post('/update-profile', AuthController.updateProfile);
router.get('/session', AuthController.checkSession);

export default router;
