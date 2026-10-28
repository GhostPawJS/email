import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { loadAttachments } from './attachments.ts';
import { CliError } from './errors.ts';

const dir = mkdtempSync(join(tmpdir(), 'email-attach-'));
after(() => rmSync(dir, { recursive: true, force: true }));

function rejects(paths: string, pattern: RegExp): void {
	assert.throws(
		() => loadAttachments(paths),
		(err: unknown) =>
			err instanceof CliError && err.code === 'invalid_flag_value' && pattern.test(err.message),
	);
}

describe('loadAttachments', () => {
	it('loads regular files with filename and MIME type', () => {
		const pdf = join(dir, 'report.pdf');
		const bin = join(dir, 'data.bin');
		writeFileSync(pdf, 'pdf-bytes');
		writeFileSync(bin, 'raw');
		const out = loadAttachments(`${pdf}, ${bin}`);
		assert.equal(out.length, 2);
		assert.deepEqual(out[0], {
			filename: 'report.pdf',
			content: Buffer.from('pdf-bytes'),
			mimeType: 'application/pdf',
		});
		assert.deepEqual(out[1], { filename: 'data.bin', content: Buffer.from('raw') });
	});

	it('follows symlinks to regular files', () => {
		const target = join(dir, 'target.txt');
		const link = join(dir, 'link.txt');
		writeFileSync(target, 'hello');
		symlinkSync(target, link);
		const [att] = loadAttachments(link);
		assert.equal(att?.filename, 'link.txt');
		assert.equal(att?.content.toString(), 'hello');
	});

	it('rejects directories', () => {
		const sub = join(dir, 'folder');
		mkdirSync(sub);
		rejects(sub, /is a directory/);
	});

	it('rejects symlinks to directories', () => {
		const sub = join(dir, 'folder2');
		const link = join(dir, 'folder-link');
		mkdirSync(sub);
		symlinkSync(sub, link);
		rejects(link, /is a directory/);
	});

	it('rejects character devices', { skip: process.platform === 'win32' }, () => {
		rejects('/dev/null', /not a regular file/);
	});

	it('rejects FIFOs', { skip: process.platform === 'win32' }, () => {
		const fifo = join(dir, 'pipe');
		try {
			execFileSync('mkfifo', [fifo]);
		} catch {
			return;
		}
		rejects(fifo, /not a regular file/);
	});

	it('rejects missing files and empty lists', () => {
		rejects(join(dir, 'missing.pdf'), /file not found/);
		rejects(' , ', /at least one file path/);
	});
});
