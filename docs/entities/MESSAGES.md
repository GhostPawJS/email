# Messages

A message is a locally cached email header record tied to one folder and one UID.

The message row stores all RFC 2822 and IMAP envelope fields. Body content
lives in a separate `bodies` row and is fetched on demand.

## Schema

Stored in the `messages` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `folderId` | INTEGER | Foreign key → `folders.id` |
| `uid` | INTEGER | IMAP UID for this message in this folder |
| `messageId` | TEXT | RFC 2822 `Message-ID:` header |
| `inReplyTo` | TEXT | RFC 2822 `In-Reply-To:` header |
| `references` | TEXT | JSON-encoded `string[]` of `References:` header values |
| `threadId` | TEXT | Computed JWZ thread identifier |
| `from` | TEXT | JSON-encoded `Address` (`{ name?, address }`) |
| `to` | TEXT | JSON-encoded `Address[]` |
| `cc` | TEXT | JSON-encoded `Address[]` |
| `bcc` | TEXT | JSON-encoded `Address[]` |
| `replyTo` | TEXT | JSON-encoded `Address` |
| `envelopeFrom` | TEXT | JSON-encoded `Address` (SMTP envelope sender) |
| `envelopeTo` | TEXT | JSON-encoded `Address[]` (SMTP envelope recipients) |
| `subject` | TEXT | Decoded subject line |
| `date` | TEXT | ISO string from RFC 2822 `Date:` header |
| `receivedAt` | TEXT | Local ingest timestamp |
| `flags` | TEXT | JSON-encoded `string[]` of IMAP flags |
| `labels` | TEXT | JSON-encoded `string[]` of IMAP keywords (Gmail labels) |
| `size` | INTEGER | Message size in bytes (IMAP RFC822.SIZE) |
| `bodyStructure` | TEXT | JSON-encoded `BodyPart` MIME tree |
| `hasAttachments` | INTEGER | `1` if any attachment part is present |
| `modSeq` | INTEGER | HIGHESTMODSEQ at last flag sync (CONDSTORE) |

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

`threadId` is computed by the sync engine using the JWZ algorithm applied to
the `References` and `In-Reply-To` headers. It is a stable string identifier
for the conversation tree. Messages with the same `threadId` belong to the
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

```ts
import { insertMessage, getMessageById, getMessageByUid, listMessages, updateMessageFlags, deleteMessage, searchMessages } from '@ghostpaw/email';

const message = insertMessage(db, { folderId, uid, subject, from, to, flags, ... });
const byId = getMessageById(db, message.id);
const byUid = getMessageByUid(db, folderId, uid);
const all = listMessages(db, folderId, { limit: 50, sort: 'date', order: 'desc' });

updateMessageFlags(db, message.id, ['\\Seen', '\\Flagged']);

const results = searchMessages(db, 'quarterly report');
deleteMessage(db, message.id);
```

Flag changes through the write surface also send IMAP STORE commands and
update modSeq:

```ts
await mailbox.write.markRead('INBOX', [uid]);
await mailbox.write.star('INBOX', [uid]);
await mailbox.write.markAnswered('INBOX', [uid]);
```

## Invariants

- One `messages` row per `(folderId, uid)` combination
- Deleting a message cascades to its body and attachments
- `threadId` is derived, not user-supplied; it is always assigned by the sync engine
- `bodyStructure` is a decoded BodyPart tree (from IMAP BODYSTRUCTURE response), not the raw IMAP list
- All JSON-encoded columns (`references`, `flags`, `labels`, etc.) are always valid JSON arrays or objects; null means the value is unknown or absent
