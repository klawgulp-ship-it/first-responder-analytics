import { Pool } from 'pg';
export declare const pool: Pool;
export declare function query(text: string, params?: unknown[]): Promise<import("pg").QueryResult<any>>;
export declare function getClient(): Promise<import("pg").PoolClient>;
//# sourceMappingURL=connection.d.ts.map