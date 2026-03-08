import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare function validate(schema: z.ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: z.ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function paginate(req: Request): {
    page: number;
    limit: number;
    offset: number;
};
//# sourceMappingURL=validation.d.ts.map