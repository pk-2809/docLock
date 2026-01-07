import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'doclock-super-secret-key-v1'; // Must match frontend

export class EncryptionUtil {
    /**
     * Decrypts OpenSSL-compatible AES-256-CBC string (CryptoJS default)
     */
    static decrypt(encryptedValue: string): string {
        try {
            const data = Buffer.from(encryptedValue, 'base64');
            const salt = data.subarray(8, 16);
            const ciphertext = data.subarray(16);

            // Derive key and IV (OpenSSL-compatible EVP_BytesToKey)
            // MD5(password + salt)
            // We need 48 bytes (32 for key, 16 for IV)
            const keyIv = this.evpBytesToKey(ENCRYPTION_KEY, salt, 48);
            const key = keyIv.subarray(0, 32);
            const iv = keyIv.subarray(32, 48);

            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            let decrypted = decipher.update(ciphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString('utf8');
        } catch (error) {
            console.error('Decryption failed:', error);
            return '';
        }
    }

    private static evpBytesToKey(password: string, salt: Buffer, keyLen: number): Buffer {
        const passwordBuffer = Buffer.from(password, 'utf8');
        let currentHash = Buffer.alloc(0);
        let result = Buffer.alloc(0);

        while (result.length < keyLen) {
            const hash = crypto.createHash('md5');
            if (currentHash.length > 0) {
                hash.update(currentHash);
            }
            hash.update(passwordBuffer);
            hash.update(salt);
            currentHash = hash.digest();
            result = Buffer.concat([result, currentHash]);
        }

        return result.subarray(0, keyLen);
    }
}
