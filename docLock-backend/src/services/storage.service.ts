import * as admin from 'firebase-admin';

export class StorageService {

    private static get bucket() {
        return admin.storage().bucket();
    }

    /**
     * Uploads a file to Firebase Cloud Storage
     * @param buffer File content buffer
     * @param destinationPath Storage path (e.g. users/uid/docs/filename)
     * @param mimeType MIME type of the file
     */
    static async uploadFile(buffer: Buffer, destinationPath: string, mimeType: string): Promise<void> {
        const file = this.bucket.file(destinationPath);

        await file.save(buffer, {
            metadata: {
                contentType: mimeType,
            },
            resumable: false
        });
    }

    /**
     * Generates a secure, time-limited Signed URL for read access
     * @param storagePath Path to the file in storage
     * @param expiresInMinutes Duration in minutes (default 15)
     */
    static async getSignedUrl(storagePath: string, expiresInMinutes: number = 15): Promise<string> {
        const file = this.bucket.file(storagePath);

        // Expiry time must be a date object or string
        const expires = Date.now() + expiresInMinutes * 60 * 1000;

        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: expires,
        });

        return url;
    }

    /**
     * Deletes a file from storage
     */
    static async deleteFile(storagePath: string): Promise<void> {
        const file = this.bucket.file(storagePath);
        try {
            await file.delete();
        } catch (error: any) {
            // Ignore if file doesn't exist (cleaner idempotent behavior)
            if (error.code !== 404) {
                throw error;
            }
        }
    }
}
