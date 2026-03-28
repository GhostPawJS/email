# Sync

The sync log records actions taken during each sync pass.

Sync is the process that closes the gap between the local SQLite cache and the
remote IMAP server.

## Schema

Stored in the `sync_log` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `folder_id` | INTEGER | Foreign key → `folders.id` |
| `action` | TEXT | What happened (`insert`, `expunge`, `flag_update`, etc.) |
| `uid` | INTEGER | The message UID this action relates to |
| `details` | TEXT | Optional JSON details about the action |
| `synced_at` | TEXT | ISO timestamp when the action was recorded |

## Sync Strategies

### Initial Sync

Run when a folder has no messages in the local cache (first sync or after a
UIDVALIDITY reset). The engine:

1. Issues `UID FETCH 1:* (FLAGS ENVELOPE BODYSTRUCTURE RFC822.SIZE)` in
   configurable batches.
2. Inserts message rows via `insertMessagesBatch` (with `INSERT OR IGNORE`
   semantics for idempotency).
3. Populates attachment metadata from BODYSTRUCTURE for messages with
   attachments.
4. Runs thread computation for the folder.
5. Populates the `messages_fts` FTS5 index.
6. Records the sync pass in `sync_log`.

### Incremental Sync (QRESYNC)

Run when the folder has an existing cache and the server advertises QRESYNC
(RFC 7162). The engine:

1. Issues `SELECT INBOX (QRESYNC (uidValidity highestModSeq))`.
2. Processes VANISHED responses to expunge deleted messages.
3. Processes FETCH responses to update flags (using `CHANGEDSINCE modSeq`).
4. Updates `highest_mod_seq` on the folder row.
5. Records the sync pass.

### Incremental Sync (UID Fallback)

Run when QRESYNC is unavailable. The engine:

1. Issues `UID FETCH <knownMax+1>:*` to find new messages.
2. Issues `UID FETCH 1:<knownMax> FLAGS` to detect flag changes and expunges.
3. Updates messages and folders accordingly.
4. Records the sync pass.

## UIDVALIDITY Reset

If the server returns a different `uid_validity` than the locally stored one:

1. All messages for that folder are deleted from `messages`, `bodies`,
   `attachments`, and `sync_log`.
2. The folder's `uid_validity`, `uid_next`, `highest_mod_seq`, and `message_count`
   are reset to the server-reported values.
3. An initial sync is performed immediately.
4. The `sync_log` records the reset.

## Body And Attachment Fetch Strategies

The `sync` call accepts a `bodies` option:

- `'none'` (default): no body or attachment data is fetched during sync
- `'missing'`: fetch bodies for messages that do not yet have a `bodies` row
- `'all'`: fetch bodies for all messages in scope (use sparingly)

Attachment binary data is never fetched during sync. It is always fetched on
demand via `read.getAttachment()`.

The `fetchBody` and `fetchAttachment` functions in the sync engine include an
optimisation: they skip `session.selectFolder()` if the target folder is
already selected, avoiding redundant IMAP SELECT commands.

## Local Store Operations

Store functions are accessible through the `store` namespace:

```ts
import { store } from '@ghostpaw/email';

// Record a sync action.
store.insertSyncLog(db, { folderId, action: 'insert', uid: 42 });

// List recent sync log entries for a folder.
const history = store.listSyncLog(db, folderId, { limit: 10 });
```

Sync is triggered through the network surface:

```ts
// Default incremental sync of all subscribed folders.
const result = await mailbox.network.sync();
// { totalNew, totalExpunged, folders: [{ path, newMessages, ... }] }

// Sync specific folders with body fetch.
await mailbox.network.sync({
  folders: ['INBOX'],
  bodies: 'missing',
});
```

## IDLE / Watch

After a sync pass, the engine can enter IDLE mode to receive server-push
notifications of new messages and flag changes without polling:

```ts
for await (const event of mailbox.network.watch({ signal })) {
  if (event.type === 'new') await mailbox.network.sync({ folders: [event.folder] });
}
```

IDLE sends a DONE continuation and re-issues IDLE every 28 minutes to stay
within the RFC 2177 timeout window.

## Invariants

- Sync log entries provide a per-UID audit trail of actions taken during sync
- A UIDVALIDITY reset deletes and rebuilds all message data for the affected folder
- `highest_mod_seq` is updated on the `folders` row at the end of each QRESYNC pass
- `uid_next` is updated on the `folders` row at the end of each sync pass
- `insertMessagesBatch` uses `INSERT OR IGNORE` for idempotent re-syncs
