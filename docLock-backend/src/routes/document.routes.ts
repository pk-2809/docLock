import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/upload', upload.single('file'), DocumentController.uploadDocument);
router.get('/list', DocumentController.getDocuments);
router.get('/:id/download', DocumentController.downloadDocument);
router.delete('/:id', DocumentController.deleteDocument);

export default router;
