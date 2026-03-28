import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { negotiateExtensions, parseCapabilities } from './capabilities.ts';

describe('parseCapabilities', () => {
	it('parses Gmail capability string', () => {
		const caps = parseCapabilities(
			'* CAPABILITY IMAP4rev1 CONDSTORE QRESYNC IDLE MOVE UIDPLUS X-GM-EXT-1',
		);
		assert.ok(caps.has('CONDSTORE'));
		assert.ok(caps.has('QRESYNC'));
		assert.ok(caps.has('IDLE'));
		assert.ok(caps.has('MOVE'));
		assert.ok(caps.has('X-GM-EXT-1'));
	});

	it('parses capability from response code', () => {
		const caps = parseCapabilities('* OK [CAPABILITY IMAP4rev1 CONDSTORE] Gimap ready');
		assert.ok(caps.has('CONDSTORE'));
	});
});

describe('negotiateExtensions', () => {
	it('detects all-true', () => {
		const caps = new Set([
			'CONDSTORE',
			'QRESYNC',
			'MOVE',
			'UIDPLUS',
			'COMPRESS=DEFLATE',
			'IDLE',
			'SORT',
			'THREAD=REFERENCES',
			'SPECIAL-USE',
			'NAMESPACE',
			'ID',
			'QUOTA',
			'LITERAL+',
			'ESEARCH',
			'LIST-STATUS',
			'BINARY',
			'UNSELECT',
		]);
		const ext = negotiateExtensions(caps);
		assert.ok(ext.condstore);
		assert.ok(ext.qresync);
		assert.ok(ext.move);
		assert.ok(ext.uidplus);
		assert.ok(ext.compress);
		assert.ok(ext.idle);
		assert.ok(ext.sort);
		assert.ok(ext.thread);
		assert.ok(ext.specialUse);
		assert.ok(ext.namespace);
		assert.ok(ext.id);
		assert.ok(ext.quota);
		assert.ok(ext.literalPlus);
		assert.ok(ext.esearch);
		assert.ok(ext.listStatus);
		assert.ok(ext.binary);
		assert.ok(ext.unselect);
		assert.equal(ext.appendLimit, null);
	});

	it('detects all-false', () => {
		const ext = negotiateExtensions(new Set(['IMAP4rev1']));
		assert.equal(ext.condstore, false);
		assert.equal(ext.qresync, false);
		assert.equal(ext.idle, false);
		assert.equal(ext.appendLimit, null);
	});
});
