import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

export class TokenService {
    /**
     * Generates a signed key containing data and a timestamp.
     * Used to ensure data integrity between steps (e.g., Mobile Check -> Signup).
     */
    static generateSignedKey(data: Record<string, any>, expiresInMinutes = 10): string {
        const payload = JSON.stringify({ ...data, ts: Date.now(), exp: expiresInMinutes });
        const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
        return Buffer.from(`${payload}.${signature}`).toString('base64');
    }

    /**
     * Verifies a signed key and returns the data if valid and not expired.
     */
    static verifySignedKey(key: string): Record<string, any> | null {
        try {
            const decoded = Buffer.from(key, 'base64').toString('utf-8');
            const [payloadStr, signature] = decoded.split('.');

            if (!payloadStr || !signature) return null;

            const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadStr).digest('hex');

            if (signature !== expectedSignature) return null;

            const data = JSON.parse(payloadStr);
            const now = Date.now();
            const created = data.ts;
            const expires = data.exp * 60 * 1000;

            if (now - created > expires) return null;

            return data;
        } catch (error) {
            return null;
        }
    }
}
