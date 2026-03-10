import type { Request, Response, NextFunction } from 'express';
interface PartnerRequest extends Request {
    isPartner?: boolean;
}
declare function init(): Promise<void>;
declare function checkIfPartner(req: PartnerRequest, _res: Response, next: NextFunction): Promise<void>;
export { init, checkIfPartner };
//# sourceMappingURL=checkAuth.d.ts.map