import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { createFts } from './create_fts.ts';
import { createTables } from './create_tables.ts';

describe('createFts', () => {
	it('creates FTS and triggers fire on insert/delete', () => {
		const db = new DatabaseSync(':memory:');
		createTables(db);
		createFts(db);

		db.prepare(`INSERT INTO accounts (host, port, username) VALUES ('h', 993, 'u')`).run();
		const aid = Number((db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id);
		db.prepare(`INSERT INTO folders (account_id, path) VALUES (?, 'INBOX')`).run(aid);
		const fid = Number((db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id);
		db.prepare(
			`INSERT INTO messages (folder_id, uid, subject, "from", "to", flags, labels)
			 VALUES (?, 1, 'hello world', ?, '[]', '[]', '[]')`,
		).run(fid, JSON.stringify({ address: 'a@b.com' }));

		const mid = Number((db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id);
		const count = db.prepare('SELECT COUNT(*) as c FROM messages_fts').get() as { c: number };
		assert.equal(count.c, 1);

		db.prepare('DELETE FROM messages WHERE id = ?').run(mid);
		const after = db.prepare('SELECT COUNT(*) as c FROM messages_fts').get() as { c: number };
		assert.equal(after.c, 0);
		db.close();
	});
});
