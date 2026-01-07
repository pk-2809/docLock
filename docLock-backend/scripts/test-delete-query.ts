
import * as admin from 'firebase-admin';
import * as path from 'path';

try {
    const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
    console.log('Loading service account from:', serviceAccountPath);

    if (admin.apps.length === 0) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase initialized successfully.');
    }
} catch (e) {
    console.error("Error initializing mock firebase:", e);
    process.exit(1);
}

const db = admin.firestore();

async function testQuery() {
    const uid = 'test-uid-for-index-check';
    console.log('Testing collectionGroup("friends") query...');
    try {
        const friendsSnapshot = await db.collectionGroup('friends').where('uid', '==', uid).get();
        console.log('Query success! Docs found:', friendsSnapshot.size);
    } catch (error: any) {
        console.error('Query failed!');
        console.log('---------------------------------------------------');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        // Print the full error to see if it has the link
        console.log('Full Error:', error);
        if (error.details) console.error('Details:', error.details);
        console.log('---------------------------------------------------');
    }
}

testQuery();
