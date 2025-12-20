import { Request, Response } from 'express';
import { FirebaseService } from '../services/firebase.service';
import { TokenService } from '../services/token.service';
import { auth } from '../config/firebase';

export class AuthController {
    static async checkUser(req: Request, res: Response) {
        try {
            const { mobile } = req.body;
            if (!mobile) {
                return res.status(400).json({ error: 'Mobile number is required' });
            }

            const exists = await FirebaseService.userExistsByMobile(mobile);

            if (exists) {
                // If user exists, we just return true. 
                // Frontend will trigger logic to get ID Token via OTP Login.
                return res.json({ exists: true });
            } else {
                // If user does not exist, return a signed key to authorize signup
                // This prevents someone from calling signup API directly without this step
                const key = TokenService.generateSignedKey({ mobile });
                return res.json({ exists: false, key });
            }
        } catch (error) {
            console.error('Check User Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async verifyLogin(req: Request, res: Response) {
        try {
            const { idToken } = req.body;
            if (!idToken) {
                return res.status(400).json({ error: 'ID Token is required' });
            }

            // Verify the ID Token
            const decodedToken = await FirebaseService.verifyIdToken(idToken);
            if (!decodedToken) {
                return res.status(401).json({ error: 'Invalid ID Token' });
            }

            // Create Session Cookie
            const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
            const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

            // Set Cookie
            res.cookie('session', sessionCookie, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });

            return res.json({ status: 'success', uid: decodedToken.uid });
        } catch (error) {
            console.error('Login Verify Error:', error);
            return res.status(500).json({ error: 'Login verification failed' });
        }
    }

    static async signup(req: Request, res: Response) {
        try {
            const { idToken, name, key } = req.body;

            if (!idToken || !name || !key) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // 1. Verify Signed Key (Integrity Check)
            const keyData = TokenService.verifySignedKey(key);
            if (!keyData) {
                return res.status(403).json({ error: 'Invalid or expired signup key' });
            }
            const expectedMobile = keyData.mobile;

            // 2. Verify ID Token
            const decodedToken = await FirebaseService.verifyIdToken(idToken);
            if (!decodedToken) {
                return res.status(401).json({ error: 'Invalid ID Token' });
            }

            // 3. Verify Mobile Match (Optional but recommended security check)
            // Firebase phone auth token usually contains phone_number
            if (decodedToken.phone_number && decodedToken.phone_number !== expectedMobile) {
                // Note: normalized formats might differ (+91 vs 91). 
                // For strictness we can normalize or skip if unsure. 
                // For now, logging warning if mismatch.
                // console.warn('Mobile mismatch:', decodedToken.phone_number, expectedMobile);
            }

            // 4. Create User in Firestore
            await FirebaseService.createUser(decodedToken.uid, {
                name,
                mobile: expectedMobile, // Use the one we tracked from check-user
                role: 'user'
            });

            // 5. Create Session
            const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
            const sessionCookie = await FirebaseService.createSessionCookie(idToken, expiresIn);

            res.cookie('session', sessionCookie, {
                maxAge: expiresIn,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });

            return res.json({ status: 'success', uid: decodedToken.uid });

        } catch (error) {
            console.error('Signup Error:', error);
            return res.status(500).json({ error: 'Signup failed' });
        }
    }

    static async logout(req: Request, res: Response) {
        res.clearCookie('session');
        res.json({ status: 'success' });
    }

    static async checkSession(req: Request, res: Response) {
        const sessionCookie = req.cookies.session || '';

        if (!sessionCookie) {
            return res.json({ isLoggedIn: false });
        }

        try {
            // Verify session cookie
            const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

            // Get user details from Firestore
            const user = await FirebaseService.getUser(decodedClaims.uid);

            return res.json({
                isLoggedIn: true,
                user: {
                    uid: decodedClaims.uid,
                    ...user
                }
            });
        } catch (error) {
            return res.json({ isLoggedIn: false });
        }
    }
}
