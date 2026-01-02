import { Request, Response } from 'express';
import { Readable } from 'stream';
import { FirebaseService } from '../services/firebase.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { CustomError, asyncHandler } from '../middleware/errorHandler';

export class DocumentController {

    static uploadDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);
        const uid = decodedClaims.uid;

        const file = req.file;
        if (!file) throw new CustomError('No file provided', 400);

        try {
            // 1. Upload to Google Drive
            // Folder structure: User creates folders? For now, flat or root.
            // We can prefix the name or use folders later.
            const stream = new Readable();
            stream.push(file.buffer);
            stream.push(null);

            const uploadResult = await GoogleDriveService.uploadFile(
                stream,
                file.originalname,
                file.mimetype,
                { encrypt: true, makePublic: false }
            );

            // 2. Save Metadata to Firestore
            const docData = {
                name: req.body.name || file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                driveFileId: uploadResult.fileId,
                iv: uploadResult.iv, // Store IV for decryption
                // webViewLink: uploadResult.webViewLink, // Not useful for encrypted files
                // webContentLink: uploadResult.webContentLink, // Not useful for encrypted files
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
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;

        // 1. Get Document Metadata (Efficiently)
        const doc = await FirebaseService.getDocument(decodedClaims.uid, id);

        if (!doc) throw new CustomError('Document not found', 404);
        if (!doc.driveFileId || !doc.iv) throw new CustomError('Invalid document record', 500);

        try {
            // 2. Stream decrypted file
            const stream = await GoogleDriveService.getFileStream(doc.driveFileId, doc.iv);

            res.setHeader('Content-Type', doc.mimeType);
            if (doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) {
                // Inline for previewable types
                res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
            } else {
                res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
            }

            stream.on('error', (err) => {
                console.error('Stream Error during download:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Streaming failed' });
                } else {
                    res.end();
                }
            });

            stream.pipe(res);
        } catch (error) {
            console.error('Download setup error:', error);
            throw new CustomError('Failed to download document', 500);
        }
    });

    static getDocuments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const documents = await FirebaseService.getDocuments(decodedClaims.uid);
        res.json({ status: 'success', documents });
    });

    static getDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        const doc = await FirebaseService.getDocument(decodedClaims.uid, id);

        if (!doc) throw new CustomError('Document not found', 404);

        res.json({ status: 'success', document: doc });
    });

    static getCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const cards = await FirebaseService.getCards(decodedClaims.uid);
        res.json({ status: 'success', cards });
    });

    static deleteDocument = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params; // Document ID (Firestore ID)
        const { driveFileId, size } = req.body; // Pass these to avoid extra lookup if possible, or lookup first

        if (!driveFileId) {
            // Need to lookup if not provided, for now assume provided by frontend or we do a lookup
            // Let's rely on frontend sending it or we implement lookup if missing.
            // MVP: Require it for simplicity or do a quick get
        }

        try {
            // 1. Delete from Drive
            if (driveFileId) {
                await GoogleDriveService.deleteFile(driveFileId);
            }

            // 2. Delete from Firestore
            await FirebaseService.deleteDocument(decodedClaims.uid, id, size || 0);

            res.json({ status: 'success', message: 'Document deleted' });

        } catch (error) {
            console.error('Delete Error:', error);
            throw new CustomError('Failed to delete document', 500);
        }
    });
    static createFolder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
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
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const folders = await FirebaseService.getFolders(decodedClaims.uid);
        res.json({ status: 'success', folders });
    });

    static updateFolder = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
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
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        await FirebaseService.deleteFolder(decodedClaims.uid, id);

        res.json({ status: 'success', message: 'Folder deleted' });
    });
}
