import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || '';
const SALT = process.env.MPIN_SALT || 'doclock-salt-v1';

if (!SECRET_KEY) console.error('CRITICAL: JWT_SECRET is not defined in environment variables.');


interface SignedKeyPayload {
    [key: string]: unknown;
    ts: number;
    exp: number;
}

export class TokenService {
    private static readonly DEFAULT_EXPIRY_MINUTES = 10;

    /**
     * Generates a signed key containing data and a timestamp.
     * Used to ensure data integrity between steps (e.g., Mobile Check -> Signup).
     * 
     * @param data - Data to sign
     * @param expiresInMinutes - Expiration time in minutes (default: 10)
     * @returns Base64 encoded signed key
     */
    static generateSignedKey(data: Record<string, unknown>, expiresInMinutes: number = this.DEFAULT_EXPIRY_MINUTES): string {


        const payload: SignedKeyPayload = {
            ...data,
            ts: Date.now(),
            exp: expiresInMinutes
        };

        const payloadStr = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');

        return Buffer.from(`${payloadStr}.${signature}`).toString('base64');
    }

    /**
     * Verifies a signed key and returns the data if valid and not expired.
     * 
     * @param key - Base64 encoded signed key
     * @returns Decoded data if valid, null otherwise
     */
    static verifySignedKey(key: string): Record<string, unknown> | null {
        if (!key || typeof key !== 'string') {
            return null;
        }

        try {
            const decoded = Buffer.from(key, 'base64').toString('utf-8');
            const [payloadStr, signature] = decoded.split('.');

            if (!payloadStr || !signature) {
                return null;
            }

            // Verify signature
            const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');

            // Use timing-safe comparison to prevent timing attacks
            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
                return null;
            }

            const data = JSON.parse(payloadStr) as SignedKeyPayload;

            // Verify expiration
            const now = Date.now();
            const created = data.ts;
            const expires = data.exp * 60 * 1000; // Convert minutes to milliseconds

            if (now - created > expires) {
                return null;
            }

            // Remove internal fields before returning
            const { ts, exp, ...userData } = data;
            return userData;
        } catch (error) {
            console.error('Error verifying signed key:', error);
            return null;
        }

    }

    static hashMpin(mpin: string): string {
        return crypto.pbkdf2Sync(mpin, SALT, 1000, 64, 'sha512').toString('hex');
    }

    static verifyMpin(inputMpin: string, storedHash: string): boolean {
        const hash = this.hashMpin(inputMpin);
        return hash === storedHash;
    }
}
