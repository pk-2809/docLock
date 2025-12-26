import { Router } from 'express';
import { addFriend, getFriends, deleteFriend } from '../controllers/people.controller';
import { authenticate } from '../middleware/auth'; // Assuming authenticate middleware exists

const router = Router();
console.log('People routes loaded');

// Protect all routes
router.use((req, _res, next) => {
    console.log(`[DEBUG] People Router Hit: ${req.method} ${req.path}`);
    next();
});
router.use(authenticate);

router.get('/', getFriends);
router.post('/add', addFriend);
router.delete('/:friendId', deleteFriend);

export default router;
