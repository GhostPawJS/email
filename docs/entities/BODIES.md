# Bodies

A body is the decoded content of one message, stored separately from the
header record.

Bodies are not materialized during initial sync. They are fetched on demand
and cached locally for subsequent reads.

## Schema

Stored in the `bodies` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `messageId` | INTEGER | Foreign key → `messages.id` (one-to-one) |
| `textPlain` | TEXT | Decoded `text/plain` part |
| `textHtml` | TEXT | Decoded `text/html` part |
| `raw` | BLOB | Full RFC 2822 message bytes |
| `fetchedAt` | TEXT | ISO timestamp when body was fetched |

## On-Demand Fetch Model

The MIME body is not fetched during the initial sync pass to keep sync fast and
bandwidth-efficient. The workflow is:

1. `read.getMessage(folder, uid)` checks whether a `bodies` row exists.
2. If absent, it triggers `network.fetchBody(folder, uid)` transparently.
3. The fetched bytes are decoded via the MIME parser and stored in `bodies`.
4. Subsequent calls to `read.getMessage` return the cached body immediately.

The same pattern applies to `read.getAttachment()`.

## MIME Decoding

The `textPlain` and `textHtml` columns contain decoded and transfer-decoded
text:

- Quoted-Printable and Base64 Content-Transfer-Encoding are decoded
- RFC 2047 encoded-word headers (=?charset?encoding?text?=) are decoded
- Character set conversion is applied via `TextDecoder`

When only `textHtml` is present, `textPlain` is derived from it via the
`htmlToText` utility (strips tags, normalises whitespace).

## Relationship To bodyStructure

The `bodyStructure` column on the `messages` row holds the full decoded
IMAP BODYSTRUCTURE response as a `BodyPart` tree. The `bodies` row holds the
actual content bytes. Together they give a complete picture of the message
structure without requiring re-parsing.

## Local Store Operations

```ts
import { upsertBody, getBody, deleteBody } from '@ghostpaw/email';

const body = upsertBody(db, {
  messageId: message.id,
  textPlain: 'Hello world',
  textHtml: '<p>Hello world</p>',
  raw: rawBuffer,
});

const fetched = getBody(db, message.id);
deleteBody(db, message.id);
```

Body access through the read surface handles the fetch-on-demand cycle:

```ts
// Returns MessageDetail including textPlain, textHtml, and attachment metas.
// Fetches from server if body is not cached.
const detail = await mailbox.read.getMessage('INBOX', uid);
```

## Invariants

- At most one `bodies` row per `messages.id`
- `raw` is the verbatim RFC 2822 bytes from the IMAP FETCH RFC822 response
- `textPlain` and `textHtml` may both be null for messages with no text parts (binary-only messages)
- Body rows are deleted when the parent message is deleted
