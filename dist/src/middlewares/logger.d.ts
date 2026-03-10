import type { Request, Response, NextFunction } from 'express';
interface LogResponse extends Response {
    log404?: boolean;
}
declare function expressLogger(req: Request, res: LogResponse, next: NextFunction): void;
export default expressLogger;
//# sourceMappingURL=logger.d.ts.map