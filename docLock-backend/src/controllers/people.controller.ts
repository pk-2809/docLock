import { Response } from 'express';
import { db } from '../config/firebase'; // Assuming db is exported from here
import { AuthRequest } from '../middleware/auth'; // Assuming AuthRequest exists
import { z, ZodError } from 'zod';
import { NotificationService } from '../services/notification.service';

const addFriendSchema = z.object({
    targetUserId: z.string().min(1)
});

export const addFriend = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { targetUserId } = addFriendSchema.parse(req.body);
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (currentUserId === targetUserId) {
            res.status(400).json({ error: 'Cannot add yourself as a friend' });
            return;
        }

        // 1. Verify Target User Exists
        const targetUserDoc = await db.collection('users').doc(targetUserId).get();
        console.log(targetUserDoc);
        if (!targetUserDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const targetUserData = targetUserDoc.data();

        // 2. Add to Friends Collection (Subcollection of User)
        // Storing basics: uid, name, profileImage, email/mobile if available
        await db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId).set({
            uid: targetUserId,
            name: targetUserData?.name || 'Unknown',
            profileImage: targetUserData?.profileImage || null,
            addedAt: new Date().toISOString()
        });

        // Trigger Notification
        await NotificationService.createNotification(currentUserId, {
            title: 'New Connection',
            message: `You added ${targetUserData?.name || 'a new friend'} to your network.`,
            icon: 'user'
        });

        // Optional: Add reverse friendship? Usually "Add Friend" is mutual or request-based.
        // For simplicity based on prompt "add it to a friends list", we'll treat it as following/direct add.

        res.status(200).json({ message: 'Friend added successfully' });

    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('Add Friend Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}


export const getPublicProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (currentUserId === userId) {
            res.status(400).json({ error: 'You cannot add yourself!' });
            return;
        }

        const userDoc = await db.collection('users').doc(userId).get();
        console.log(userDoc);
        if (!userDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const userData = userDoc.data();

        res.status(200).json({
            uid: userId,
            name: userData?.name || 'Unknown User',
            profileImage: userData?.profileImage || null
        });

    } catch (error) {
        console.error('Get Public Profile Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getFriends = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const currentUserId = req.user?.uid;
        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const friendsSnapshot = await db.collection('users').doc(currentUserId).collection('friends').get();
        const friends = friendsSnapshot.docs.map(doc => doc.data());

        res.status(200).json({ friends });
    } catch (error) {
        console.error('Get Friends Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteFriend = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { friendId } = req.params;
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        await db.collection('users').doc(currentUserId).collection('friends').doc(friendId).delete();

        // Trigger Notification
        await NotificationService.createNotification(currentUserId, {
            title: 'Connection Removed',
            message: 'You have removed a friend from your network.',
            icon: 'trash'
        });

        res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Delete Friend Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
