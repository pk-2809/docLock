import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '../services/config.service';

export const getGlobalConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const config = await ConfigService.getGlobalConfig();
        res.json(config);
    } catch (error) {
        next(error);
    }
};
