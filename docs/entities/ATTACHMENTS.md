# Attachments

An attachment is a locally cached MIME part with binary data.

Like bodies, attachments are not fetched during initial sync. Attachment
metadata (filename, MIME type, size) is derived from the `bodyStructure`
column on the message and stored without requiring the content bytes. The
binary data is fetched separately on demand.

## Schema

Stored in the `attachments` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `messageId` | INTEGER | Foreign key → `messages.id` |
| `partPath` | TEXT | IMAP BODYSTRUCTURE part path (e.g. `1`, `2`, `1.2`) |
| `filename` | TEXT | Decoded filename from `Content-Disposition` or `Content-Type name` |
| `mimeType` | TEXT | Full MIME type (`image/png`, `application/pdf`, etc.) |
| `encoding` | TEXT | Transfer encoding (`base64`, `quoted-printable`, `7bit`, etc.) |
| `size` | INTEGER | Decoded size in bytes (from BODYSTRUCTURE) |
| `inline` | INTEGER | `1` for `Content-Disposition: inline` parts, `0` for `attachment` |
| `contentId` | TEXT | `Content-ID:` value for inline embedded images |
| `data` | BLOB | Decoded binary content (null until fetched) |
| `fetchedAt` | TEXT | ISO timestamp when binary data was fetched (null if not yet fetched) |

## Part Path

The `partPath` value is the IMAP BODYSTRUCTURE section number used to fetch
this specific part:

- `1` — first top-level part
- `2` — second top-level part
- `1.2` — second part inside the first multipart part

This path is passed directly to the `FETCH` command as the section specifier.

## Metadata Without Content

Attachment metadata (all columns except `data` and `fetchedAt`) is populated
during sync from the decoded BODYSTRUCTURE. This means:

- `mailbox.read.listAttachments(folder, uid)` works without any body fetch
- `hasAttachments` on the message row is set during sync, not during body fetch
- Content bytes are only pulled when `mailbox.read.getAttachment()` is called

## Local Store Operations

```ts
import {
  upsertAttachment,
  getAttachment,
  listAttachments,
  deleteAttachment,
  deleteAttachmentsByMessage,
} from '@ghostpaw/email';

// Insert or update metadata (no data yet).
const meta = upsertAttachment(db, {
  messageId: message.id,
  partPath: '2',
  filename: 'contract.pdf',
  mimeType: 'application/pdf',
  encoding: 'base64',
  size: 142500,
  inline: 0,
  contentId: null,
});

// List all attachment metadata for a message (fast, no network needed).
const metas = listAttachments(db, message.id);

// Get one attachment (metadata only; data may be null).
const att = getAttachment(db, message.id, '2');

// Fetch content through the read surface (triggers IMAP FETCH if needed).
const withData = await mailbox.read.getAttachment('INBOX', uid, '2');
// withData.data is a Buffer with the decoded bytes.

deleteAttachment(db, message.id, '2');
deleteAttachmentsByMessage(db, message.id);
```

## Inline Attachments

`inline: 1` indicates a `Content-Disposition: inline` part — typically an
embedded image in an HTML email. These parts have a `contentId` value that
matches a `cid:` URI in the HTML body.

When rendering HTML with embedded images, replace `cid:<contentId>` URIs with
data URIs or served URLs derived from the fetched attachment bytes.

## Invariants

- Multiple attachment rows can exist per `messages.id` (one per MIME part)
- `partPath` is unique per `(messageId, partPath)` combination
- `data` is null until the binary bytes have been fetched from the server
- All attachment rows for a message are deleted when the parent message is deleted
- `size` reflects the decoded (not encoded) byte count, as reported by BODYSTRUCTURE
