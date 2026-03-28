# Messages

A message is a locally stored email summary tied to one mailbox.

Current fields:

- `id`
- `mailboxId`
- `subject`
- `preview`
- `receivedAt`

Current operations:

- `ingestMessage()`
- `listMessages()`

This first pass stores enough local message shape to support search, review, and testing. It does not yet model headers, flags, threading, MIME parts, or attachments.
