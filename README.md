# Calendar event date-error evidence

Fixes https://github.com/odysseus-dev/odysseus/issues/7216

The issue predates the production fix. Source changes only the HTTP date-parsing boundary: malformed dtstart/dtend gets400; existing parser/timezone/defaults and database-error500 behavior remain covered.

- before-tests.log: new24cases against unchanged production, 19 malformed-input failures and5 supported-format passes.
- focused-tests.log:94passed after fix,6existing deprecation warnings. Includes real FastAPI/SQLite invalid-write transaction controls and valid parser/owner/timezone/default-calendar coverage.
- native-before/after.json and .log:16actual authenticated Uvicorn POST/PUT cases,500before/400after. Real GET preserves original event after rejection. Valid create and corrected update200 in each phase; source offset becomes UTC. Both process trees and port cleaned up.
- calendar-invalid-dates-live.py: native driver; starts full application without replacing routes/auth/dependencies. calendar-form-layout-smoke-app.py: shared wrapper creates a disposable actual authenticated user. Credentials, raw application logs and SQLite databases are excluded from this evidence commit.
- source-manifest.json: exact base/head/source hashes, measured results, scope and limits.
- initial-candidate.json: compact valid open/closed GitHub searches and related merged frontend change4228. Rejected search API requests are excluded.

Drivers record a local-workspace reproduction; adjust absolute workspace/source paths for another machine. Before source is a detached unmodified dev checkout; after source is the PR checkout. Python3.12/macOS native validation, not Docker/other-OS/CalDAV/full-suite proof. No rendering source changed, so screenshots are not applicable. AI assistance: OpenAI Codex.
