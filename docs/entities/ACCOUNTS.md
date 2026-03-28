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
| `created_at` | TEXT | ISO timestamp |

The account row is intentionally minimal. It identifies the server and user
but does not store passwords or tokens. Those travel only through the runtime
`EmailConfig.auth` object.

## Auth Types

Supported at runtime through `EmailConfig.auth`:

- `{ user, pass }`: username + password (IMAP LOGIN or SASL PLAIN)
- `{ user, accessToken, refreshFn? }`: OAuth2 bearer token with optional refresh
- `{ mechanism, credentials }`: generic SASL mechanism (XOAUTH2, OAUTHBEARER, etc.)

All auth types are top-level on `EmailConfig`, shared between IMAP and SMTP.

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

// Create or update (matched by host + port + username).
const account = store.upsertAccount(db, {
  host: 'imap.example.com',
  port: 993,
  username: 'user@example.com',
  label: 'Work',
});

const single = store.getAccount(db, account.id);
const all = store.listAccounts(db);
store.deleteAccount(db, account.id);
```

Most users do not call store functions directly. The `Mailbox` class manages
account creation and lookup internally during `connect()`.

## Invariants

- One `accounts` row per `(host, port, username)` combination
- Deleting an account cascades to folders, messages, bodies, attachments, and sync log
- The `Mailbox` class upserts the account from `EmailConfig` during `connect()`
