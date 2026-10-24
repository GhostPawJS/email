import assert from 'node:assert/strict';
import { syncBuiltinESMExports } from 'node:module';
import net, { createServer } from 'node:net';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import tlsModule from 'node:tls';
import { EmailConnectionError } from './errors.ts';
import { Mailbox } from './mailbox.ts';
import { SmtpConnection } from './smtp/connection.ts';

for (const tls of [false, true]) {
	for (const protocol of ['IMAP', 'SMTP']) {
		test(`${protocol} rejects refused connections without crashing (tls=${tls})`, async (t) => {
			const server = createServer();
			try {
				await new Promise<void>((resolve, reject) => {
					server.once('error', reject);
					server.listen(0, '127.0.0.1', resolve);
				});
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'EPERM') {
					t.skip('Sandbox prohibits local listeners');
					return;
				}
				throw error;
			}
			const address = server.address();
			assert.ok(address && typeof address !== 'string');
			const port = address.port;
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
			const connection =
				protocol === 'IMAP'
					? new Mailbox({
							imap: { host: '127.0.0.1', port, tls },
							smtp: { host: '127.0.0.1', port, tls },
							auth: { user: 'u', pass: 'p' },
							storage: ':memory:',
						})
					: new SmtpConnection({ host: '127.0.0.1', port, tls });
			try {
				await assert.rejects(connection.connect(), (error: unknown) => {
					assert.ok(error instanceof EmailConnectionError);
					assert.ok(error.message.includes(`127.0.0.1:${port}`));
					assert.match(error.message, /connection refused/i);
					return true;
				});
				if (connection instanceof Mailbox) assert.equal(connection.isConnected(), false);
			} finally {
				await connection.disconnect();
			}
		});
	}
}

for (const secure of [false, true]) {
	for (const protocol of ['IMAP', 'SMTP']) {
		test(`${protocol} handles socket ECONNREFUSED (tls=${secure})`, async (t) => {
			t.mock.method(secure ? tlsModule : net, 'connect', () => {
				const socket = new PassThrough();
				process.nextTick(() =>
					socket.destroy(
						Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
					),
				);
				return socket;
			});
			syncBuiltinESMExports();
			const connection =
				protocol === 'IMAP'
					? new Mailbox({
							imap: { host: 'local', port: 1234, tls: secure },
							smtp: { host: 'local', port: 1234 },
							auth: { user: 'u', pass: 'p' },
							storage: ':memory:',
						})
					: new SmtpConnection({ host: 'local', port: 1234, tls: secure });
			try {
				await assert.rejects(connection.connect(), (error: unknown) => {
					assert.ok(error instanceof EmailConnectionError);
					assert.match(error.message, /local:1234/);
					assert.match(error.message, /connection refused/i);
					return true;
				});
				if (connection instanceof Mailbox) assert.equal(connection.isConnected(), false);
			} finally {
				await connection.disconnect();
				t.mock.restoreAll();
				syncBuiltinESMExports();
			}
		});
	}
}
