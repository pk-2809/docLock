import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { NotificationService } from '../services/notification.service';
import { FirebaseService } from '../services/firebase.service';

export class NotificationController {
    static getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        // We need UID. In app.ts, authRoutes ran checkSession but didn't necessarily attach user to req object globally.
        // However, the frontend passes session cookie.
        // We'll parse the session cookie here to get UID.
        // Ideally this should be a middleware, but for speed keeping local.

        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) {
            res.json({ status: 'success', data: [] });
            return;
        }

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) {
            res.json({ status: 'success', data: [] });
            return;
        }

        const notifications = await NotificationService.getNotifications(decodedClaims.uid);

        res.json({
            status: 'success',
            data: notifications
        });
    });

    static clearAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) return;
        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) return;

        await NotificationService.clearAll(decodedClaims.uid);
        res.json({ status: 'success', message: 'All notifications cleared' });
    });

    static markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';
        if (!sessionCookie) return;
        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) return;

        await NotificationService.markAllAsRead(decodedClaims.uid);
        res.json({ status: 'success', message: 'All notifications marked as read' });
    });
}
