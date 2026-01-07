import { db, isFirebaseInitialized } from '../config/firebase';
import { CustomError } from '../middleware/errorHandler';
import * as admin from 'firebase-admin';

export class QrService {

    static async createQR(uid: string, data: { name: string, mpin: string, linkedDocumentIds: string[] }) {
        if (!isFirebaseInitialized) {
            return { id: 'mock-qr-' + Date.now(), ...data };
        }

        try {
            const qrData = {
                uid,
                name: data.name,
                mpin: data.mpin,
                linkedDocumentIds: data.linkedDocumentIds,
                scanCount: 0,
                createdAt: new Date().toISOString()
            };

            const docRef = await db.collection('qrs').add(qrData);
            return { id: docRef.id, ...qrData };
        } catch (error) {
            console.error('Error creating QR:', error);
            throw new CustomError('Failed to create QR', 500);
        }
    }

    static async updateQR(uid: string, qrId: string, updates: { name?: string, linkedDocumentIds?: string[] }) {
        if (!isFirebaseInitialized) return;

        try {
            const docRef = db.collection('qrs').doc(qrId);
            const doc = await docRef.get();

            if (!doc.exists) {
                throw new CustomError('QR not found', 404);
            }

            if (doc.data()?.uid !== uid) {
                throw new CustomError('Permission denied', 403);
            }

            await docRef.update({
                ...updates,
                updatedAt: new Date().toISOString()
            });

            return { id: qrId, ...doc.data(), ...updates };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            console.error('Error updating QR:', error);
            throw new CustomError('Failed to update QR', 500);
        }
    }

    static async getUserQRs(uid: string) {
        if (!isFirebaseInitialized) return [];

        try {
            const snapshot = await db.collection('qrs').where('uid', '==', uid).orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching QRs:', error);
            return [];
        }
    }

    static async getQRById(qrId: string) {
        if (!isFirebaseInitialized) return null;
        try {
            const doc = await db.collection('qrs').doc(qrId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch { return null; }
    }

    static async verifyAccess(qrId: string, mpin: string) {
        if (!isFirebaseInitialized) {
            if (qrId.startsWith('mock-')) return { id: qrId, uid: 'mock-uid', name: 'Mock QR', linkedDocumentIds: [] };
        }

        try {
            const doc = await db.collection('qrs').doc(qrId).get();
            if (!doc.exists) {
                throw new CustomError('QR Code not found or expired', 404);
            }

            const data = doc.data();
            if (!data) throw new CustomError('Invalid QR Data', 500);

            if (data.mpin !== mpin) {
                throw new CustomError('Incorrect MPIN', 403);
            }

            db.collection('qrs').doc(qrId).update({
                scanCount: admin.firestore.FieldValue.increment(1)
            }).catch(err => console.error('Failed to update scan count', err));

            return { id: doc.id, ...data };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            console.error('Error verifying QR:', error);
            throw new CustomError('Verification failed', 500);
        }
    }

    static async getPublicDocuments(qrData: any) {
        const ownerUid = qrData.uid;
        const linkedIds = qrData.linkedDocumentIds as string[];

        if (!linkedIds || linkedIds.length === 0) return [];

        try {
            const docPromises = linkedIds.map(docId =>
                db.collection('users').doc(ownerUid).collection('documents').doc(docId).get()
            );

            const snapshots = await Promise.all(docPromises);
            return snapshots.map(snap => snap.exists ? { id: snap.id, ...snap.data() } : null).filter(d => d !== null);
        } catch (error) {
            console.error('Error fetching public docs:', error);
            throw new CustomError('Failed to load documents', 500);
        }
    }

    static async deleteQR(uid: string, qrId: string) {
        try {
            const doc = await db.collection('qrs').doc(qrId).get();
            if (doc.exists && doc.data()?.uid === uid) {
                await doc.ref.delete();
            } else {
                throw new CustomError('QR not found or permission denied', 403);
            }
        } catch (error) {
            throw new CustomError('Delete failed', 500);
        }
    }

    static async getLinkedDocument(qrData: any, docId: string) {
        if (!qrData.linkedDocumentIds.includes(docId)) {
            throw new CustomError('Document not accessible via this QR', 403);
        }

        try {
            const docRef = db.collection('users').doc(qrData.uid).collection('documents').doc(docId);
            const doc = await docRef.get();
            if (!doc.exists) throw new CustomError('Document not found', 404);

            return { id: doc.id, ...doc.data() };
        } catch (error) {
            throw new CustomError('Failed to fetch document', 500);
        }
    }
}
