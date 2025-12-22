import { environment } from './environments/environment';

if ((environment as any).production === false) {
    // Hardcoded debug token for easier setup - match console configuration
    // This must run BEFORE any Firebase SDKs are initialized
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "12345678-1234-1234-1234-123456789012";
    console.log('🔧 App Check Debug Token set:', (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN);
}
