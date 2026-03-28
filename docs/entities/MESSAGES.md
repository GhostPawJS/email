# Messages

A message is a locally cached email header record tied to one folder and one UID.

The message row stores all RFC 2822 and IMAP envelope fields. Body content
lives in a separate `bodies` row and is fetched on demand.

## Schema

Stored in the `messages` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `folder_id` | INTEGER | Foreign key → `folders.id` |
| `uid` | INTEGER | IMAP UID for this message in this folder |
| `message_id` | TEXT | RFC 2822 `Message-ID:` header |
| `in_reply_to` | TEXT | RFC 2822 `In-Reply-To:` header |
| `references` | TEXT | JSON-encoded `string[]` of `References:` header values |
| `thread_id` | TEXT | Computed JWZ thread identifier |
| `subject` | TEXT | Decoded subject line |
| `from` | TEXT | JSON-encoded `Address` (`{ name?, address }`) |
| `to` | TEXT | JSON-encoded `Address[]` |
| `cc` | TEXT | JSON-encoded `Address[]` |
| `bcc` | TEXT | JSON-encoded `Address[]` |
| `reply_to` | TEXT | JSON-encoded `Address` |
| `envelope_from` | TEXT | JSON-encoded `Address` (SMTP envelope sender) |
| `envelope_to` | TEXT | JSON-encoded `Address[]` (SMTP envelope recipients) |
| `date` | TEXT | ISO string from RFC 2822 `Date:` header |
| `received_at` | TEXT | Local ingest timestamp |
| `flags` | TEXT | JSON-encoded `string[]` of IMAP flags, default `'[]'` |
| `labels` | TEXT | JSON-encoded `string[]` of IMAP keywords (Gmail labels), default `'[]'` |
| `size` | INTEGER | Message size in bytes (IMAP RFC822.SIZE) |
| `body_structure` | TEXT | JSON-encoded `BodyPart` MIME tree |
| `has_attachments` | INTEGER | `1` if any attachment part is present, default `0` |
| `mod_seq` | INTEGER | HIGHESTMODSEQ at last flag sync (CONDSTORE) |

## Flags

IMAP system flags follow RFC 3501 semantics:

| Flag | Meaning |
|---|---|
| `\Seen` | Read by at least one client |
| `\Flagged` | Starred / important |
| `\Answered` | A reply was sent |
| `\Deleted` | Marked for expunge (not yet removed) |
| `\Draft` | A draft message |

User keywords (Gmail labels, custom tags) are stored in `labels` separately
from system flags.

## Thread ID

`thread_id` is computed by the sync engine using the JWZ algorithm applied to
the `references` and `in_reply_to` headers. It is a stable string identifier
for the conversation tree. Messages with the same `thread_id` belong to the
same thread.

Thread IDs are re-computed during sync. They are not stored in a separate
table — they are columns on the message row, used for grouping at read time.

## FTS5 Index

The `messages_fts` table is a standalone FTS5 virtual table populated during
sync. It indexes `subject`, `from_address`, `preview_text`, and `body_text`
(from the body row when available). It supports:

- Boolean operators (`AND`, `OR`, `NOT`)
- Phrase queries (`"exact phrase"`)
- Prefix queries (`subject*`)
- Column-scoped queries (`subject:report`)

The FTS index is managed by the sync engine. It is not kept in sync by
triggers — it is populated and updated during `network.sync()` passes.

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

const message = store.insertMessage(db, { folderId, uid, subject, from, to, flags, ... });
const byId = store.getMessageById(db, message.id);
const byUid = store.getMessage(db, folderId, uid);
const all = store.listMessages(db, folderId, { limit: 50, sort: 'date', order: 'desc' });

store.updateMessageFlags(db, message.id, ['\\Seen', '\\Flagged']);

const results = store.searchMessages(db, 'quarterly report');
store.deleteMessages(db, [message.id]);
```

Batch insertion for sync (with `INSERT OR IGNORE` semantics for idempotency):

```ts
store.insertMessagesBatch(db, [input1, input2, input3]);
```

Flag changes through the write surface also send IMAP STORE commands and
update `mod_seq`:

```ts
await mailbox.write.markRead('INBOX', [uid]);
await mailbox.write.star('INBOX', [uid]);
await mailbox.write.markAnswered('INBOX', [uid]);
```

## Invariants

- One `messages` row per `(folder_id, uid)` combination
- Deleting a message cascades to its body and attachments
- `thread_id` is derived, not user-supplied; it is always assigned by the sync engine
- `body_structure` is a decoded BodyPart tree (from IMAP BODYSTRUCTURE response), not the raw IMAP list
- All JSON-encoded columns (`references`, `flags`, `labels`, etc.) are always valid JSON arrays or objects; null means the value is unknown or absent
