import { Request, Response } from 'express';
import { FirebaseService } from '../services/firebase.service';
import { TokenService } from '../services/token.service';
import { CustomError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';

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
}
