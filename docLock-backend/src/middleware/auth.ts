import { Request, Response, NextFunction } from 'express';
import { FirebaseService } from '../services/firebase.service';
import { CustomError } from './errorHandler';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        [key: string]: any;
    };
}

export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const sessionCookie = req.cookies.__session || '';

        if (!sessionCookie) {
            throw new CustomError('Unauthorized', 401);
        }

        const decodedClaims = await FirebaseService.verifySessionCookie(sessionCookie);

        if (!decodedClaims) {
            throw new CustomError('Unauthorized - Invalid Session', 401);
        }

        req.user = {
            ...decodedClaims,
            uid: decodedClaims.uid
        };

        next();
    } catch (error) {
        next(error);
    }
};
