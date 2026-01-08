import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import peopleRoutes from './routes/people.routes';
import notificationRoutes from './routes/notification.routes';
import documentRoutes from './routes/document.routes';
import cardRoutes from './routes/card.routes';
import configRoutes from './routes/config.routes';
import qrRoutes from './routes/qr.routes';
import { errorHandler } from './middleware/errorHandler';
import { csrfProtection } from './middleware/csrf';

dotenv.config();

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const frontendUrls = process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : [];
if (frontendUrls.length === 0) {
    console.warn('Warning: FRONTEND_URLS not set in environment variables');
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (frontendUrls.includes(origin)) {
            callback(null, true);
        } else {
            console.error('CORS Blocked Origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Standard Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CSRF Protection (production only)
app.use(csrfProtection);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/qrs', qrRoutes);

// Health Check
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Firestore Health Check
app.get('/health/firestore', async (_req: Request, res: Response): Promise<void> => {
    try {
        const { db, isFirebaseInitialized } = await import('./config/firebase.js');

        if (!isFirebaseInitialized) {
            res.status(503).json({
                status: 'unavailable',
                message: 'Firebase not initialized.'
            });
            return;
        }

        try {
            const testRef = db.collection('_health').doc('test');
            await testRef.get();

            res.json({
                status: 'ok',
                firestore: 'connected',
                message: 'Firestore database is accessible'
            });
        } catch (error: unknown) {
            const firestoreError = error as { code?: number; message?: string };

            if (firestoreError.code === 5) {
                res.status(503).json({
                    status: 'error',
                    firestore: 'not_found',
                    message: 'Firestore database not found. Please create it in Firebase Console.',
                    instructions: 'See FIRESTORE_SETUP.md for setup instructions',
                    consoleUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore`
                });
                return;
            }

            throw error;
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to check Firestore health',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// 404 Handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error Handler (must be last)
app.use(errorHandler);

export default app;
