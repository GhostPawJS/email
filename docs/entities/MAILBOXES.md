# Mailboxes

A mailbox belongs to an account and names one local mail container such as `INBOX` or `Sent`.

Current fields:

- `id`
- `accountId`
- `name`
- `role`
- `createdAt`

Current operations:

- `registerMailbox()`
- `listMailboxes()`

The current role set is intentionally small: `inbox`, `sent`, `drafts`, `archive`, and `trash`.
