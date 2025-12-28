import { Router } from 'express';
import { addFriend, getFriends, deleteFriend, getPublicProfile, shareItem, requestItem } from '../controllers/people.controller';
import { authenticate } from '../middleware/auth'; // Assuming authenticate middleware exists

const router = Router();
// Protect all routes
router.use(authenticate);

console.log('Mounting routes...');
router.get('/user/:userId', getPublicProfile);
router.get('/', getFriends);
router.post('/add', addFriend);
router.delete('/:friendId', deleteFriend);
router.post('/share', shareItem);
router.post('/request', requestItem);
// no default export here, it is at the end
export default router;
