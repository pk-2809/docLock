import express from 'express';
import { QrController } from '../controllers/qr.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Protected Routes (User Management)
router.post('/', authenticate, QrController.create);
router.get('/', authenticate, QrController.list);
router.put('/:id', authenticate, QrController.update);
router.delete('/:id', authenticate, QrController.delete);

// Public Routes (Access)
router.post('/public/verify', QrController.verifyMpin);
router.get('/public/documents', QrController.getPublicDocuments);
router.get('/public/documents/:docId/content', QrController.getPublicDocumentContent);
router.get('/public/documents/:docId/proxy', QrController.proxyDocumentContent);

export default router;
