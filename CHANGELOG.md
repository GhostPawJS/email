# Changelog

All notable changes are documented here using [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/GhostPawJS/email/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/GhostPawJS/email/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/GhostPawJS/email/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/GhostPawJS/email/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/GhostPawJS/email/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/GhostPawJS/email/releases/tag/v0.2.0
