import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { AppSettingsService } from '../services/app-settings.service';

const appSettings = new AppSettingsService();
export const firebaseApp = initializeApp(appSettings.firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);