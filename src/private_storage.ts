import { chmodSync, closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

/** Create private storage without changing existing files or directories. */
export function preparePrivateStorage(path: string): () => void {
	mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
	const created: string[] = [];
	for (const file of [path, `${path}-wal`, `${path}-shm`]) {
		try {
			closeSync(openSync(file, 'wx', 0o600));
			created.push(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
		}
	}
	// SQLite can copy the database mode to SHM, including a pre-created SHM.
	// Restore only files created here; existing permissions belong to the caller.
	return () => {
		if (process.platform !== 'win32')
			for (const file of created) {
				try {
					chmodSync(file, 0o600);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
				}
			}
	};
}

/** SQLite creates its sidecars synchronously while initializing the connection. */
export function withPrivateCreation<T>(operation: () => T, secure?: () => void): T {
	if (process.platform === 'win32') return operation();
	const previous = process.umask(0o077);
	try {
		return operation();
	} finally {
		process.umask(previous);
		secure?.();
	}
}
