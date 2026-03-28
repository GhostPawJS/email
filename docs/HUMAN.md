# Human API

`@ghostpaw/email` currently exposes a small direct-code API for the foundational local email model.

## Setup

```ts
import { DatabaseSync } from 'node:sqlite';
import { initEmailTables } from '@ghostpaw/email';

const db = new DatabaseSync(':memory:');
initEmailTables(db);
```

## Write Surface

Use the `write` namespace for foundational mutations:

```ts
import { write } from '@ghostpaw/email';

const account = write.createAccount(db, {
	name: 'Primary',
	emailAddress: 'primary@example.com',
});

const mailbox = write.registerMailbox(db, {
	accountId: account.id,
	name: 'INBOX',
	role: 'inbox',
});

const message = write.ingestMessage(db, {
	mailboxId: mailbox.id,
	subject: 'Hello',
	preview: 'A local-first hello-world message.',
});

const syncJob = write.createSyncJob(db, {
	accountId: account.id,
	direction: 'pull',
});
```

Transport functions are present but still stubbed:

```ts
write.syncImapAccount({ accountId: account.id });
write.sendSmtpMessage({
	accountId: account.id,
	to: ['team@example.com'],
	subject: 'Status',
	textBody: 'This foundation only stubs SMTP sends for now.',
});
```

## Read Surface

Use the `read` namespace for basic local inspection:

```ts
import { read } from '@ghostpaw/email';

const accounts = read.listAccounts(db);
const mailboxes = read.listMailboxes(db);
const messages = read.listMessages(db);
const syncStatus = read.getSyncStatus(db, account.id);
```

## Current Boundaries

- IMAP sync is a deterministic stub, not a real protocol client.
- SMTP send is a deterministic stub, not a real delivery implementation.
- Local storage currently covers accounts, mailboxes, messages, and sync jobs only.
- The package is designed to grow without changing the family-style package surface.
