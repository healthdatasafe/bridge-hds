declare function log(...args: unknown[]): void;
declare function stack(start?: number, length?: number): string[];
declare function logstack(...args: unknown[]): void;
export { logstack, log, stack };
declare global {
    var $$: typeof logstack;
    var $$$: typeof log;
}
//# sourceMappingURL=debug.d.ts.map