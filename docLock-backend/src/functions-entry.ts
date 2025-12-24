import { onRequest } from 'firebase-functions/v2/https';
import app from './app';

// Export the express app as a Firebase Cloud Function
export const api = onRequest({ cors: false }, app);
