# Pages Demo

No interactive browser demo ships with v1 of `@ghostpaw/email`.

The package is a Node.js-only library that depends on `node:sqlite`,
`node:tls`, and `node:net` — built-in modules that do not run in the browser.
A WASM-based SQLite port and a mocked transport layer would be required for a
client-side demo.

If a demo is added in a future version, it would cover:

- Account setup and connection
- Folder list and message queue views
- Thread reading with quoted body display
- Compose, reply, and forward flows
- Sync status and FTS search

For now, the `docs/` folder and the colocated test suite under `src/` serve as
the primary reference for package behaviour.
