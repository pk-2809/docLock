import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { FirebaseService } from '../services/firebase.service';
import { CustomError, asyncHandler } from '../middleware/errorHandler';

export class CardController {

    static getCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const cards = await FirebaseService.getCards(decodedClaims.uid);
        res.json({ status: 'success', cards });
    });

    static createCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { name, number, expiryDate, cvv, holderName, type, color, bankName, numberHmac, cvvHmac } = req.body;

        // Validations
        if (!name) throw new CustomError('Card name is required', 400);
        if (!number) throw new CustomError('Card number is required', 400);
        if (!expiryDate) throw new CustomError('Expiry date is required', 400);
        if (!cvv) throw new CustomError('CVV is required', 400);
        if (!holderName) throw new CustomError('Holder name is required', 400);

        // HMAC Integrity Check
        // Using strict hardcoded key for this MVP as requested "application level", syncing with frontend
        // In prod, use process.env.ENCRYPTION_KEY
        const SECRET_KEY = process.env.ENCRYPTION_KEY || 'doclock-super-secret-key-v1';

        const verifyHmac = (value: string, hmac: string) => {
            const calculated = crypto.createHmac('sha256', SECRET_KEY).update(value).digest('hex');
            return calculated === hmac;
        };

        if (!numberHmac || !cvvHmac) {
            throw new CustomError('Integrity check failed: Missing signature', 400);
        }

        if (!verifyHmac(number, numberHmac)) {
            throw new CustomError('Integrity check failed: Card number tampered', 403);
        }

        if (!verifyHmac(cvv, cvvHmac)) {
            throw new CustomError('Integrity check failed: CVV tampered', 403);
        }

        // Expiry Date validation (MM/YY)
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            throw new CustomError('Invalid expiry date format (MM/YY)', 400);
        }

        const cardData = {
            name,
            number, // Store encrypted string
            expiryDate,
            cvv,    // Store encrypted string
            holderName,
            type: type || 'credit',
            color: color || 'from-blue-600 to-purple-700',
            bankName: bankName || 'VISA'
        };

        const newCard = await FirebaseService.addCard(decodedClaims.uid, cardData);
        res.json({ status: 'success', card: newCard });
    });

    static updateCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        const updates = req.body;

        // HMAC Keys
        const SECRET_KEY = process.env.ENCRYPTION_KEY || 'doclock-super-secret-key-v1';

        const verifyHmac = (value: string, hmac: string) => {
            const calculated = crypto.createHmac('sha256', SECRET_KEY).update(value).digest('hex');
            return calculated === hmac;
        };

        // Sanitize updates - don't allow updating ID or restricted fields if any
        const safeUpdates: any = {};
        if (updates.name) safeUpdates.name = updates.name;

        if (updates.number) {
            safeUpdates.number = updates.number; // Expecting encrypted string
            if (!updates.numberHmac || !verifyHmac(updates.number, updates.numberHmac)) {
                throw new CustomError('Integrity check failed: Card number tampered', 403);
            }
        }

        if (updates.expiryDate) safeUpdates.expiryDate = updates.expiryDate;

        if (updates.cvv) {
            safeUpdates.cvv = updates.cvv;
            if (!updates.cvvHmac || !verifyHmac(updates.cvv, updates.cvvHmac)) {
                throw new CustomError('Integrity check failed: CVV tampered', 403);
            }
        }

        if (updates.holderName) safeUpdates.holderName = updates.holderName;
        if (updates.type) safeUpdates.type = updates.type;
        if (updates.color) safeUpdates.color = updates.color;
        if (updates.bankName) safeUpdates.bankName = updates.bankName;

        if (Object.keys(safeUpdates).length === 0) {
            throw new CustomError('No valid fields to update', 400);
        }

        await FirebaseService.updateCard(decodedClaims.uid, id, safeUpdates);
        res.json({ status: 'success', message: 'Card updated' });
    });

    static deleteCard = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) throw new CustomError('Unauthorized', 401);

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) throw new CustomError('Unauthorized', 401);

        const { id } = req.params;
        await FirebaseService.deleteCard(decodedClaims.uid, id);
        res.json({ status: 'success', message: 'Card deleted' });
    });
}
