import * as admin from 'firebase-admin';
import { auth, db, isFirebaseInitialized } from '../config/firebase';
import { StorageService } from './storage.service';
import { CustomError } from '../middleware/errorHandler';

interface UserData {
    name: string;
    mobile: string;
    role: string;
    createdAt?: string;
    storageUsed?: number;
    documentsCount?: number;
    profileImage?: string;
}

export class FirebaseService {
    static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | { uid: string; phone_number: string } | null> {
        if (!isFirebaseInitialized) {
            return idToken ? { uid: 'mock-user-123', phone_number: '1234567890' } : null;
        }

        try {
            return await auth.verifyIdToken(idToken);
        } catch (error) {
            console.error('Error verifying ID token:', error);
            return null;
        }
    }

    static async createSessionCookie(idToken: string, expiresIn = 60 * 60 * 24 * 5 * 1000) {
        if (!isFirebaseInitialized) return 'mock-session-cookie-xyz-123';

        try {
            return await auth.createSessionCookie(idToken, { expiresIn });
        } catch (error) {
            console.error('Error creating session cookie:', error);
            throw error;
        }
    }

    static async verifySessionCookie(sessionCookie: string): Promise<admin.auth.DecodedIdToken | { uid: string } | null> {
        if (!isFirebaseInitialized) {
            return sessionCookie === 'mock-session-cookie-xyz-123' ? { uid: 'mock-user-123' } : null;
        }

        try {
            return await auth.verifySessionCookie(sessionCookie, true);
        } catch (error) {
            console.error('Error verifying session cookie:', error);
            return null;
        }
    }

    static async userExistsByMobile(mobile: string): Promise<boolean> {
        if (!isFirebaseInitialized) return mobile === '9999999999';

        try {
            const snapshot = await db.collection('users').where('mobile', '==', mobile).limit(1).get();
            return !snapshot.empty;
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };
            if (firestoreError.code === 5) {
                console.error('Firestore access issue');
            }
            console.error('Error checking user:', error);
            return false;
        }
    }

    static async createUser(uid: string, data: UserData): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).set({
                ...data,
                storageUsed: 0,
                documentsCount: 0,
                createdAt: new Date().toISOString()
            });
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };
            if (firestoreError.code === 5) {
                throw new CustomError('Firestore access error', 503);
            }
            console.error('Error creating user:', error);
            throw new CustomError('Failed to create user', 500);
        }
    }

    static async getUser(uid: string): Promise<UserData | null> {
        if (!isFirebaseInitialized) {
            return { name: 'Mock User', mobile: '9999999999', role: 'user' };
        }

        try {
            const doc = await db.collection('users').doc(uid).get();
            return doc.exists ? doc.data() as UserData : null;
        } catch (error: unknown) {
            console.error('Error getting user:', error);
            return null;
        }
    }
    static async updateUser(uid: string, data: Partial<UserData> & { mpin?: string }): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).update({
                ...data,
                updatedAt: new Date().toISOString()
            });

            if (data.name || data.profileImage) {
                try {
                    const friendsSnapshot = await db.collectionGroup('friends').where('uid', '==', uid).get();
                    if (!friendsSnapshot.empty) {
                        const batch = db.batch();
                        const updates: any = {};
                        if (data.name) updates.name = data.name;
                        if (data.profileImage) updates.profileImage = data.profileImage;
                        friendsSnapshot.docs.forEach((doc) => batch.update(doc.ref, updates));
                        await batch.commit();
                    }
                } catch (propError) {
                    console.warn('Failed to propagate updates to friends list:', propError);
                }
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw new CustomError('Failed to update user profile', 500);
        }
    }




    static async addDocument(uid: string, docData: any): Promise<any> {
        if (!isFirebaseInitialized) {
            return { id: 'mock-doc-id-' + Date.now(), ...docData };
        }

        try {
            const docRef = await db.collection('users').doc(uid).collection('documents').add({
                ...docData,
                createdAt: new Date().toISOString()
            });

            await db.collection('users').doc(uid).update({
                documentsCount: admin.firestore.FieldValue.increment(1),
                storageUsed: admin.firestore.FieldValue.increment(docData.size || 0)
            });

            if (docData.folderId) {
                await this.updateFolderCounts(uid, docData.folderId, 1);
            }

            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error adding document:', error);
            throw new CustomError('Failed to save document metadata', 500);
        }
    }

    static async getDocuments(uid: string): Promise<any[]> {
        if (!isFirebaseInitialized) return [];

        try {
            const snapshot = await db.collection('users').doc(uid).collection('documents').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting documents:', error);
            return [];
        }
    }

    static async getDocument(uid: string, docId: string): Promise<any | null> {
        if (!isFirebaseInitialized) {
            return { id: docId, name: 'Mock Document', mimeType: 'application/pdf', size: 1024, createdAt: new Date().toISOString() };
        }

        try {
            const doc = await db.collection('users').doc(uid).collection('documents').doc(docId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error('Error getting document:', error);
            return null;
        }
    }

    static async deleteDocument(uid: string, docId: string, size: number = 0, folderId: string | null = null): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).collection('documents').doc(docId).delete();

            await db.collection('users').doc(uid).update({
                documentsCount: admin.firestore.FieldValue.increment(-1),
                storageUsed: admin.firestore.FieldValue.increment(-size)
            });

            if (folderId) {
                await this.updateFolderCounts(uid, folderId, -1);
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            throw new CustomError('Failed to delete document metadata', 500);
        }
    }

    static async createFolder(uid: string, folderData: any): Promise<any> {
        if (!isFirebaseInitialized) {
            return { id: 'mock-folder-id-' + Date.now(), ...folderData };
        }

        try {
            const folderRef = await db.collection('users').doc(uid).collection('folders').add({
                ...folderData,
                itemCount: 0,
                createdAt: new Date().toISOString()
            });

            if (folderData.parentId) {
                await this.updateFolderCounts(uid, folderData.parentId, 1);
            }

            return { id: folderRef.id, ...folderData };
        } catch (error) {
            console.error('Error creating folder:', error);
            throw new CustomError('Failed to create folder', 500);
        }
    }

    static async getFolders(uid: string): Promise<any[]> {
        if (!isFirebaseInitialized) return [];

        try {
            const snapshot = await db.collection('users').doc(uid).collection('folders').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting folders:', error);
            return [];
        }
    }

    static async updateFolder(uid: string, folderId: string, updates: any): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).collection('folders').doc(folderId).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating folder:', error);
            throw new CustomError('Failed to update folder', 500);
        }
    }

    static async getCards(uid: string): Promise<any[]> {
        if (!isFirebaseInitialized) return [];

        try {
            const snapshot = await db.collection('users').doc(uid).collection('cards').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error getting cards:', error);
            return [];
        }
    }

    static async addCard(uid: string, cardData: any): Promise<any> {
        if (!isFirebaseInitialized) {
            return { id: 'mock-card-id-' + Date.now(), ...cardData };
        }

        try {
            const docRef = await db.collection('users').doc(uid).collection('cards').add({
                ...cardData,
                createdAt: new Date().toISOString()
            });

            return { id: docRef.id, ...cardData };
        } catch (error) {
            console.error('Error adding card:', error);
            throw new CustomError('Failed to save card', 500);
        }
    }

    static async updateCard(uid: string, cardId: string, updates: any): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).collection('cards').doc(cardId).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating card:', error);
            throw new CustomError('Failed to update card', 500);
        }
    }

    static async deleteCard(uid: string, cardId: string): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            await db.collection('users').doc(uid).collection('cards').doc(cardId).delete();
        } catch (error) {
            console.error('Error deleting card:', error);
            throw new CustomError('Failed to delete card', 500);
        }
    }

    static async deleteFolder(uid: string, folderId: string): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            const docsSnapshot = await db.collection('users').doc(uid).collection('documents').where('folderId', '==', folderId).get();
            const batch = db.batch();
            const storageDeletePromises: Promise<void>[] = [];

            docsSnapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.storagePath) {
                    storageDeletePromises.push(StorageService.deleteFile(data.storagePath).catch(err => {
                        console.warn(`Failed to delete Storage file ${data.storagePath}:`, err);
                    }));
                }
                batch.delete(doc.ref);
            });

            const subFoldersSnapshot = await db.collection('users').doc(uid).collection('folders').where('parentId', '==', folderId).get();
            subFoldersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

            const folderRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
            const folderDoc = await folderRef.get();
            const folderData = folderDoc.data();
            batch.delete(folderRef);

            await Promise.allSettled(storageDeletePromises);
            await batch.commit();

            if (folderData && folderData.parentId) {
                await this.updateFolderCounts(uid, folderData.parentId, -1);
            }
        } catch (error) {
            console.error('Error deleting folder:', error);
            throw new CustomError('Failed to delete folder', 500);
        }
    }

    private static async updateFolderCounts(uid: string, folderId: string | undefined | null, change: number): Promise<void> {
        if (!folderId) return;

        try {
            const folderRef = db.collection('users').doc(uid).collection('folders').doc(folderId);
            const folderDoc = await folderRef.get();

            if (folderDoc.exists) {
                const folderData = folderDoc.data();
                await folderRef.update({
                    itemCount: admin.firestore.FieldValue.increment(change)
                });

                if (folderData && folderData.parentId) {
                    await this.updateFolderCounts(uid, folderData.parentId, change);
                }
            }
        } catch (error) {
            console.error(`Error updating folder count for ${folderId}:`, error);
        }
    }


    static async deleteUserAndData(uid: string): Promise<void> {
        if (!isFirebaseInitialized) return;

        try {
            console.log(`Starting account deletion for ${uid}`);

            // 1. Gather all documents to delete
            const documentsSnapshot = await db.collection('users').doc(uid).collection('documents').get();
            const foldersSnapshot = await db.collection('users').doc(uid).collection('folders').get();
            const cardsSnapshot = await db.collection('users').doc(uid).collection('cards').get();

            // Storage cleanup promises
            const storageDeletePromises: Promise<void>[] = [];

            // Collect all references to delete in Firestore
            const refsToDelete: admin.firestore.DocumentReference[] = [];

            // Documents
            documentsSnapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.storagePath) {
                    storageDeletePromises.push(StorageService.deleteFile(data.storagePath).catch(err => {
                        console.warn(`Failed to delete Storage file ${data.storagePath}:`, err);
                    }));
                }
                refsToDelete.push(doc.ref);
            });

            // Folders
            foldersSnapshot.docs.forEach((doc) => refsToDelete.push(doc.ref));

            // Cards (Added missing cleanup!)
            cardsSnapshot.docs.forEach((doc) => refsToDelete.push(doc.ref));

            // Profile Image
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData?.profileImage && userData.profileImage.startsWith('profile_images/')) {
                    storageDeletePromises.push(StorageService.deleteFile(userData.profileImage).catch(() => { }));
                }
                refsToDelete.push(userDoc.ref);
            }

            // Execute Storage Deletions (Wait for all, but don't blocking batch logic)
            // We await them at the end or let them run. Better to await to report full success.

            // 2. Friend Links & Notifications (Complex Queries)
            const friendsSnapshot = await db.collectionGroup('friends').where('uid', '==', uid).get();

            // We need to resolve these asynchronously before adding to refsToDelete
            for (const friendDoc of friendsSnapshot.docs) {
                refsToDelete.push(friendDoc.ref);

                const friendId = friendDoc.ref.parent.parent?.id;
                if (friendId) {
                    try {
                        const notificationsRef = db.collection('users').doc(friendId).collection('notifications');
                        const requestsQuery = await notificationsRef.where('metadata.requesterId', '==', uid).get();
                        requestsQuery.docs.forEach(notifDoc => refsToDelete.push(notifDoc.ref));
                    } catch (err) {
                        console.warn(`Failed to cleanup notifications for friend ${friendId}:`, err);
                    }
                }
            }

            // 3. Process Batch Deletions in Chunks (Max 400 to be safe)
            const CHUNK_SIZE = 400;
            for (let i = 0; i < refsToDelete.length; i += CHUNK_SIZE) {
                const chunk = refsToDelete.slice(i, i + CHUNK_SIZE);
                const batch = db.batch();
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
                console.log(`Deleted batch ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(refsToDelete.length / CHUNK_SIZE)}`);
            }

            // 4. Delete Auth User
            try {
                await admin.auth().deleteUser(uid);
            } catch (authErr: any) {
                // If user not found, that's fine (already deleted)
                if (authErr.code !== 'auth/user-not-found') {
                    console.error('Failed to delete user from Auth:', authErr);
                }
            }

            // Await storage deletions last
            await Promise.allSettled(storageDeletePromises);

            console.log(`Account deletion complete for ${uid}`);

        } catch (error) {
            console.error('Critical Error deleting user account:', error);
            throw new CustomError('Failed to delete account data', 500);
        }
    }


    static async shareItem(senderUid: string, recipientUid: string, itemId: string, type: 'document' | 'card'): Promise<string> {
        if (!isFirebaseInitialized) return 'Mock Item';

        try {
            const collectionName = type === 'document' ? 'documents' : 'cards';
            const itemRef = db.collection('users').doc(senderUid).collection(collectionName).doc(itemId);
            const itemDoc = await itemRef.get();

            if (!itemDoc.exists) {
                throw new CustomError('Item not found', 404);
            }

            const itemData = itemDoc.data();
            if (!itemData) throw new CustomError('Item data empty', 500);

            const itemName = itemData.name || 'Untitled Item';
            let targetFolderId: string | null = null;

            if (type === 'document') {
                const foldersRef = db.collection('users').doc(recipientUid).collection('folders');
                const sharedFolderQuery = await foldersRef.where('name', '==', 'Shared').limit(1).get();

                if (!sharedFolderQuery.empty) {
                    targetFolderId = sharedFolderQuery.docs[0].id;
                } else {
                    const newFolder = await this.createFolder(recipientUid, {
                        name: 'Shared',
                        parentId: null,
                        icon: 'users',
                        color: 'bg-purple-500'
                    });
                    targetFolderId = newFolder.id;
                }
            }

            const newItemData = { ...itemData };
            delete newItemData.id;

            if (type === 'document') {
                newItemData.folderId = targetFolderId;
                newItemData.sharedBy = senderUid;
                newItemData.sharedAt = new Date().toISOString();
                await db.collection('users').doc(recipientUid).collection('documents').add(newItemData);

                if (targetFolderId) {
                    await this.updateFolderCounts(recipientUid, targetFolderId, 1);
                }
            } else {
                newItemData.sharedBy = senderUid;
                newItemData.sharedAt = new Date().toISOString();
                await db.collection('users').doc(recipientUid).collection('cards').add(newItemData);
            }

            return itemName;
        } catch (error) {
            console.error('Error sharing item:', error);
            throw new CustomError('Failed to share item', 500);
        }
    }
}
