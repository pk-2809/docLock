import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.post('/check-user', AuthController.checkUser);
router.post('/login-verify', AuthController.verifyLogin);
router.post('/signup', AuthController.signup);
router.post('/logout', AuthController.logout);
router.get('/session', AuthController.checkSession);

export default router;
