import http from 'http';
interface CapturedRequest {
    method: string;
    url: string;
    headers: http.IncomingHttpHeaders;
    path?: string;
    query?: Record<string, unknown>;
    body?: string;
}
interface MockResponse {
    code: number;
    headers: Record<string, string>;
    body: string;
}
interface HttpServerCapture {
    captured: CapturedRequest[];
    nextCalls: MockResponse[];
    close: () => Promise<void>;
}
/**
 * Launch a small web server to capture eventual external calls
 * See test-suite [TESX] to see how it works.
 */
declare function startHttpServerCapture(params?: {
    port?: number;
}): Promise<HttpServerCapture>;
export { startHttpServerCapture };
//# sourceMappingURL=testWebServerCapture.d.ts.map