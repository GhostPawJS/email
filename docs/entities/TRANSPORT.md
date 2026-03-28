# Transport

Transport surfaces represent the future IMAP and SMTP protocol boundary.

Current operations:

- `syncImapAccount()`
- `sendSmtpMessage()`

Current behavior:

- both operations return deterministic stubbed results
- neither operation performs real network I/O yet
- both already expose stable result shapes for callers and tool handlers

This keeps the architectural cut honest: transport exists as its own seam now, so protocol depth can grow later without collapsing the rest of the package structure.
