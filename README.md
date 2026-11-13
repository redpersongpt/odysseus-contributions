# Calendar fallback timezone provenance

Issue https://github.com/odysseus-dev/odysseus/issues/7221

Offset-bearing non-ISO absolute input already normalizes to naive UTC. The fix retains timezone provenance until the UTC flag is recorded, so serialized timed events include Z. Default legacy parser/DB values remain naive; no historical rows migrate.

- before-tests.log:24 new parser/HTTP/SQLite/recurrence cases against unchanged production;19 fail/5 pass.
- calendar-tests.log:238 Calendar tests pass on the source fix,7 existing deprecation warnings, standard pytest without a custom launcher.
- combined-calendar-tests.log:262 pass/12 warnings in an isolated checkout combining the parser fix with PR7217's HTTP-error helper. The changes have a textual boundary conflict, not a behavior conflict. compat-diff.patch records the manual source/default-test resolution relative to this parser head; the new error regression file was copied unchanged from PR7217's fffb6e3 commit. No integration/merge commit was created.
- native-before/after.json and .log: actual authenticated Uvicorn application, disposable SQLite, no route/dependency/HTTP replacements.12 POST/PUT cases per phase cover RFC/prose, east/west/half/quarter-hour offsets and UTC/GMT. All return200; before all lose UTC provenance, after all preserve it. Three ISO/naive controls per phase remain correct. Synthetic HTTP records cleaned before browser display.
- browser-before/after.json: actual Calendar UI, Chrome157, Asia/Tokyo,1440/390px, scale/root zoom1. Requested14:00+0900 shows05:00–06:00 before and14:00–15:00 after. Four original images inspected. Normal UI navigation and actual event display; no DOM/CSS replacement.
- Three native scripts include app startup/auth, real HTTP and UI actions. Credentials, databases and raw application logs excluded. Both app/process trees stopped, port17871 closed, as recorded in native results.
- source-manifest.json records source/base/hashes/results/limits; duplicates.json records open/closed search and inspected related scope. Merged2557's naive-storage contract is preserved.6291 owns all-day dates,7164 an independent CLI ISO parser.

Not tested: Docker, other OSes, external CalDAV, real phone/touch gestures, Safari/Firefox or full local repository suite. No repair of historical rows without original timezone metadata. AI assistance: OpenAI Codex. Native drivers contain workspace-specific absolute paths; adjust for another machine.
