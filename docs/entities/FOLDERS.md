# Folders

A folder is a locally cached representation of one IMAP mailbox path.

In IMAP terminology, "mailbox" and "folder" are used interchangeably. This
package uses "folder" consistently to avoid confusion with the `Mailbox` class.

## Schema

Stored in the `folders` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `account_id` | INTEGER | Foreign key → `accounts.id` |
| `path` | TEXT | Full IMAP path (e.g. `INBOX`, `INBOX/Work`, `[Gmail]/Sent Mail`) |
| `delimiter` | TEXT | Server path separator (`/` or `.`), default `/` |
| `role` | TEXT | Detected special-use role (see below) |
| `uid_validity` | INTEGER | Current UIDVALIDITY value |
| `uid_next` | INTEGER | Next expected UID |
| `highest_mod_seq` | INTEGER | HIGHESTMODSEQ for CONDSTORE/QRESYNC |
| `message_count` | INTEGER | Local count of messages in this folder |
| `unseen_count` | INTEGER | Local count of unseen messages |
| `last_synced_at` | TEXT | ISO timestamp of last successful sync |

## Role Detection

The engine detects folder roles from IMAP special-use attributes (`\Inbox`,
`\Sent`, `\Drafts`, `\Trash`, `\Junk`, `\Archive`, `\All`, `\Flagged`) and
from XLIST name hints. Role assignment is best-effort; not all servers
advertise special-use attributes.

Valid roles: `inbox`, `sent`, `drafts`, `trash`, `junk`, `archive`, `all`,
`flagged`, `null`.

A `null` role means the folder has no special function detected.

## UIDVALIDITY And Cache Coherence

`uid_validity` is set by the server and identifies the UID namespace for a
folder. If the server reports a different `uid_validity` than the locally
stored one, all message UIDs for that folder are stale. The sync engine
responds by clearing the local message cache for that folder and performing a
full re-sync.

This happens transparently during `mailbox.network.sync()`. The sync log will
record the reset.

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

const folder = store.upsertFolder(db, {
  accountId: account.id,
  path: 'INBOX',
  delimiter: '/',
  role: 'inbox',
});

const byPath = store.getFolder(db, account.id, 'INBOX');
const byId = store.getFolderById(db, folder.id);
const all = store.listFolders(db, account.id);
store.deleteFolder(db, folder.id);
```

Folder synchronisation is managed through the network and write surfaces:

```ts
// Refresh from server (detects new folders, role changes, subscriptions).
const live = await mailbox.network.refreshFolders();

// Create, rename, delete on the server (then call refreshFolders).
await mailbox.write.createFolder('Projects/Alpha');
await mailbox.write.renameFolder('Projects/Alpha', 'Projects/Beta');
await mailbox.write.deleteFolder('Projects/Beta');
await mailbox.write.subscribeFolder('Updates');
await mailbox.write.unsubscribeFolder('Updates');
```

## Invariants

- One `folders` row per `(account_id, path)` combination
- Deleting a folder cascades to messages, bodies, attachments, and sync log
- `uid_validity` mismatch triggers automatic cache invalidation during sync
- `highest_mod_seq` is updated at the end of each incremental sync pass and used to compute the CHANGEDSINCE parameter for the next sync
- Sync metadata (`uid_validity`, `uid_next`, `highest_mod_seq`) is preserved on upsert via `COALESCE` unless explicitly overwritten
