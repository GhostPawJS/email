# Sync

Sync jobs record local intent and recent status for account refresh work.

Current fields:

- `id`
- `accountId`
- `direction`
- `state`
- `updatedAt`

Current operations:

- `createSyncJob()`
- `getSyncStatus()`

The current state model is minimal and only supports foundational tracking. The actual IMAP refresh logic is still a stubbed transport surface.
