import { db } from '../config/firebase';

export interface NotificationPayload {
    title: string;
    message: string;
    icon: 'lock' | 'user' | 'bell' | 'trash' | 'check' | 'check-circle' | 'share'; // restricted icon set for UI mapping
    metadata?: any; // For actionable notifications (e.g., links, dynamic actions)
}

export class NotificationService {
    private static COLLECTION = 'users'; // parent collection
    private static SUB_COLLECTION = 'notifications';

    /**
     * Creates a new notification for a specific user.
     */
    static async createNotification(uid: string, payload: NotificationPayload): Promise<void> {
        try {
            const notificationRef = db.collection(this.COLLECTION).doc(uid).collection(this.SUB_COLLECTION).doc();

            console.log(`[NotificationService] Creating doc in users/${uid}/notifications...`);
            await notificationRef.set({
                id: notificationRef.id,
                title: payload.title,
                message: payload.message,
                icon: payload.icon,
                metadata: payload.metadata || null,
                read: false,

                createdAt: new Date().toISOString(),
                // Timestamp for sorting
                timestamp: Date.now()
            });

            console.log(`[Notification] Created successfully for user ${uid}. Doc ID: ${notificationRef.id}`);
        } catch (error) {
            console.error(`[Notification] Failed to create for user ${uid}:`, error);
            // We usually don't throw here to avoid blocking the main action (like profile update)
            // just log the error.
        }
    }

    /**
     * Fetches all notifications for a user, sorted by newest first.
     */
    static async getNotifications(uid: string) {
        try {
            const snapshot = await db.collection(this.COLLECTION).doc(uid)
                .collection(this.SUB_COLLECTION)
                .orderBy('timestamp', 'desc')
                .get();

            return snapshot.docs.map(doc => doc.data());
        } catch (error) {
            console.error('[Notification] Failed to fetch:', error);
            throw error;
        }
    }

    /**
     * Marks all notifications as read for a user.
     */
    static async markAllAsRead(uid: string) {
        try {
            const batch = db.batch();
            const snapshot = await db.collection(this.COLLECTION).doc(uid)
                .collection(this.SUB_COLLECTION)
                .where('read', '==', false)
                .get();

            if (snapshot.empty) return;

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });

            await batch.commit();
        } catch (error) {
            console.error('[Notification] Failed to mark read:', error);
            throw error;
        }
    }

    /**
     * Deletes all notifications for a user.
     */
    static async clearAll(uid: string) {
        try {
            // Firestore doesn't support deleting a whole collection directly in client SDKs usually,
            // but we can batch delete.
            const snapshot = await db.collection(this.COLLECTION).doc(uid)
                .collection(this.SUB_COLLECTION)
                .get();

            if (snapshot.empty) return;

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (error) {
            console.error('[Notification] Failed to clear all:', error);
            throw error;
        }
    }
}
