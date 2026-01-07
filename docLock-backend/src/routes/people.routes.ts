import { Router } from 'express';
import { addFriend, getFriends, deleteFriend, getPublicProfile, shareItem, requestItem } from '../controllers/people.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
// Protect all routes
router.use(authenticate);


router.get('/user/:userId', getPublicProfile);
router.get('/', getFriends);
router.post('/add', addFriend);
router.delete('/:friendId', deleteFriend);
router.post('/share', shareItem);
router.post('/request', requestItem);

export default router;
