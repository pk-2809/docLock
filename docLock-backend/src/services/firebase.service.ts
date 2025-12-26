import * as admin from 'firebase-admin';
import { auth, db, isFirebaseInitialized } from '../config/firebase';
import { CustomError } from '../middleware/errorHandler';

interface UserData {
    name: string;
    mobile: string;
    role: string;
    createdAt?: string;
}

export class FirebaseService {
    /**
     * Verifies the Firebase ID Token sent from the client.
     */
    static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | { uid: string; phone_number: string } | null> {
        if (!isFirebaseInitialized) {
            // MOCK MODE: Accept any non-empty token
            console.log('[Mock] Verifying ID Token');
            return idToken ? { uid: 'mock-user-123', phone_number: '1234567890' } : null;
        }

        console.log('🔐 Verifying ID Token:', idToken ? idToken.substring(0, 15) + '...' : 'NULL');

        try {
            const decodedToken = await auth.verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            console.error('❌ Error verifying ID token:', error);
            if (error && typeof error === 'object' && 'code' in error) {
                console.error('   Code:', (error as any).code);
                console.error('   Message:', (error as any).message);
            }
            return null;
        }
    }

    /**
     * Creates a Session Cookie from the ID Token.
     */
    static async createSessionCookie(idToken: string, expiresIn = 60 * 60 * 24 * 5 * 1000) { // 5 days
        if (!isFirebaseInitialized) {
            // MOCK MODE
            console.log('[Mock] Creating Session Cookie');
            return 'mock-session-cookie-xyz-123';
        }

        try {
            const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
            return sessionCookie;
        } catch (error) {
            console.error('Error creating session cookie:', error);
            throw error;
        }
    }

    /**
     * Verifies the Session Cookie.
     */
    static async verifySessionCookie(sessionCookie: string): Promise<admin.auth.DecodedIdToken | { uid: string } | null> {
        if (!isFirebaseInitialized) {
            if (sessionCookie === 'mock-session-cookie-xyz-123') {
                return { uid: 'mock-user-123' };
            }
            return null;
        }

        try {
            const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
            return decodedClaims;
        } catch (error) {
            console.error('Error verifying session cookie:', error);
            return null;
        }
    }

    /**
     * Checks if a user exists in Firestore by mobile number.
     */
    static async userExistsByMobile(mobile: string): Promise<boolean> {
        if (!isFirebaseInitialized) {
            // MOCK MODE: Simulate user exists if mobile is '9999999999', else false (for signup testing)
            console.log('[Mock] Checking User Exists');
            return mobile === '9999999999';
        }

        try {
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('mobile', '==', mobile).limit(1).get();
            return !snapshot.empty;
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };

            // Handle Firestore NOT_FOUND - service account may need a moment to sync permissions
            if (firestoreError.code === 5) {
                console.error('⚠️  Firestore access issue - service account permissions may be syncing');
                console.error('   If this persists, re-download serviceAccountKey.json from Firebase Console');
                return false;
            }

            console.error('Error checking user:', error);
            return false;
        }
    }

    /**
     * Creates a new user document in Firestore.
     */
    static async createUser(uid: string, data: UserData): Promise<void> {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Creating User', { uid, data });
            return;
        }

        try {
            await db.collection('users').doc(uid).set({
                ...data,
                createdAt: new Date().toISOString()
            });
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };

            // Handle Firestore NOT_FOUND - usually permissions or service account sync issue
            if (firestoreError.code === 5) {
                console.error('⚠️  Firestore access denied (Code 5)');
                console.error('   Try: Re-download serviceAccountKey.json from Firebase Console');
                throw new CustomError('Firestore access error. Re-download service account key.', 503);
            }

            console.error('Error creating user:', error);
            throw new CustomError('Failed to create user', 500);
        }
    }

    /**
     * Gets user data by UID.
     */
    static async getUser(uid: string): Promise<UserData | null> {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Getting User', uid);
            return { name: 'Mock User', mobile: '9999999999', role: 'user' };
        }

        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                return doc.data() as UserData;
            }
            return null;
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };

            // Handle Firestore NOT_FOUND error (database doesn't exist)
            if (firestoreError.code === 5 || (firestoreError.message && firestoreError.message.includes('NOT_FOUND'))) {
                console.error('❌ Firestore Database NOT_FOUND Error when getting user');
                return null;
            }

            console.error('Error getting user:', error);
            return null;
        }
    }
    /**
     * Updates user data in Firestore.
     */
    static async updateUser(uid: string, data: Partial<UserData> & { mpin?: string }): Promise<void> {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Updating User', { uid, data });
            return;
        }

        try {
            await db.collection('users').doc(uid).update({
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating user:', error);
            throw new CustomError('Failed to update user profile', 500);
        }
    }
}
