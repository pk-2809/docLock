import { Response } from 'express';
import { db } from '../config/firebase';
import { AuthRequest } from '../middleware/auth';
import { z, ZodError } from 'zod';
import { NotificationService } from '../services/notification.service';
import { FirebaseService } from '../services/firebase.service';
import * as admin from 'firebase-admin';

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

        const targetUserDoc = await db.collection('users').doc(targetUserId).get();
        if (!targetUserDoc.exists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const targetUserData = targetUserDoc.data();
        const batch = db.batch();

        const senderRef = db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId);
        batch.set(senderRef, {
            uid: targetUserId,
            name: targetUserData?.name || 'Unknown',
            profileImage: targetUserData?.profileImage || null,
            addedAt: new Date().toISOString()
        });

        const senderDoc = await db.collection('users').doc(currentUserId).get();
        const senderData = senderDoc.data();

        const receiverRef = db.collection('users').doc(targetUserId).collection('friends').doc(currentUserId);
        batch.set(receiverRef, {
            uid: currentUserId,
            name: senderData?.name || 'Unknown',
            profileImage: senderData?.profileImage || null,
            addedAt: new Date().toISOString()
        });

        await batch.commit();

        await NotificationService.createNotification(targetUserId, {
            title: 'New Connection',
            message: `${senderData?.name || 'Someone'} added you to their secure circle.`,
            icon: 'user'
        });

        await NotificationService.createNotification(currentUserId, {
            title: 'Friend Added',
            message: `You have successfully added ${targetUserData?.name || 'User'} to your secure circle.`,
            icon: 'check-circle'
        });

        res.status(200).json({ message: 'Friend added successfully (Mutual)' });
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('Add Friend Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};


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
        const friends = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        const [currentUserDoc, friendUserDoc] = await Promise.all([
            db.collection('users').doc(currentUserId).get(),
            db.collection('users').doc(friendId).get()
        ]);

        const currentUserName = currentUserDoc.data()?.name || 'Someone';
        const friendName = friendUserDoc.data()?.name || 'User';

        const batch = db.batch();

        const currentUserRef = db.collection('users').doc(currentUserId).collection('friends').doc(friendId);
        batch.delete(currentUserRef);

        const friendUserRef = db.collection('users').doc(friendId).collection('friends').doc(currentUserId);
        batch.delete(friendUserRef);

        await batch.commit();

        await NotificationService.createNotification(currentUserId, {
            title: 'Connection Severed',
            message: `You have removed ${friendName} from your secure circle.`,
            icon: 'trash'
        });

        await NotificationService.createNotification(friendId, {
            title: 'Connection Lost',
            message: `${currentUserName} has removed you from their friend list.`,
            icon: 'trash'
        });

        res.status(200).json({ message: 'Friend removed successfully' });
    } catch (error) {
        console.error('Delete Friend Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const shareItemSchema = z.object({
    recipientUid: z.string().min(1),
    itemId: z.string().min(1),
    type: z.enum(['document', 'card']),
    requestId: z.string().optional()
});

export const shareItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { recipientUid, itemId, type, requestId } = shareItemSchema.parse(req.body);
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const friendRef = db.collection('users').doc(currentUserId).collection('friends').doc(recipientUid);
        const friendCheck = await friendRef.get();
        if (!friendCheck.exists) {
            res.status(403).json({ error: 'You can only share with friends' });
            return;
        }

        const itemName = await FirebaseService.shareItem(currentUserId, recipientUid, itemId, type);

        const senderDoc = await db.collection('users').doc(currentUserId).get();
        const senderName = senderDoc.data()?.name || 'A friend';

        await NotificationService.createNotification(recipientUid, {
            title: 'New Shared Item',
            message: `${senderName} shared "${itemName}" (${type}) with you. Check your Shared folder.`,
            icon: 'share'
        });

        await NotificationService.createNotification(currentUserId, {
            title: 'Item Shared',
            message: `You successfully shared "${itemName}" with ${friendCheck.data()?.name || 'friend'}.`,
            icon: 'check-circle'
        });

        if (requestId) {
            const notificationRef = db.collection('users').doc(currentUserId).collection('notifications').doc(requestId);
            await notificationRef.update({
                'metadata.status': 'fulfilled',
                read: true,
                icon: 'check-circle'
            }).catch(err => console.warn('Failed to update notification status:', err));

            const requesterFriendRef = db.collection('users').doc(recipientUid).collection('friends').doc(currentUserId);
            await requesterFriendRef.update({
                activeRequests: admin.firestore.FieldValue.increment(-1)
            }).catch(err => console.warn('Failed to decrement active requests:', err));
        }

        res.status(200).json({ message: 'Item shared successfully' });

    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('Share Item Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
const requestItemSchema = z.object({
    recipientUid: z.string().min(1),
    itemType: z.enum(['document', 'card']),
    itemName: z.string().min(1)
});

export const requestItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { recipientUid, itemType, itemName } = requestItemSchema.parse(req.body);
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const friendCheck = await db.collection('users').doc(currentUserId).collection('friends').doc(recipientUid).get();
        if (!friendCheck.exists) {
            res.status(403).json({ error: 'You can only request items from friends' });
            return;
        }

        const requesterDoc = await db.collection('users').doc(currentUserId).get();
        const requesterName = requesterDoc.data()?.name || 'A friend';

        await NotificationService.createNotification(recipientUid, {
            title: 'New Request',
            message: `${requesterName} is requesting "${itemName}" (${itemType}). Tap to respond.`,
            icon: 'bell',
            metadata: {
                type: 'request',
                requesterId: currentUserId,
                requesterName: requesterName,
                itemType: itemType,
                itemName: itemName,
                status: 'pending'
            }
        });

        await NotificationService.createNotification(currentUserId, {
            title: 'Request Sent',
            message: `You requested "${itemName}" (${itemType}) from ${friendCheck.data()?.name || 'friend'}.`,
            icon: 'check-circle'
        });

        // Increment Active Requests count for the recipient (seeing the requester)
        const recipientFriendRef = db.collection('users').doc(recipientUid).collection('friends').doc(currentUserId);
        await recipientFriendRef.update({
            activeRequests: admin.firestore.FieldValue.increment(1)
        }).catch(err => console.warn('Failed to update active requests count:', err));

        res.status(200).json({ message: 'Request sent successfully' });

    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: (error as any).errors });
        } else {
            console.error('Request Item Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
