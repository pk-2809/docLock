import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;
let isFirebaseInitialized = false;

try {
    // SECURITY UPGRADE: Use Application Default Credentials (ADC)
    // This allows local dev via 'gcloud auth application-default login'
    // and production via Workload Identity (Cloud Run/GCE/GKE) without any JSON keys.

    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });

    db = admin.firestore();
    auth = admin.auth();
    console.log('Firebase Admin Initialized successfully (ADC Mode)');
    isFirebaseInitialized = true;
} catch (error) {
    console.warn('⚠️ FIREBASE WARNING: ADC Credentials missing. App will run in MOCK MODE.');
    console.warn('Run `gcloud auth application-default login` to enable Real Mode.');
    isFirebaseInitialized = false;
}

export { admin, db, auth, isFirebaseInitialized };
