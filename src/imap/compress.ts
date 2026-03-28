import type { ImapDispatcher } from './dispatcher.ts';

/**
 * Send COMPRESS DEFLATE to the server.
 * Returns true if the server accepted compression.
 *
 * The caller is responsible for calling ImapConnection.wrapCompression()
 * immediately after this returns true — before any further data is sent or
 * received — so the socket I/O is wrapped with zlib inflate/deflate streams.
 */
export async function enableCompression(dispatcher: ImapDispatcher): Promise<boolean> {
	try {
		const res = await dispatcher.execute('COMPRESS', ['DEFLATE']);
		return res.tagged.status === 'OK';
	} catch {
		// Server rejected with NO/BAD — compression unavailable, not an error.
		return false;
	}
}
