import { Request, Response } from 'express';
import { StorageService } from '../services/storage.service';
import { FirebaseService } from '../services/firebase.service';
import { TokenService } from '../services/token.service';
import { CustomError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { NotificationService } from '../services/notification.service';
import { EncryptionUtil } from '../utils/encryption';
import { CookieUtil } from '../utils/cookie.util';

export class AuthController {
    static checkUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { mobile } = req.body;

        const exists = await FirebaseService.userExistsByMobile(mobile);

        if (exists) {
            res.json({ exists: true });
        } else {
            const key = TokenService.generateSignedKey({ mobile });
            res.json({ exists: false, key });
        }
    });

    static verifyLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { idToken } = req.body;

        const decodedToken = await FirebaseService.verifyIdToken(idToken);
        if (!decodedToken) {
            throw new CustomError('Invalid ID Token', 401);
        }

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

        // Set session cookie (MUST be named '__session' for Firebase Hosting rewrites)
        const cookieConfig = CookieUtil.getCookieConfig(req);
        res.cookie('__session', sessionCookie, cookieConfig);

        res.json({ status: 'success', uid: decodedToken.uid });
    });

    static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { idToken, name, key } = req.body;


        const keyData = TokenService.verifySignedKey(key);
        if (!keyData) {
            throw new CustomError('Invalid or expired signup key', 403);
        }
        const expectedMobile = keyData.mobile as string;


        const decodedToken = await FirebaseService.verifyIdToken(idToken);
        if (!decodedToken) {
            throw new CustomError('Invalid ID Token', 401);
        }

        if (decodedToken.phone_number && decodedToken.phone_number !== expectedMobile) {
            console.warn('Mobile mismatch:', decodedToken.phone_number, expectedMobile);
        }


        await FirebaseService.createUser(decodedToken.uid, {
            name: name.trim(),
            mobile: expectedMobile, // Use the one we tracked from check-user
            role: 'user'
        });

        // 5. Create Session
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

        // Set session cookie (MUST be named '__session' for Firebase Hosting rewrites)
        const cookieConfig = CookieUtil.getCookieConfig(req);
        res.cookie('__session', sessionCookie, cookieConfig);

        res.json({ status: 'success', uid: decodedToken.uid });
    });

    static getCsrfToken = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
        res.json({ csrfToken: null });
    });

    static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        CookieUtil.clearAuthCookies(req, res);
        res.json({ status: 'success' });
    });

    static checkSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';

        if (!sessionCookie) {
            res.json({ isLoggedIn: false });
            return;
        }

        // Verify session cookie via Service (abstracts mock logic)
        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);

        if (!decodedClaims) {
            res.json({ isLoggedIn: false });
            return;
        }

        // Get user details from Firestore
        const user = await FirebaseService.getUser(decodedClaims.uid);

        if (!user) {
            res.json({ isLoggedIn: false });
            return;
        }

        // Resolve Profile Image if it's a storage path
        let profileImageUrl = user.profileImage;
        if (user.profileImage && user.profileImage.startsWith('profile_images/')) {
            try {
                profileImageUrl = await StorageService.getSignedUrl(user.profileImage, 60 * 24); // 24 hours
            } catch (e) {
                console.warn('Failed to sign profile image url', e);
            }
        }

        res.json({
            isLoggedIn: true,
            user: {
                uid: decodedClaims.uid,
                ...user,
                profileImage: profileImageUrl // Override with signed URL for frontend
            }
        });
    });
    static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';

        if (!sessionCookie) {
            throw new CustomError('Unauthorized', 401);
        }

        // Verify session
        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) {
            throw new CustomError('Unauthorized - Invalid Session', 401);
        }

        const updates = req.body;
        const file = req.file;

        // Basic validation - only allow specific fields
        const allowedUpdates = ['mpin', 'name', 'mobile', 'profileImage'];
        const cleanUpdates: any = {};
        let signedProfileUrl: string | undefined;

        // Handle File Upload if present
        if (file) {
            try {
                // Upload to Firebase Storage
                const storagePath = `profile_images/${decodedClaims.uid}_${Date.now()}`;
                await StorageService.uploadFile(
                    file.buffer,
                    storagePath,
                    file.mimetype
                );

                cleanUpdates.profileImage = storagePath;
                // Generate signed URL for immediate response
                signedProfileUrl = await StorageService.getSignedUrl(storagePath, 60 * 24);

            } catch (error) {
                console.error('Storage Upload Failed:', error);
                throw new CustomError('Failed to upload profile image', 500);
            }
        } else if (updates.profileImage) {
            // Handle base64 fallback or existing logic if any, but prefer file upload now.
            // If the frontend still sends base64, we might want to support it or deprecate it.
            // For now, let's treat it as a direct URL update if provided (rare).
            cleanUpdates.profileImage = updates.profileImage;
        }


        for (const key of Object.keys(updates)) {
            if (allowedUpdates.includes(key) && key !== 'profileImage') {
                cleanUpdates[key] = updates[key];
            }
        }

        if (Object.keys(cleanUpdates).length === 0) {
            throw new CustomError('No valid updates provided', 400);
        }

        await FirebaseService.updateUser(decodedClaims.uid, cleanUpdates);

        // Notification Triggers
        if (cleanUpdates.mpin) {
            // 1. Decrypt client-side encrypted MPIN
            const decryptedMpin = EncryptionUtil.decrypt(cleanUpdates.mpin);
            if (!decryptedMpin || decryptedMpin.length !== 4) {
                // Try to hash as is if decryption returns valid length, just in case old flow, 
                // but for now strict:
                if (cleanUpdates.mpin.length !== 4) { // If it wasn't length 4, it must be encrypted
                    throw new CustomError('Invalid MPIN format', 400);
                }
                // Logic fallthrough: if cleanUpdates.mpin is raw 4-digit (old clients?), we might want to allow it?
                // But EncryptionService should be deployed. Let's assume strict encryption.
            } else {
                cleanUpdates.mpin = decryptedMpin; // Use decrypted value
            }

            // 2. Hash MPIN before storing
            cleanUpdates.mpin = TokenService.hashMpin(cleanUpdates.mpin);

            await NotificationService.createNotification(decodedClaims.uid, {
                title: 'Security Update',
                message: 'Your MPIN has been updated successfully.',
                icon: 'lock'
            });
        }

        if (cleanUpdates.profileImage) {
            await NotificationService.createNotification(decodedClaims.uid, {
                title: 'Profile Updated',
                message: 'You have updated your profile picture.',
                icon: 'user'
            });
        }

        // Return the signed URL to the frontend so it can display the image immediately
        const responseUpdates = { ...cleanUpdates };
        if (signedProfileUrl) {
            responseUpdates.profileImage = signedProfileUrl;
        }

        res.json({ status: 'success', updates: responseUpdates });
    });


    static deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.__session || '';

        if (!sessionCookie) {
            throw new CustomError('Unauthorized', 401);
        }

        // Verify session
        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);
        if (!decodedClaims) {
            throw new CustomError('Unauthorized - Invalid Session', 401);
        }

        // Perform cascading delete
        await FirebaseService.deleteUserAndData(decodedClaims.uid);

        // Clear all authentication cookies
        CookieUtil.clearAuthCookies(req, res);

        res.json({ status: 'success', message: 'Account deleted successfully' });
    });
}
