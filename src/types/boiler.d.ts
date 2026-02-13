declare module 'boiler' {
  export interface Config {
    get<T = unknown>(key: string): T;
    set(key: string, value: unknown): void;
  }

  export interface Logger {
    info(...args: unknown[]): void;
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    debug(...args: unknown[]): void;
  }

  export interface ExtraConfig {
    scope?: string;
    file?: string;
    pluginAsync?: {
      load: (store: Config) => Promise<string>;
    };
  }

  export interface Boiler {
    getConfig(): Promise<Config>;
    getLogger(name: string): Logger;
    getConfigUnsafe(warnOnly?: boolean): Config;
    init(options: {
      appName: string;
      baseFilesDir?: string;
      baseConfigDir?: string;
      extraConfigs?: ExtraConfig[];
    }): Boiler;
  }

  const boiler: Boiler;
  export default boiler;
}
