# Sync

The sync log records the outcome of each completed sync pass.

Sync is the process that closes the gap between the local SQLite cache and the
remote IMAP server. Every sync pass is recorded as a `sync_log` row regardless
of whether it found anything new.

## Schema

Stored in the `sync_log` table:

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER | Primary key |
| `folderId` | INTEGER | Foreign key → `folders.id` |
| `syncedAt` | TEXT | ISO timestamp when sync completed |
| `newMessages` | INTEGER | Count of newly inserted message rows |
| `expungedMessages` | INTEGER | Count of messages removed due to server expunge |
| `flagChanges` | INTEGER | Count of flag updates applied |
| `durationMs` | INTEGER | Wall-clock duration of the pass in milliseconds |
| `strategy` | TEXT | `initial`, `qresync`, or `uid_fallback` |
| `uidValidityReset` | INTEGER | `1` if cache was invalidated due to UIDVALIDITY change |
| `error` | TEXT | Error message if the sync pass failed (null on success) |

## Sync Strategies

### Initial Sync

Run when a folder has no messages in the local cache (first sync or after a
UIDVALIDITY reset). The engine:

1. Issues `UID FETCH 1:* (FLAGS ENVELOPE BODYSTRUCTURE RFC822.SIZE)` in
   configurable batches.
2. Inserts or updates a `messages` row for each UID.
3. Populates attachment metadata from BODYSTRUCTURE for messages with
   attachments.
4. Writes attachment metadata rows (without binary data).
5. Runs thread computation for the folder.
6. Populates the `messages_fts` FTS5 index.
7. Records the sync pass in `sync_log`.

### Incremental Sync (QRESYNC)

Run when the folder has an existing cache and the server advertises QRESYNC
(RFC 7162). The engine:

1. Issues `SELECT INBOX (QRESYNC (uidValidity highestModSeq))`.
2. Processes VANISHED responses to expunge deleted messages.
3. Processes FETCH responses to update flags (using `CHANGEDSINCE modSeq`).
4. Updates `highestModSeq` on the folder row.
5. Records the sync pass.

### Incremental Sync (UID Fallback)

Run when QRESYNC is unavailable. The engine:

1. Issues `UID FETCH <knownMax+1>:*` to find new messages.
2. Issues `UID FETCH 1:<knownMax> FLAGS` to detect flag changes and expunges.
3. Updates messages and folders accordingly.
4. Records the sync pass.

## UIDVALIDITY Reset

If the server returns a different `uidValidity` than the locally stored one:

1. All messages for that folder are deleted from `messages`, `bodies`,
   `attachments`, and `sync_log`.
2. The folder's `uidValidity`, `uidNext`, `highestModSeq`, and `messageCount`
   are reset to the server-reported values.
3. An initial sync is performed immediately.
4. The `sync_log` row records `uidValidityReset: 1`.

## Body And Attachment Fetch Strategies

The `sync` call accepts a `bodies` option:

- `'none'` (default): no body or attachment data is fetched during sync
- `'missing'`: fetch bodies for messages that do not yet have a `bodies` row
- `'all'`: fetch bodies for all messages in scope (use sparingly)

Attachment binary data is never fetched during sync. It is always fetched on
demand via `read.getAttachment()`.

## Local Store Operations

```ts
import { insertSyncLog, getLastSyncLog, listSyncLogs } from '@ghostpaw/email';

// Inspect the last sync pass for a folder.
const last = getLastSyncLog(db, folderId);
// { strategy: 'qresync', newMessages: 3, expungedMessages: 0, flagChanges: 5, ... }

// List recent sync passes.
const history = listSyncLogs(db, folderId, { limit: 10 });
```

Sync is triggered through the network surface:

```ts
// Default incremental sync of all subscribed folders.
const result = await mailbox.network.sync();
// { totalNew, totalExpunged, folderResults: [{ folderId, path, ... }] }

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

- Every successful sync pass writes a `sync_log` row
- A UIDVALIDITY reset deletes and rebuilds all message data for the affected folder
- `highestModSeq` is updated on the `folders` row at the end of each QRESYNC pass
- `uidNext` is updated on the `folders` row at the end of each sync pass
- Sync log rows are not deleted automatically; archive them externally if space is a concern
- The `error` column is null on successful passes and non-null on failed ones; a failed pass still updates `highestModSeq` and `uidNext` if any partial data was processed
