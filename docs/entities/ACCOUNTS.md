# Accounts

An account is the local root for one email identity.

It holds the connection config needed to open an IMAP session and an SMTP
connection. Credentials are supplied at runtime through `EmailConfig` and are
not stored in the SQLite database.

## Schema

Stored in the `accounts` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `host` | TEXT | IMAP server hostname |
| `port` | INTEGER | IMAP port (typically 993 for TLS) |
| `username` | TEXT | Login identifier (usually the email address) |
| `label` | TEXT | Human-readable display name |
| `createdAt` | TEXT | ISO timestamp |
| `updatedAt` | TEXT | ISO timestamp |

The account row is intentionally minimal. It identifies the server and user
but does not store passwords or tokens. Those travel only through the runtime
`EmailConfig.imap.auth` object.

## Auth Types

Supported at runtime through `EmailConfig`:

- `plain`: username + password (IMAP LOGIN or SASL PLAIN)
- `xoauth2`: Gmail-style OAuth2 SASL bearer token
- `oauthbearer`: RFC 7628 OAUTHBEARER token
- All three support a `tokenRefresh` callback for transparent token renewal

## Local Store Operations

```ts
import { upsertAccount, getAccount, listAccounts, deleteAccount } from '@ghostpaw/email';

// Create or update (matched by host + username).
const account = upsertAccount(db, {
  host: 'imap.example.com',
  port: 993,
  username: 'user@example.com',
  label: 'Work',
});

const single = getAccount(db, account.id);
const all = listAccounts(db);
deleteAccount(db, account.id);
```

## Invariants

- One `accounts` row per `(host, username)` combination
- Deleting an account cascades to folders, messages, bodies, attachments, and sync log
- The `Mailbox` class constructs the IMAP session config from this row plus the runtime `EmailConfig`
