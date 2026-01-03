import { Response } from 'express';
import { db } from '../config/firebase'; // Assuming db is exported from here
import { AuthRequest } from '../middleware/auth'; // Assuming AuthRequest exists
import { z, ZodError } from 'zod';
import { NotificationService } from '../services/notification.service';
import { FirebaseService } from '../services/firebase.service';

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

        // 2. Mutual Friendship (Batch Write)
        console.log(`[AddFriend] Initiating mutual add: ${currentUserId} <-> ${targetUserId}`);
        const batch = db.batch();

        // A -> B
        const senderRef = db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId);
        console.log(`[AddFriend] 1. Adding to Sender: users/${currentUserId}/friends/${targetUserId}`);
        batch.set(senderRef, {
            uid: targetUserId,
            name: targetUserData?.name || 'Unknown',
            profileImage: targetUserData?.profileImage || null,
            addedAt: new Date().toISOString()
        });

        // B -> A (Reverse)
        const senderDoc = await db.collection('users').doc(currentUserId).get(); // Get sender details first
        const senderData = senderDoc.data();

        const receiverRef = db.collection('users').doc(targetUserId).collection('friends').doc(currentUserId);
        console.log(`[AddFriend] 2. Adding to Receiver: users/${targetUserId}/friends/${currentUserId}`);
        batch.set(receiverRef, {
            uid: currentUserId,
            name: senderData?.name || 'Unknown',
            profileImage: senderData?.profileImage || null,
            addedAt: new Date().toISOString()
        });

        await batch.commit();
        console.log(`[AddFriend] Batch Committed.`);
        console.log(`[AddFriend] Mutual friendship executed successfully.`);

        // Trigger Notification to Target
        await NotificationService.createNotification(targetUserId, { // Fixed: Send to Target, not current
            title: 'New Connection',
            message: `${senderData?.name || 'Someone'} added you to their secure circle.`,
            icon: 'user'
        });

        // Notify Sender (User A)
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

        // Fetch details before deletion to get names
        const [currentUserDoc, friendUserDoc] = await Promise.all([
            db.collection('users').doc(currentUserId).get(),
            db.collection('users').doc(friendId).get()
        ]);

        const currentUserName = currentUserDoc.data()?.name || 'Someone';
        const friendName = friendUserDoc.data()?.name || 'User';

        const batch = db.batch();

        // 1. Remove from Current User's List
        const currentUserRef = db.collection('users').doc(currentUserId).collection('friends').doc(friendId);
        batch.delete(currentUserRef);

        // 2. Remove from Friend's List
        const friendUserRef = db.collection('users').doc(friendId).collection('friends').doc(currentUserId);
        batch.delete(friendUserRef);

        await batch.commit();

        // Notify Deleter (User A)
        await NotificationService.createNotification(currentUserId, {
            title: 'Connection Severed',
            message: `You have removed ${friendName} from your secure circle.`,
            icon: 'trash'
        });

        // Notify Deleted (User B)
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
    type: z.enum(['document', 'card'])
});



export const shareItem = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { recipientUid, itemId, type } = shareItemSchema.parse(req.body);
        const currentUserId = req.user?.uid;

        if (!currentUserId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Verify recipient exists first? (FirebaseService handles some checks, but good to check friendship?)
        // Assuming you can only share with friends.
        // Check friendship:
        const friendCheck = await db.collection('users').doc(currentUserId).collection('friends').doc(recipientUid).get();
        if (!friendCheck.exists) {
            res.status(403).json({ error: 'You can only share with friends' });
            return;
        }

        const itemName = await FirebaseService.shareItem(currentUserId, recipientUid, itemId, type);

        // Get Sender Name
        const senderDoc = await db.collection('users').doc(currentUserId).get();
        const senderName = senderDoc.data()?.name || 'A friend';

        // Notify Recipient
        await NotificationService.createNotification(recipientUid, {
            title: 'New Shared Item',
            message: `${senderName} shared "${itemName}" (${type}) with you. Check your Shared folder.`,
            icon: 'share'
        });

        // Notify Sender
        await NotificationService.createNotification(currentUserId, {
            title: 'Item Shared',
            message: `You successfully shared "${itemName}" with ${friendCheck.data()?.name || 'friend'}.`,
            icon: 'check-circle'
        });

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

        console.log(`[RequestItem] User ${currentUserId} requesting ${itemType} "${itemName}" from ${recipientUid}`);

        // Check friendship
        const friendCheck = await db.collection('users').doc(currentUserId).collection('friends').doc(recipientUid).get();
        if (!friendCheck.exists) {
            console.warn(`[RequestItem] Failed: Not friends (User: ${currentUserId}, Target: ${recipientUid})`);
            res.status(403).json({ error: 'You can only request items from friends' });
            return;
        }

        // Get Requester Name (for notification)
        const requesterDoc = await db.collection('users').doc(currentUserId).get();
        const requesterName = requesterDoc.data()?.name || 'A friend';

        console.log(`[RequestItem] Sending notification to ${recipientUid} from ${requesterName}`);

        // 1. Notify Recipient (Actionable)
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

        // 2. Notify Sender (Confirmation/Log)
        await NotificationService.createNotification(currentUserId, {
            title: 'Request Sent',
            message: `You requested "${itemName}" (${itemType}) from ${friendCheck.data()?.name || 'friend'}.`,
            icon: 'check-circle'
        });

        console.log(`[RequestItem] Notifications sent successfully`);
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
