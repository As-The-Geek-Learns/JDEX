/**
 * Type declarations for sql.js
 * ============================
 * sql.js is SQLite compiled to WebAssembly.
 */

declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
    prepare(sql: string): Statement;
    getRowsModified(): number;
  }

  export interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    get(): unknown[];
    free(): void;
    reset(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | Uint8Array) => Database;
  }

  export interface InitSqlJsOptions {
    locateFile?: (filename: string) => string;
    wasmBinary?: ArrayBuffer;
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
