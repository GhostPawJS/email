import assert from 'node:assert/strict';
import * as net from 'node:net';
import { describe, it } from 'node:test';
import { ImapConnection } from './connection.ts';

/**
 * Spin up a one-shot TCP server that sends `data` to the first client that
 * connects, then closes the server.  Returns the port it is listening on.
 */
function startEchoServer(data: Buffer): Promise<number> {
	return new Promise((resolve) => {
		const server = net.createServer((socket) => {
			socket.write(data);
			server.close();
		});
		server.listen(0, '127.0.0.1', () => {
			const addr = server.address() as net.AddressInfo;
			resolve(addr.port);
		});
	});
}

describe('ImapConnection', () => {
	it('reports not connected before connect', () => {
		const conn = new ImapConnection({ host: '127.0.0.1', port: 10143, tls: false });
		assert.equal(conn.isConnected, false);
	});

	it('throws when accessing socket before connect', () => {
		const conn = new ImapConnection({ host: '127.0.0.1', port: 10143, tls: false });
		assert.throws(() => conn.socket, /Not connected/);
	});

	it('wrapCompression is a no-op before connect (no socket)', () => {
		const conn = new ImapConnection({ host: '127.0.0.1', port: 10143, tls: false });
		// wrapCompression reads #socket which is null — must not throw
		assert.doesNotThrow(() => conn.wrapCompression());
	});

	it('forwards socket data as connection data events after connect', async () => {
		const payload = Buffer.from('* OK Dovecot ready\r\n');
		const port = await startEchoServer(payload);

		const conn = new ImapConnection({ host: '127.0.0.1', port, tls: false });
		const received: Buffer[] = [];
		conn.on('data', (chunk: Buffer) => received.push(chunk));

		await conn.connect();

		// Give the server a moment to push its greeting
		await new Promise<void>((res) => setTimeout(res, 50));
		await conn.disconnect();

		const all = Buffer.concat(received).toString();
		assert.ok(all.includes('Dovecot ready'), 'greeting should arrive as data event');
	});

	it('reports connected after connect and disconnected after disconnect', async () => {
		const port = await startEchoServer(Buffer.from('* OK ready\r\n'));
		const conn = new ImapConnection({ host: '127.0.0.1', port, tls: false });
		await conn.connect();
		assert.equal(conn.isConnected, true);
		await conn.disconnect();
		assert.equal(conn.isConnected, false);
	});
});
