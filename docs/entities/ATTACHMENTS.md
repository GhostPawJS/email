# Attachments

An attachment is a locally cached MIME part with binary data.

Like bodies, attachments are not fetched during initial sync. Attachment
metadata (filename, MIME type, size) is derived from the `body_structure`
column on the message and stored without requiring the content bytes. The
binary data is fetched separately on demand.

## Schema

Stored in the `attachments` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `message_id` | INTEGER | Foreign key → `messages.id` |
| `filename` | TEXT | Decoded filename from `Content-Disposition` or `Content-Type name` |
| `mime_type` | TEXT | Full MIME type (`image/png`, `application/pdf`, etc.) |
| `size` | INTEGER | Decoded size in bytes (from BODYSTRUCTURE) |
| `content_id` | TEXT | `Content-ID:` value for inline embedded images |
| `part_path` | TEXT | IMAP BODYSTRUCTURE part path (e.g. `1`, `2`, `1.2`) |
| `inline_flag` | INTEGER | `1` for `Content-Disposition: inline` parts, `0` for `attachment` |
| `data` | BLOB | Decoded binary content (null until fetched) |

## Part Path

The `part_path` value is the IMAP BODYSTRUCTURE section number used to fetch
this specific part:

- `1` — first top-level part
- `2` — second top-level part
- `1.2` — second part inside the first multipart part

This path is passed directly to the `FETCH` command as the section specifier.

## Metadata Without Content

Attachment metadata (all columns except `data`) is populated during sync from
the decoded BODYSTRUCTURE. This means:

- `mailbox.read.listAttachments(folder, uid)` works without any body fetch
- `has_attachments` on the message row is set during sync, not during body fetch
- Content bytes are only pulled when `mailbox.read.getAttachment()` is called

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

// Insert metadata (no data yet).
const meta = store.insertAttachment(db, {
  messageId: message.id,
  partPath: '2',
  filename: 'contract.pdf',
  mimeType: 'application/pdf',
  size: 142500,
  inline: false,
  contentId: null,
});

// List all attachment metadata for a message (fast, no network needed).
const metas = store.listAttachments(db, message.id);

// Get one attachment's data by message and part path.
const data = store.getAttachmentData(db, message.id, '2');

// Update attachment data after fetching from server.
store.updateAttachmentData(db, message.id, '2', buffer);
```

Fetch content through the read surface (triggers IMAP FETCH if needed):

```ts
const withData = await mailbox.read.getAttachment('INBOX', uid, '2');
// withData.data is a Buffer with the decoded bytes.
```

## Inline Attachments

`inline_flag: 1` indicates a `Content-Disposition: inline` part — typically an
embedded image in an HTML email. These parts have a `content_id` value that
matches a `cid:` URI in the HTML body.

When rendering HTML with embedded images, replace `cid:<contentId>` URIs with
data URIs or served URLs derived from the fetched attachment bytes.

## Invariants

- Multiple attachment rows can exist per `messages.id` (one per MIME part)
- `part_path` should be unique per message (enforced at the application level)
- `data` is null until the binary bytes have been fetched from the server
- All attachment rows for a message are deleted when the parent message is deleted (ON DELETE CASCADE)
- `size` reflects the decoded (not encoded) byte count, as reported by BODYSTRUCTURE
