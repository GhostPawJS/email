export interface EmailRunResult {
	lastInsertRowid: number | bigint;
	changes?: number | bigint | undefined;
}

export interface EmailStatement {
	run(...params: unknown[]): EmailRunResult;
	get<TRecord>(...params: unknown[]): TRecord | undefined;
	all<TRecord>(...params: unknown[]): TRecord[];
}

/**
 * SQLite dependency injected into every email operation.
 * Node.js `DatabaseSync` satisfies this interface directly.
 */
export type EmailDb = {
	exec(sql: string): void;
	prepare(sql: string): EmailStatement;
	close(): void;
};
