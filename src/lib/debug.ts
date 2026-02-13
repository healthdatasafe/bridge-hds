import util from 'util';

function log (...args: unknown[]): void {
  for (const arg of args) {
    console.log(util.inspect(arg, { depth: 12, colors: true }));
  }
}

function stack (start = 0, length = 100): string[] {
  const e = new Error();
  return (e.stack || '').split('\n').filter(l => l.indexOf('node_modules') < 0).slice(start + 1, start + length + 1);
}

function logstack (...args: unknown[]): void {
  log(...args, stack(2, 4));
}

export { logstack, log, stack };

declare global {
  var $$: typeof logstack;
  var $$$: typeof log;
}

globalThis.$$ = logstack;
globalThis.$$$ = log;
