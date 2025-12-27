import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let isFirebaseInitialized = false;

try {
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    const serviceAccountBase64 = process.env.SERVICE_ACCOUNT_JSON;

    let serviceAccount;

    if (serviceAccountBase64) {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));
    } else if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
    } else {
        throw new Error('Service account key not found');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: serviceAccount.project_id
    });

    db = admin.firestore();

    auth = admin.auth();

    isFirebaseInitialized = true;
} catch (error) {
    console.warn('Firebase initialization failed - using mock mode');
    isFirebaseInitialized = false;
}

export { admin, db, auth, isFirebaseInitialized };
