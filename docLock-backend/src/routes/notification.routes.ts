import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

// Protected Routes
// Use session check in controller or add authenticate middleware explicitly if needed later

router.get('/', NotificationController.getNotifications);
router.post('/clear', NotificationController.clearAll);
router.post('/mark-read', NotificationController.markAllAsRead);

export default router;
