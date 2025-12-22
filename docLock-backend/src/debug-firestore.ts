// @ts-nocheck
import * as admin from 'firebase-admin';
import path from 'path';

try {
    const serviceAccount = require(path.join(process.cwd(), 'serviceAccountKey.json'));
    console.log('Credentials loaded for project:', serviceAccount.project_id);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const run = async () => {
        console.log('--- Testing Default Database ---');
        try {
            const db = admin.firestore(); // Default
            const cols = await db.listCollections();
            console.log('✅ Default Database Connected. Collections:', cols.map(c => c.id));
        } catch (e: any) {
            console.error('❌ Default Database Failed:', e.message);
        }

        console.log('\n--- Testing Named Database "doclock" ---');
        try {
            const { getFirestore } = require('firebase-admin/firestore');
            const db = getFirestore('doclock');
            const cols = await db.listCollections();
            console.log('✅ Named Database "doclock" Connected. Collections:', cols.map(c => c.id));
        } catch (e: any) {
            console.error('❌ Named Database "doclock" Failed:', e.message);
        }
    };

    run();

} catch (e) {
    console.error('Failed to load service account:', e);
}
