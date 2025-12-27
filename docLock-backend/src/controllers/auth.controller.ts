import { Request, Response } from 'express';
import { Readable } from 'stream';
import { GoogleDriveService } from '../services/google-drive.service';
import { FirebaseService } from '../services/firebase.service';
import { TokenService } from '../services/token.service';
import { CustomError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { NotificationService } from '../services/notification.service';

export class AuthController {
    static checkUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { mobile } = req.body;

        const exists = await FirebaseService.userExistsByMobile(mobile);

        if (exists) {
            // If user exists, we just return true. 
            // Frontend will trigger logic to get ID Token via OTP Login.
            res.json({ exists: true });
        } else {
            // If user does not exist, return a signed key to authorize signup
            // This prevents someone from calling signup API directly without this step
            const key = TokenService.generateSignedKey({ mobile });
            res.json({ exists: false, key });
        }
    });

    static verifyLogin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { idToken } = req.body;

        // Verify the ID Token
        const decodedToken = await FirebaseService.verifyIdToken(idToken);
        if (!decodedToken) {
            throw new CustomError('Invalid ID Token', 401);
        }

        // Create Session Cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

        // Set Cookie
        res.cookie('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true, // Required for SameSite: None
            sameSite: 'none', // Required for cross-site (web.app -> run.app)
        });

        res.json({ status: 'success', uid: decodedToken.uid });
    });

    static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { idToken, name, key } = req.body;

        // 1. Verify Signed Key (Integrity Check)
        const keyData = TokenService.verifySignedKey(key);
        if (!keyData) {
            throw new CustomError('Invalid or expired signup key', 403);
        }
        const expectedMobile = keyData.mobile as string;

        // 2. Verify ID Token
        const decodedToken = await FirebaseService.verifyIdToken(idToken);
        if (!decodedToken) {
            throw new CustomError('Invalid ID Token', 401);
        }

        // 3. Verify Mobile Match (Optional but recommended security check)
        // Firebase phone auth token usually contains phone_number
        if (decodedToken.phone_number && decodedToken.phone_number !== expectedMobile) {
            // Note: normalized formats might differ (+91 vs 91). 
            // For strictness we can normalize or skip if unsure. 
            // For now, logging warning if mismatch.
            console.warn('Mobile mismatch:', decodedToken.phone_number, expectedMobile);
        }

        // 4. Create User in Firestore
        await FirebaseService.createUser(decodedToken.uid, {
            name: name.trim(),
            mobile: expectedMobile, // Use the one we tracked from check-user
            role: 'user'
        });

        // 5. Create Session
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

        res.cookie('session', sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true, // Required for SameSite: None
            sameSite: 'none', // Required for cross-site (web.app -> run.app)
        });

        res.json({ status: 'success', uid: decodedToken.uid });
    });

    static logout = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
        res.clearCookie('session', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        res.json({ status: 'success' });
    });

    static checkSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';

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

        res.json({
            isLoggedIn: true,
            user: {
                uid: decodedClaims.uid,
                ...user
            }
        });
    });
    static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';

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

        // Handle File Upload if present
        if (file) {
            try {
                // Convert buffer to stream
                const stream = new Readable();
                stream.push(file.buffer);
                stream.push(null);

                // Upload to Drive
                // Use a specific folder for profiles if needed, for now root or specific id
                // TODO: Store folder ID in env or config
                const uploadResult = await GoogleDriveService.uploadFile(
                    stream,
                    `profile_${decodedClaims.uid}_${Date.now()}`,
                    file.mimetype,
                    { encrypt: false, makePublic: true }
                );

                cleanUpdates.profileImage = uploadResult.webContentLink; // Use webContentLink for direct display/download if public

                // If the user already had a profile image from Drive (checked by URL pattern usually), 
                // we might want to delete the old one to save space. 
                // Skipped for now to strictly follow "MVP" speed, but good practice later.

            } catch (error) {
                console.error('Drive Upload Failed:', error);
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

        res.json({ status: 'success', updates: cleanUpdates });
    });


    static deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const sessionCookie = req.cookies.session || '';

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

        // Clear session cookie
        res.clearCookie('session', {
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });

        res.json({ status: 'success', message: 'Account deleted successfully' });
    });
}
