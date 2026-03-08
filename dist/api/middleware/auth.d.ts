import { Response, NextFunction } from 'express';
import { AuthRequest, AuthUser } from '../types';
export declare function generateToken(user: AuthUser): string;
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function authorize(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map