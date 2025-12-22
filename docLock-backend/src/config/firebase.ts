import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let isFirebaseInitialized = false;

// Simple initialization - just like your previous project
// No console configuration needed - service account key handles everything
try {
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    const serviceAccountBase64 = process.env.SERVICE_ACCOUNT_JSON;

    let serviceAccount;

    if (serviceAccountBase64) {
        // For production/deployment (Railway, etc.)
        serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
    } else if (fs.existsSync(serviceAccountPath)) {
        // For local development - just use the file directly
        serviceAccount = require(serviceAccountPath);
    } else {
        throw new Error('Service account key not found');
    }

    // Initialize with service account - this should work immediately
    // No need for any Google Cloud Console configuration
    // Use project ID from service account (not hardcoded)
    // Initialize with service account
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.project_id
    });

    db = admin.firestore();

    auth = admin.auth();

    console.log('✅ Firebase Admin initialized');
    console.log(`📝 Project: ${serviceAccount.project_id}`);

    isFirebaseInitialized = true;
} catch (error) {
    console.warn('⚠️  Firebase initialization failed - using mock mode');
    console.warn('   Make sure serviceAccountKey.json exists in the backend root');
    isFirebaseInitialized = false;
}

export { admin, db, auth, isFirebaseInitialized };
