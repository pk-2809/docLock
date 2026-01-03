import { db, isFirebaseInitialized } from '../config/firebase';


export interface AppConfig {
    maxStorageLimit: number;
    maxDebitCardsLimit: number;
    maxCreditCardsLimit: number;
    maxQrLimit: number; // New Limit
    maxFolderNestingAllowed: number;
    sharedDocumentLifeInHrs: number;
    maxFriendsAddLimit: number;
    // File Constraints
    maxPdfSizeAllowed: number;
    maxImgSizeAllowed: number;
    imgFormatsAllowed: string[];
    otherFormatsAllowed: string[];
}

const DEFAULT_CONFIG: AppConfig = {
    maxStorageLimit: 200 * 1024 * 1024, // 200MB
    maxDebitCardsLimit: 5,
    maxCreditCardsLimit: 5,
    maxQrLimit: 20, // Default 20
    maxFolderNestingAllowed: 5,
    sharedDocumentLifeInHrs: 1,
    maxFriendsAddLimit: 10,
    // File Constraints
    maxPdfSizeAllowed: 5 * 1024 * 1024, // 5MB
    maxImgSizeAllowed: 2 * 1024 * 1024, // 2MB
    imgFormatsAllowed: ['.jpg', '.jpeg', '.png', '.heic', '.avif'],
    otherFormatsAllowed: ['.pdf', '.docx', '.doc']
};

export class ConfigService {
    static async getGlobalConfig(): Promise<AppConfig> {
        if (!isFirebaseInitialized) {
            console.log('[Mock] Getting Global Config');
            return DEFAULT_CONFIG;
        }

        try {
            const configRef = db.collection('app_config').doc('global');
            const doc = await configRef.get();

            if (!doc.exists) {
                console.log('⚡ Initializing Default Global Config in Firestore...');
                await configRef.set(DEFAULT_CONFIG);
                return DEFAULT_CONFIG;
            }

            return doc.data() as AppConfig;
        } catch (error) {
            console.error('Error fetching global config:', error);
            // Fallback to defaults if Firestore fails (e.g. initial perm issues)
            return DEFAULT_CONFIG;
        }
    }
}
