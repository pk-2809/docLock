import { google } from 'googleapis';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import { CustomError } from '../middleware/errorHandler';


const PARENT_FOLDER_NAME = 'docLock';

// Simple encryption constants (In prod, store key in env)
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
let ENCRYPTION_KEY: Buffer | null = null;

function getEncryptionKey(): Buffer {
    if (ENCRYPTION_KEY) return ENCRYPTION_KEY;
    const encryptionSecret = process.env.ENCRYPTION_SECRET;
    if (!encryptionSecret) {
        throw new Error('ENCRYPTION_SECRET is missing in .env');
    }
    ENCRYPTION_KEY = crypto.scryptSync(encryptionSecret, 'salt', 32);
    return ENCRYPTION_KEY;
}

export class GoogleDriveService {
    private static driveClient: any;
    private static parentFolderId: string | null = null;

    private static getDriveClient() {
        if (this.driveClient) return this.driveClient;

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            throw new CustomError('Google Drive OAuth credentials missing. Check .env', 500);
        }

        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        this.driveClient = google.drive({ version: 'v3', auth });
        return this.driveClient;
    }

    private static async getParentFolderId(): Promise<string> {
        if (this.parentFolderId) return this.parentFolderId;

        const drive = this.getDriveClient();

        try {
            // Check if folder exists
            const res = await drive.files.list({
                q: `mimeType='application/vnd.google-apps.folder' and name='${PARENT_FOLDER_NAME}' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive',
            });

            if (res.data.files && res.data.files.length > 0) {
                this.parentFolderId = res.data.files[0].id || '';
                if (!this.parentFolderId) throw new Error('Found folder but ID is missing');
                return this.parentFolderId;
            }

            // Create folder if not exists
            const fileMetadata = {
                name: PARENT_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            };

            const file = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });

            this.parentFolderId = file.data.id || '';
            if (!this.parentFolderId) throw new Error('Created folder but ID is missing');
            return this.parentFolderId;
        } catch (error) {
            console.error('Error getting/creating parent folder:', error);
            throw new CustomError('Failed to initialize Drive storage. Check OAuth permissions.', 500);
        }
    }

    /**
     * Upload a file to Google Drive
     * @param options Configuration for upload (encrypt, makePublic)
     */
    static async uploadFile(fileStream: Readable, fileName: string, mimeType: string, options: { encrypt: boolean; makePublic: boolean } = { encrypt: true, makePublic: false }): Promise<{ fileId: string; iv?: string; webViewLink: string; webContentLink: string }> {
        const drive = this.getDriveClient();

        try {
            const parentId = await this.getParentFolderId();

            let mediaBody: Readable = fileStream;
            let ivString: string | undefined;

            if (options.encrypt) {
                // Encrypt the stream
                const iv = crypto.randomBytes(IV_LENGTH);
                const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
                mediaBody = fileStream.pipe(cipher);
                ivString = iv.toString('hex');
            }

            const fileMetadata = {
                name: fileName,
                parents: [parentId],
            };

            const media = {
                mimeType: mimeType,
                body: mediaBody,
            };

            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
            });

            if (options.makePublic) {
                await drive.permissions.create({
                    fileId: response.data.id,
                    requestBody: {
                        role: 'reader',
                        type: 'anyone',
                    },
                });
            }

            let publicUrl = response.data.webContentLink;
            if (options.makePublic && response.data.id) {
                // Use the lh3.googleusercontent.com format for direct embedding of public images
                const fileId = response.data.id;
                publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            }

            return {
                fileId: response.data.id,
                iv: ivString,
                webViewLink: response.data.webViewLink,
                webContentLink: publicUrl // Return embed link as main link for public files
            };
        } catch (error) {
            console.error('Google Drive Upload Error:', error);
            throw new CustomError('Failed to upload file to Google Drive', 500);
        }
    }

    /**
     * Get a file stream from Drive and Decrypt it
     */
    static async getFileStream(fileId: string, ivHex: string): Promise<Readable> {
        const drive = this.getDriveClient();
        try {
            const res = await drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            // Decrypt
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);

            return res.data.pipe(decipher);
        } catch (error) {
            console.error('Google Drive Download Error:', error);
            throw new CustomError('Failed to retrieve file from Drive', 500);
        }
    }

    static async deleteFile(fileId: string): Promise<void> {
        const drive = this.getDriveClient();
        try {
            await drive.files.delete({
                fileId: fileId,
            });
        } catch (error: any) {
            console.error('Google Drive Delete Error:', error?.message);
        }
    }
}
