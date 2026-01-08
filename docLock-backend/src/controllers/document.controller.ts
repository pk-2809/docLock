import { Request, Response } from 'express';
import { FirebaseService } from '../services/firebase.service';
import { StorageService } from '../services/storage.service';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export class DocumentController {

    static uploadDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);
        const uid = decodedClaims.uid;

        const file = req.file;
        if (!file) throw new CustomError('No file provided', 400);

        try {
            // 1. Upload to Firebase Storage
            // Path: users/{uid}/{uuid}_{filename}
            const docId = uuidv4();
            const storagePath = `users/${uid}/${docId}_${file.originalname}`;

            await StorageService.uploadFile(
                file.buffer,
                storagePath,
                file.mimetype
            );

            // 2. Save Metadata to Firestore
            const docData = {
                name: req.body.name || file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                storagePath: storagePath,
                category: req.body.category || 'Uncategorized',
                folderId: req.body.folderId || null
            };

            const newDoc = await FirebaseService.addDocument(uid, docData);

            res.json({ status: 'success', document: newDoc });

        } catch (error) {
            console.error('Upload Error:', error);
            throw new CustomError('Failed to upload document', 500);
        }
    });

    static downloadDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;

        // 1. Get Document Metadata
        const doc = await FirebaseService.getDocument(decodedClaims.uid, id);
        if (!doc) throw new CustomError('Document not found', 404);

        if (!doc.storagePath) {
            throw new CustomError('Document file not available', 404);
        }

        try {
            // 2. Stream File
            res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);

            const stream = StorageService.getFileStream(doc.storagePath);
            stream.pipe(res);

        } catch (error) {
            console.error('Download setup error:', error);
            throw new CustomError('Failed to download document', 500);
        }
    });

    static getDocuments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const documents = await FirebaseService.getDocuments(decodedClaims.uid);
        res.json({ status: 'success', documents });
    });

    static getDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        const doc = await FirebaseService.getDocument(decodedClaims.uid, id);

        if (!doc) throw new CustomError('Document not found', 404);

        res.json({ status: 'success', document: doc });
    });

    static getCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const cards = await FirebaseService.getCards(decodedClaims.uid);
        res.json({ status: 'success', cards });
    });

    static deleteDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;

        // Fetch to get storage path
        const doc = await FirebaseService.getDocument(decodedClaims.uid, id);
        if (!doc) throw new CustomError('Document not found', 404);

        try {
            // 1. Delete from Storage (if exists)
            if (doc.storagePath) {
                await StorageService.deleteFile(doc.storagePath);
            }

            // 2. Delete from Firestore
            await FirebaseService.deleteDocument(decodedClaims.uid, id, doc.size || 0, doc.folderId || null);

            res.json({ status: 'success', message: 'Document deleted' });

        } catch (error) {
            console.error('Delete Error:', error);
            throw new CustomError('Failed to delete document', 500);
        }
    });

    static createFolder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { name, parentId, icon, color } = req.body;

        if (!name) throw new CustomError('Folder name is required', 400);

        const folderData = {
            name,
            parentId: parentId || null,
            icon: icon || 'folder',
            color: color || 'bg-slate-500',
            itemCount: 0
        };

        const newFolder = await FirebaseService.createFolder(decodedClaims.uid, folderData);
        res.json({ status: 'success', folder: newFolder });
    });

    static getFolders = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const folders = await FirebaseService.getFolders(decodedClaims.uid);
        res.json({ status: 'success', folders });
    });

    static updateFolder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        const { name } = req.body;

        if (!name) throw new CustomError('Folder name is required', 400);

        await FirebaseService.updateFolder(decodedClaims.uid, id, { name });

        res.json({ status: 'success', message: 'Folder updated' });
    });

    static deleteFolder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        await FirebaseService.deleteFolder(decodedClaims.uid, id);

        res.json({ status: 'success', message: 'Folder deleted' });
    });
}
