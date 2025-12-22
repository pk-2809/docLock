import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';

export const validateMobile = (req: Request, _res: Response, next: NextFunction): void => {
    const { mobile } = req.body;
    
    if (!mobile) {
        throw new CustomError('Mobile number is required', 400);
    }

    // Validate mobile number format (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobile)) {
        throw new CustomError('Invalid mobile number format. Must be 10 digits', 400);
    }

    next();
};

export const validateSignup = (req: Request, _res: Response, next: NextFunction): void => {
    const { idToken, name, key } = req.body;

    if (!idToken || typeof idToken !== 'string') {
        throw new CustomError('ID Token is required', 400);
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new CustomError('Name is required and must be a non-empty string', 400);
    }

    if (!key || typeof key !== 'string') {
        throw new CustomError('Signup key is required', 400);
    }

    next();
};

export const validateIdToken = (req: Request, _res: Response, next: NextFunction): void => {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== 'string') {
        throw new CustomError('ID Token is required', 400);
    }

    next();
};

