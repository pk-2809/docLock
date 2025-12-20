import { auth, db, isFirebaseInitialized } from '../config/firebase';

export class FirebaseService {
    /**
     * Verifies the Firebase ID Token sent from the client.
     */
    static async verifyIdToken(idToken: string) {
        if (!isFirebaseInitialized) {
            // MOCK MODE: Accept any non-empty token
            console.log('[Mock] Verifying ID Token');
            return idToken ? { uid: 'mock-user-123', phone_number: '1234567890' } : null;
        }

        try {
            const decodedToken = await auth.verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            console.error('Error verifying ID token:', error);
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
    static async verifySessionCookie(sessionCookie: string) {
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
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    }

    /**
     * Creates a new user document in Firestore.
     */
    static async createUser(uid: string, data: any) {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Creating User', { uid, data });
            return true;
        }

        try {
            await db.collection('users').doc(uid).set({
                ...data,
                createdAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    /**
     * Gets user data by UID.
     */
    static async getUser(uid: string) {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Getting User', uid);
            return { name: 'Mock User', mobile: '9999999999', role: 'user' };
        }

        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) return doc.data();
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }
}
