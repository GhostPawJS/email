# Accounts

An account is the local root for one email identity.

Current fields:

- `id`
- `name`
- `emailAddress`
- `createdAt`

Current operations:

- `createAccount()`
- `listAccounts()`

This foundation layer treats accounts as local configuration records only. It does not yet manage credentials, providers, or remote capability negotiation.
