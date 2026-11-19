# PR maintenance validation — 19 November 2026

These updates continue existing PRs7150,7139,7197; no new PR was opened. Current upstream base cbd87ecd. Exact source heads in source.json.

Contacts7150: carry existing write-result guards into the upstream extracted CardDAV form and unified integrations modules. Keep settings coordinator exactly as upstream. Existing import HTTP-error guard retained; tests adapted to execute callbacks in their new source modules.69Contacts tests passed. Actual authenticated app, disposable data, real chmod write denial for only the owned contacts file:12desktop/narrow scenarios retained drafts/forms and errors;12successful retries. Four served JS files matched checkout bytes; zero browser pageerrors. Two original PNGs visually inspected. Wrapper changes only the owned CONTACTS_FILE location; no request/response/route mocks. App/children stopped,17836closed. Current Settings styles come from upstream; no CSS/DOM design changes in the patch.

Memory7139: keep the existing shared reentrant store_lock context, fork reset and decorator while incorporating current preference/backup consumers.150memory/atomic/prefs tests passed, including real file/process/fork contention. No fresh Uvicorn memory race was claimed for this base-only compatibility merge; original native MCP/REST/audit proof remains in the PR. No product behavior changed.

ICS7197: import retains both recurrence_exdates and current source timezone metadata.262Calendar tests passed. Actual authenticated Uvicorn/SQLite, four all-day/UTC/floating/seconds cases: export includes exclusions; independent ICS parser counts2occurrences; normal HTTP reimport and independent incoming-file import both keep2. App stopped/child list empty and17868closed. No HTTP/DB/dependency replacement, no rendering changes.

Not run: Docker, otherOSes, externalCardDAV/CalDAV, realphone/Safari/Firefox or full local suite. Test logs include existing deprecation warnings. No credentials, databases or raw application logs published. Native records contain only synthetic owned data. Original PR descriptions/evidence remain separately linked; this is current-base compatibility proof.
