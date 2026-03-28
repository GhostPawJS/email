# Architecture

`@ghostpaw/email` follows the same package-family cut as the other GhostPaw libraries:

- `src/` contains the runtime surface with one thing per file and mandatory colocated tests.
- `read` and `write` provide the direct-code API.
- `tools`, `skills`, and `soul` provide the AI-facing runtime surface.
- `initEmailTables()` owns schema setup for the foundational local email model.

This first pass is intentionally small. It establishes durable seams for:

- account records
- mailbox registration
- local message ingest
- sync job tracking
- IMAP and SMTP transport facades

The protocol layer is still stubbed, but the package shape, schema cut, and test discipline are already in place.
