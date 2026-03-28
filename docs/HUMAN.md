# Human Usage

This document is for developers using `@ghostpaw/email` directly in code.

It assumes a human developer or operator is working with the `Mailbox` class
and the typed surfaces it exposes: `read`, `write`, and `network`.

If you are wiring this package into an agent or LLM harness, read `LLM.md`
instead. That document covers the soul, tools, and skills layers.

## What This Surface Is For

`@ghostpaw/email` is strongest when used as a complete mailbox engine, not as
a thin IMAP wrapper.

A complete human usage pattern looks like:

- initialise the local schema once
- construct a `Mailbox` with account config
- connect and sync to materialise the local cache
- read from the cache for fast, offline-capable access
- write flag changes and composed messages back through the protocol
- watch for new messages via IDLE when staying connected

## Setup

```ts
import { DatabaseSync } from 'node:sqlite';
import { Mailbox, initSchema } from '@ghostpaw/email';
import type { EmailConfig } from '@ghostpaw/email';

const db = new DatabaseSync('mail.db');
initSchema(db); // idempotent — safe to call on every startup

const config: EmailConfig = {
  imap: {
    host: 'imap.example.com',
    port: 993,
    tls: true,
    auth: { type: 'plain', username: 'user@example.com', password: 'secret' },
  },
  smtp: {
    host: 'smtp.example.com',
    port: 465,
    tls: true,
    auth: { type: 'plain', username: 'user@example.com', password: 'secret' },
  },
};

const mailbox = new Mailbox({ db, config });
```

For OAuth2 providers (Gmail, Outlook), use the `xoauth2` or `oauthbearer`
auth type with a `tokenRefresh` callback:

```ts
const config: EmailConfig = {
  imap: {
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    auth: {
      type: 'xoauth2',
      username: 'user@gmail.com',
      accessToken: currentToken,
      tokenRefresh: async () => refreshedToken,
    },
  },
  // ...
};
```

## Connection Lifecycle

```ts
// Connect and authenticate (negotiates capabilities, COMPRESS=DEFLATE, etc.)
await mailbox.network.connect();

// Sync all subscribed folders (incremental by default).
const result = await mailbox.network.sync();
console.log(`${result.totalNew} new, ${result.totalExpunged} expunged`);

// Refresh the folder list from the server (detects new folders, role changes).
const folders = await mailbox.network.refreshFolders();

// Disconnect gracefully.
await mailbox.network.disconnect();

// Reconnect after a failure (exponential back-off, up to 5 attempts).
await mailbox.network.reconnect();
```

## Reading Local State

All `read.*` calls are synchronous and operate against the local cache. No
network is required.

### Folders

```ts
const folders = mailbox.read.folders();
// [{ id, accountId, path, role, uidValidity, uidNext, unseenCount, ... }]

const status = mailbox.read.folderStatus('INBOX');
// { messages, unseen, uidNext, uidValidity, highestModSeq }
```

### Messages

```ts
const messages = mailbox.read.messages('INBOX', {
  limit: 50,
  sort: 'date',
  order: 'desc',
});
// Returns Message[] — header-only, no body content.
```

### Message Detail (with body)

`getMessage` is async because it fetches the body on demand if not cached:

```ts
const detail = await mailbox.read.getMessage('INBOX', uid);
// Returns MessageDetail — includes textPlain, textHtml, attachments[].
```

### Threads

```ts
const threads = mailbox.read.threads('INBOX', { limit: 20 });
// Returns Thread[] — each thread has messages[] sorted by date.

const thread = mailbox.read.getThread('thread-id-string');
// Returns one Thread with full ThreadMessage[] (includes depth for nesting).
```

### Attachments

```ts
const metas = mailbox.read.listAttachments('INBOX', uid);
// Returns AttachmentMeta[] — filename, mimeType, size, partPath, inline.

// Fetch binary bytes (async — triggers IMAP FETCH if not cached).
const att = await mailbox.read.getAttachment('INBOX', uid, '2');
// Returns Attachment — AttachmentMeta + data: Buffer.
```

### Search

```ts
const results = mailbox.read.search('quarterly report', {
  folder: 'INBOX',
  since: new Date('2026-01-01'),
  unreadOnly: true,
  limit: 25,
});
// Returns Message[] matching FTS5 query.
```

### Stats

```ts
const stats = mailbox.read.stats();
// { folders: [{ path, role, total, unread }], totalMessages, totalUnread,
//   lastSyncedAt, storageUsed }
```

## Remote Operations

Some read operations require a live IMAP session:

```ts
// Fetch a message body from the server (useful when local cache is stale).
const body = await mailbox.network.fetchBody('INBOX', uid);

// Fetch a specific MIME attachment part.
const att = await mailbox.network.fetchAttachment('INBOX', uid, '1.2');

// Run IMAP SEARCH on the server (returns UIDs).
const uids = await mailbox.network.searchRemote('INBOX', {
  unseen: true,
  since: new Date('2026-01-01'),
});
```

## Writing Flag Changes

All `write.*` calls are async. Flag operations send IMAP STORE commands and
update the local cache on success.

```ts
// Mark as read / unread.
await mailbox.write.markRead('INBOX', [42, 43]);
await mailbox.write.markUnread('INBOX', [42]);

// Star / unstar (sets/clears \Flagged).
await mailbox.write.star('INBOX', [42]);
await mailbox.write.unstar('INBOX', [42]);

// Mark as answered (sets \Answered flag).
await mailbox.write.markAnswered('INBOX', [42]);
```

## Organizing Messages

```ts
// Copy to another folder (leaves original in place).
await mailbox.write.copyTo('INBOX', [42], 'Archive/2026');

// Move (COPY + STORE \Deleted + EXPUNGE).
await mailbox.write.moveTo('INBOX', [42], 'Archive/2026');

// Archive to server-detected Archive folder.
await mailbox.write.archive('INBOX', [42]);

// Trash to server-detected Trash folder.
await mailbox.write.trash('INBOX', [42]);

// Move to Junk.
await mailbox.write.moveToJunk('INBOX', [42]);

// Mark as not junk and restore.
await mailbox.write.markNotJunk('Junk', [42], 'INBOX');
```

### Labels (Gmail and compatible)

```ts
await mailbox.write.addLabels('INBOX', [42], ['receipts', 'finance']);
await mailbox.write.removeLabels('INBOX', [42], ['receipts']);
await mailbox.write.setLabels('INBOX', [42], ['finance']); // replaces all
```

## Composing And Sending

### Direct send

```ts
const { messageId } = await mailbox.write.send({
  to: [{ address: 'bob@example.com' }],
  subject: 'Project update',
  textPlain: 'Here is the latest status.',
  attachments: [
    { filename: 'status.pdf', mimeType: 'application/pdf', data: pdfBuffer },
  ],
});
```

### Reply (preserves threading headers)

```ts
const { messageId } = await mailbox.write.reply('INBOX', uid, {
  text: 'Thanks, the timeline works for me.',
});
// Automatically sets In-Reply-To, References, and prepends attribution + quoted body.
```

### Forward

```ts
// Inline forward (prepends forwarded-message header block + original body).
const { messageId } = await mailbox.write.forward('INBOX', uid, {
  to: [{ address: 'carol@example.com' }],
  mode: 'inline',
  text: 'FYI — see below.',
});

// Attachment forward (wraps original as .eml attachment).
await mailbox.write.forward('INBOX', uid, {
  to: [{ address: 'carol@example.com' }],
  mode: 'attachment',
});
```

### Draft lifecycle

```ts
// Save a draft to the Drafts folder.
const { uid: draftUid } = await mailbox.write.saveDraft({
  to: [{ address: 'bob@example.com' }],
  subject: 'Work in progress',
  textPlain: 'Draft body.',
});

// Update the draft.
const { uid: newUid } = await mailbox.write.updateDraft(draftUid, {
  textPlain: 'Revised body.',
});

// Send the draft (SMTP send + append to Sent + expunge from Drafts).
const { messageId } = await mailbox.write.sendDraft(newUid);
```

### Export and import

```ts
// Export a message as raw RFC 2822 bytes.
const eml: Buffer = await mailbox.write.exportEml('INBOX', uid);

// Import a .eml file into a folder.
const { uid: importedUid } = await mailbox.write.importEml('Archive', eml, ['\\Seen']);
```

## Folder Management

```ts
await mailbox.write.createFolder('Archive/2026');
await mailbox.write.renameFolder('Archive/2026', 'Archive/2026-Q1');
await mailbox.write.deleteFolder('Archive/2026-Q1');
await mailbox.write.subscribeFolder('Updates');
await mailbox.write.unsubscribeFolder('Updates');
```

Always call `mailbox.network.refreshFolders()` after structural folder changes
to update the local folder cache.

## Watch (IDLE)

`watch` is an async generator. It yields `WatchEvent` values as the server
pushes new EXISTS, EXPUNGE, or FLAGS notifications:

```ts
const controller = new AbortController();

for await (const event of mailbox.network.watch({ signal: controller.signal })) {
  if (event.type === 'new') {
    console.log(`${event.messages.length} new messages in ${event.folder}`);
  }
  if (event.type === 'flags') {
    console.log(`Flags changed for uid ${event.uid} in ${event.folder}`);
  }
  if (event.type === 'expunge') {
    console.log(`Message ${event.uid} expunged from ${event.folder}`);
  }
}

// Stop watching.
controller.abort();
```

## Sync Options

```ts
// Incremental sync of all subscribed folders (QRESYNC when available).
await mailbox.network.sync();

// Sync only specific folders.
await mailbox.network.sync({ folders: ['INBOX', 'Sent'] });

// Fetch missing bodies during sync.
await mailbox.network.sync({ bodies: 'missing' });

// Fetch all bodies (use sparingly — can be slow on large mailboxes).
await mailbox.network.sync({ bodies: 'all' });
```

## Error Handling

The engine raises typed errors:

- `EmailAuthError`: authentication failure — fix credentials, do not retry blindly
- `EmailConnectionError`: network / TLS failure — retry with `reconnect()`
- `EmailProtocolError`: server-side NO or BAD response to a command
- `EmailNotFoundError`: requested message or folder does not exist locally
- `EmailUnsupportedError`: server does not support the requested extension

```ts
import { EmailAuthError, EmailConnectionError } from '@ghostpaw/email';

try {
  await mailbox.network.connect();
} catch (err) {
  if (err instanceof EmailAuthError) {
    // Credential problem — do not retry.
    console.error('Authentication failed:', err.message);
  } else if (err instanceof EmailConnectionError) {
    // Network problem — retry once.
    await mailbox.network.reconnect();
  }
}
```

## The Human Operating Loop

A disciplined human developer drives the mailbox through derived views, not
through memory or ad-hoc queries:

1. Connect and sync on startup to materialise the local cache.
2. Use `read.folders()` and `read.messages()` to build views from local state.
3. Use `read.getMessage()` on demand when body content is needed.
4. Use `write.*` for intentional mutations — flag changes, sends, organise.
5. Use `network.watch()` for real-time updates when staying connected.
6. Use `network.sync()` periodically to pull state changes when IDLE is not in use.
7. Use `network.reconnect()` on connection loss, then re-sync.

Local reads are always fast. Network operations are always explicit.
