import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectFolderRole } from './folder_role.ts';

describe('detectFolderRole', () => {
	it('detects via SPECIAL-USE flag', () => {
		assert.equal(detectFolderRole(['\\Sent'], 'SomeName'), 'sent');
		assert.equal(detectFolderRole(['\\Drafts'], 'x'), 'drafts');
		assert.equal(detectFolderRole(['\\Trash'], 'x'), 'trash');
		assert.equal(detectFolderRole(['\\Junk'], 'x'), 'junk');
		assert.equal(detectFolderRole(['\\Archive'], 'x'), 'archive');
		assert.equal(detectFolderRole(['\\All'], 'x'), 'all');
	});

	it('detects inbox by name', () => {
		assert.equal(detectFolderRole([], 'INBOX'), 'inbox');
	});

	it('detects English folder names', () => {
		assert.equal(detectFolderRole([], 'Sent'), 'sent');
		assert.equal(detectFolderRole([], 'Sent Items'), 'sent');
		assert.equal(detectFolderRole([], 'Drafts'), 'drafts');
		assert.equal(detectFolderRole([], 'Trash'), 'trash');
		assert.equal(detectFolderRole([], 'Deleted Items'), 'trash');
		assert.equal(detectFolderRole([], 'Junk'), 'junk');
		assert.equal(detectFolderRole([], 'Spam'), 'junk');
		assert.equal(detectFolderRole([], 'Archive'), 'archive');
	});

	it('detects German folder names', () => {
		assert.equal(detectFolderRole([], 'Gesendet'), 'sent');
		assert.equal(detectFolderRole([], 'Entwürfe'), 'drafts');
		assert.equal(detectFolderRole([], 'Papierkorb'), 'trash');
		assert.equal(detectFolderRole([], 'Spam'), 'junk');
		assert.equal(detectFolderRole([], 'Archiv'), 'archive');
	});

	it('returns null for unknown', () => {
		assert.equal(detectFolderRole([], 'MyCustomFolder'), null);
		assert.equal(detectFolderRole([], 'Work'), null);
	});

	it('is case-insensitive on names', () => {
		assert.equal(detectFolderRole([], 'SENT'), 'sent');
		assert.equal(detectFolderRole([], 'drafts'), 'drafts');
	});
});
