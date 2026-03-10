import util from 'util';
function log(...args) {
    for (const arg of args) {
        console.log(util.inspect(arg, { depth: 12, colors: true }));
    }
}
function stack(start = 0, length = 100) {
    const e = new Error();
    return (e.stack || '').split('\n').filter(l => l.indexOf('node_modules') < 0).slice(start + 1, start + length + 1);
}
function logstack(...args) {
    log(...args, stack(2, 4));
}
export { logstack, log, stack };
globalThis.$$ = logstack;
globalThis.$$$ = log;
//# sourceMappingURL=debug.js.map