import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { upload } from '../middleware/upload';

const router = Router();

// Document Routes
router.post('/upload', upload.single('file'), DocumentController.uploadDocument);
router.get('/list', DocumentController.getDocuments);
router.get('/cards', DocumentController.getCards);
router.get('/:id/download', DocumentController.downloadDocument);

// Folder Routes
router.post('/folder', DocumentController.createFolder);
router.get('/folders', DocumentController.getFolders);
router.delete('/folder/:id', DocumentController.deleteFolder);
router.put('/folder/:id', DocumentController.updateFolder);

// Generic ID Routes (Must be last)
router.delete('/:id', DocumentController.deleteDocument);

export default router;
