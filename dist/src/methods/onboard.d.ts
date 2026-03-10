declare function init(): Promise<void>;
interface RedirectURLs {
    success: string;
    cancel: string;
}
/**
 * Create an onboarding URL for this patient
 */
declare function initiate(partnerUserId: string, redirectURLs: RedirectURLs, webhookClientData: Record<string, unknown>): Promise<unknown>;
/**
 * Finalize an onboarding process
 */
declare function finalize(partnerUserId: string, pollParam: string | string[]): Promise<string>;
/**
 * Get pending auth status (may be sevrals)
 */
declare function authStatusesGet(partnerUserId: string): Promise<any[]>;
/**
 * Array of pending authStatus to remove
 */
declare function authStatusesClean(authStatusEvents: any[]): Promise<void>;
export { init, initiate, finalize, authStatusesGet, authStatusesClean };
//# sourceMappingURL=onboard.d.ts.map