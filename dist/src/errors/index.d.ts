import type { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    errorObject?: unknown;
    skipWebHookCall?: boolean;
    webhookParams?: Record<string, unknown>;
}
interface PartnerRequest extends Request {
    isPartner?: boolean;
}
interface LogResponse extends Response {
    log404?: boolean;
}
/**
 * Middleware for express to manage errors
 */
declare function expressErrorHandler(err: AppError, req: Request, res: LogResponse, next: NextFunction): void;
declare function unkownRessource(msg: string, obj?: unknown): never;
declare function unauthorized(msg: string, obj?: unknown): never;
declare function badRequest(msg: string, obj?: unknown): never;
declare function internalError(msg: string, obj?: unknown): never;
declare function serviceError(msg: string, obj?: unknown): never;
/**
 * Throw an error if call is not from Partner backend
 */
declare function assertFromPartner(req: PartnerRequest): void;
/**
 * Throws an error a string is not a url
 */
declare function assertValidURL(url: string, extraMessage?: string): void;
/**
 * Throws an error if the partnerId is not in correct format
 */
declare function assertValidPartnerUserId(partnerUserId: string): void;
/**
 * Throws an error if the email is not in correct format
 */
declare function assertValidEmail(email: string): void;
export { expressErrorHandler, assertValidEmail, assertValidPartnerUserId, assertFromPartner, assertValidURL, unkownRessource, unauthorized, badRequest, internalError, serviceError };
//# sourceMappingURL=index.d.ts.map