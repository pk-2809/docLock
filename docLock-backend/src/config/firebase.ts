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

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            projectId: serviceAccount.project_id,
            storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
        });
    } else if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            projectId: serviceAccount.project_id,
            storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
        });
    } else {
        console.log('No service account found, attempting to use Application Default Credentials...');
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID || 'doclock-96a20',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'doclock-96a20.firebasestorage.app'
        });
    }

    db = admin.firestore();
    auth = admin.auth();
    isFirebaseInitialized = true;
} catch (error) {
    console.error('Firebase initialization failed:', error);
    isFirebaseInitialized = false;
}

export { admin, db, auth, isFirebaseInitialized };
