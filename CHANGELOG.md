# Changelog

All notable changes are documented here using [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.5.2] - 2026-10-27

### Fixed

- Closing stdout early, for example by piping into `head`, exits quietly instead of printing an EPIPE stack trace.
- `read message --json` includes the message headers and `textPlain`/`textHtml` bodies in `data`.
- `call mail_read` and the other tool calls use the configured account's database, so they see what `sync` stored instead of reporting `Folder not found: INBOX`.
- The `--no-imap-tls` and `--no-smtp-tls` help text says that they disable TLS.
- Help, usage lines and hints name the installed `ghostpaw-email` command instead of `email`.
- Flag values that start with dashes are accepted; only a following `--name` token counts as the next flag.

## [0.5.1] - 2026-10-27

### Fixed

- Sending from an account whose From address has no display name, the default for accounts added with `account add`, no longer uses an empty SMTP envelope sender (`MAIL FROM:<>`).
- `sync sync` on a fresh cache lists the server folders first instead of reporting 0 folders.

## [0.5.0] - 2026-10-27

### Added

- 33 noun-verb CLI commands: `mail read|search`, `mail send|reply|forward|draft|update-draft|send-draft`, `mail mark-read|mark-unread|star|unstar|mark-answered`, `mail copy|move|archive|trash|junk|not-junk`, `mail set-labels|add-labels|remove-labels`, `mail create-folder|rename-folder|delete-folder|subscribe-folder|unsubscribe-folder`, and `mail connect|disconnect|reconnect|sync|refresh-folders|watch`.
- Schema-based kebab-case flags, stdin JSON, `@file` values, command help, JSON and quiet output, shell completions and exit codes 0/1/2/3/4/70 for the new commands. Existing CLI commands and both npm bins retain their behavior.
- Standalone binary build and release workflow for linux-x64, linux-arm64, darwin-arm64, darwin-x64 and windows-x64, with SHA256SUMS and provenance attestations. Binaries are unsigned; macOS uses an ad-hoc signature.
- `install.sh` and `install.ps1` refuse checksum mismatches. Release install checks cover ubuntu-24.04, macos-15 and windows-2025 with offline local search, help, tool discovery, MCP initialize and tools/list, and a public TLS handshake. Writes and network mail commands require account credentials; npm tests and binary smoke tests use no public network.
- Optional `cli` metadata on `SurfaceTool`, preserving MCP and legacy tool discovery output.

### Changed

- Share CLI options between the npm CLI and standalone binary; retain the existing account and protocol commands in both distributions.


## [0.4.1] - 2026-10-24

### Changed

- The homepage and MCP Registry website URL point to https://email.ghostpaw.dev/.

### Fixed

- Emit bracketed message IDs in In-Reply-To and References headers without duplicating brackets.
- Preserve indexed body text when cached message metadata changes.
- Keep MIME headers contiguous with the message header block during composition.
- Reject refused IMAP and SMTP connections with a connection error naming the endpoint, without an uncaught error event.

## [0.4.0] - 2026-10-24

### Added

- MCP stdio server and public MCP entry with current and initialize-based protocol support.
- Tool CLI commands, generated Agent Skill and preserved CLI reference guide.
- Directory manifests, Dockerfile and MCP Bundle packaging.
- Size, API, consumer, startup and ratchet guards with offline benchmarks.

## [0.3.0] - 2026-10-24

### Added

- Shared tool metadata and result adapters under `tools.aligned`, preserving the legacy facade.
- Behavioural tests for protocol sessions, SMTP delivery, cached reads, message composition and mailbox writes.
- Contributor usage and release guidance in AGENTS.md.
- CI check that the package has no runtime dependencies.

### Changed

- Load SQLite synchronously when opening a database so package imports emit no SQLite warning.
- Configure file databases with WAL journaling and all library-opened databases with a 5000 ms busy timeout.

### Fixed

- Read STATUS attributes from the nested mailbox response list.

## [0.2.3] - 2026-04-06

### Changed

- Publish through GitHub OIDC trusted publishing and correct the workflow environment configuration.

## [0.2.2] - 2026-03-29

### Changed

- Document the command-line interface.

## [0.2.1] - 2026-03-29

### Added

- Provide an `email` CLI covering account, read, compose and organization operations.

### Changed

- Move the concept documentation into docs.

## [0.2.0] - 2026-03-28

### Added

- Initial IMAP/SMTP engine, SQLite cache, MIME handling, synchronization, threading and tool facade.
- Library usage guides and entity documentation.

### Fixed

- Preserve SQLite built-in imports in bundled output and handle IMAP responses split across TCP chunks.
- Refine envelope decoding.

[Unreleased]: https://github.com/GhostPawJS/email/compare/v0.5.2...HEAD
[0.5.2]: https://github.com/GhostPawJS/email/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/GhostPawJS/email/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/GhostPawJS/email/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/GhostPawJS/email/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/GhostPawJS/email/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/GhostPawJS/email/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/GhostPawJS/email/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GhostPawJS/email/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GhostPawJS/email/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GhostPawJS/email/releases/tag/v0.2.0
