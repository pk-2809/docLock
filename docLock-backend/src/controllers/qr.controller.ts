import { Request, Response } from 'express';
import { QrService } from '../services/qr.service';
import { StorageService } from '../services/storage.service';
import jwt from 'jsonwebtoken';

// Temporary Secret for Public Sessions
const PUBLIC_JWT_SECRET = process.env.JWT_SECRET || '';
if (!PUBLIC_JWT_SECRET) console.error('CRITICAL: JWT_SECRET is not defined in environment variables.');

export const QrController = {

    // Protected: Create
    create: async (req: Request, res: Response) => {
        try {
            const uid = (req as any).user.uid;
            const result = await QrService.createQR(uid, req.body);
            res.status(201).json({ status: 'success', qr: result });
            return;
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
            return;
        }
    },

    // Protected: Update
    update: async (req: Request, res: Response) => {
        try {
            const uid = (req as any).user.uid;
            const { id } = req.params;
            const result = await QrService.updateQR(uid, id, req.body);
            res.json({ status: 'success', qr: result });
            return;
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
            return;
        }
    },

    // Protected: List
    list: async (req: Request, res: Response) => {
        try {
            const uid = (req as any).user.uid;
            const list = await QrService.getUserQRs(uid);
            res.json({ status: 'success', qrs: list });
            return;
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
            return;
        }
    },

    // Protected: Delete
    delete: async (req: Request, res: Response) => {
        try {
            const uid = (req as any).user.uid;
            const { id } = req.params;
            await QrService.deleteQR(uid, id);
            res.json({ status: 'success', message: 'Deleted' });
            return;
        } catch (error: any) {
            res.status(error.statusCode || 500).json({ error: error.message });
            return;
        }
    },

    // PUBLIC: Verify MPIN -> Get Token
    verifyMpin: async (req: Request, res: Response) => {
        try {
            const { qrId, mpin } = req.body;
            const qrData: any = await QrService.verifyAccess(qrId, mpin);

            const token = jwt.sign(
                { qrId: qrData.id, uid: qrData.uid, role: 'public_qr' },
                PUBLIC_JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({ status: 'success', token });
            return;
        } catch (error: any) {
            res.status(403).json({ error: error.message || 'Access Denied' });
            return;
        }
    },

    // PUBLIC: Get Docs Metadata
    getPublicDocuments: async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing token' });
                return;
            }
            const token = authHeader.split(' ')[1];

            const decoded: any = jwt.verify(token, PUBLIC_JWT_SECRET);
            if (!decoded || decoded.role !== 'public_qr') {
                res.status(403).json({ error: 'Invalid token' });
                return;
            }

            const qrData = await QrService.getQRById(decoded.qrId);
            if (!qrData) {
                res.status(404).json({ error: 'QR invalid' });
                return;
            }

            const docs = await QrService.getPublicDocuments(qrData);

            res.json({ status: 'success', documents: docs });
            return;
        } catch (error: any) {
            res.status(403).json({ error: 'Invalid or expired session' });
            return;
        }
    },

    // PUBLIC: Get Document Content
    getPublicDocumentContent: async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing token' });
                return;
            }
            const token = authHeader.split(' ')[1];
            const { docId } = req.params;

            const decoded: any = jwt.verify(token, PUBLIC_JWT_SECRET);
            if (!decoded || decoded.role !== 'public_qr') {
                res.status(403).json({ error: 'Invalid token' });
                return;
            }

            const qrData = await QrService.getQRById(decoded.qrId);
            if (!qrData) {
                res.status(404).json({ error: 'QR invalid' });
                return;
            }

            const doc: any = await QrService.getLinkedDocument(qrData, docId);

            res.json({ status: 'success', document: doc });
            return;
        } catch (error: any) {
            res.status(403).json({ error: error.message || 'Access Denied' });
            return;
        }
    },

    // PUBLIC: Get Signed URL (Proxy Replacement)
    proxyDocumentContent: async (req: Request, res: Response) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Missing token' });
                return;
            }
            const token = authHeader.split(' ')[1];
            const { docId } = req.params;

            const decoded: any = jwt.verify(token, PUBLIC_JWT_SECRET);
            if (!decoded || decoded.role !== 'public_qr') {
                res.status(403).json({ error: 'Invalid token' });
                return;
            }

            const qrData = await QrService.getQRById(decoded.qrId);
            if (!qrData) {
                res.status(404).json({ error: 'QR invalid' });
                return;
            }

            const doc: any = await QrService.getLinkedDocument(qrData, docId);

            if (!doc || !doc.storagePath) {
                res.status(404).json({ error: 'Document file not found.' });
                return;
            }

            // Generate Signed URL - Valid for short time (e.g. 1 hour or less for safety)
            const signedUrl = await StorageService.getSignedUrl(doc.storagePath, 60);

            res.json({ status: 'success', downloadUrl: signedUrl });
            return;

        } catch (error: any) {
            console.error('Proxy/Sign Error:', error);
            res.status(500).json({ error: 'Failed to access document.' });
            return;
        }
    }
};
