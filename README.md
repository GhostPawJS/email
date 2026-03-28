# @ghostpaw/email

A standalone email suite core for Node.js, built on SQLite.

Email treats accounts, mailboxes, messages, local sync jobs, and transport seams as one coherent package instead of a grab bag of adapters. This foundation intentionally ships with hello-world behavior only: the schema is real, the package surface is stable, and the IMAP/SMTP operations are explicit stubs ready for deeper protocol work.

## Install

```bash
npm install @ghostpaw/email
```

Requires **Node.js 24+**.

## Quick Start

```ts
import { DatabaseSync } from 'node:sqlite';
import { initEmailTables, read, write } from '@ghostpaw/email';

const db = new DatabaseSync(':memory:');
initEmailTables(db);

const account = write.createAccount(db, {
	name: 'Primary',
	emailAddress: 'primary@example.com',
});

const mailbox = write.registerMailbox(db, {
	accountId: account.id,
	name: 'INBOX',
	role: 'inbox',
});

write.ingestMessage(db, {
	mailboxId: mailbox.id,
	subject: 'Hello world',
	preview: 'The current foundation stores local message metadata.',
});

const messages = read.listMessages(db);
const syncResult = write.syncImapAccount({ accountId: account.id });
```

## Package Surface

```ts
import {
	initEmailTables,
	read,
	write,
	tools,
	skills,
	soul,
} from '@ghostpaw/email';
```

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

The repo is pinned to **Node 24.14.0** via `.nvmrc`, `.node-version`, `.tool-versions`, `mise.toml`, and Volta.
