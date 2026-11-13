# Calendar event draft preservation — issue #7210

Source 40bb83111fc00fcab26bb515f10079b1fefc6055; base dev3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Production change guards only create/update failure refreshes while #cal-body contains an editor. Existing optimistic rollback/error propagation and successful saves remain in place.

## Automated checks

18 new actual-function tests: HTTP403/500/network failure with and without a form, unreadable create response, absent cached original, closed-calendar controls, successful create/update. Existing js_function_source helper extracts exact production declarations; DOM/network/cache/render boundaries are ports. Unchanged-dev baseline7FAIL11PASS. Final focused90PASS/one existing SQLAlchemy warning. Node source check, Python test compile and gitdiffcheck pass.

## Actual runtime

Chrome157.0.8103.51/macOS, authenticated native Uvicorn/fresh SQLite/data. Desktop1440x1000 and mobile390x844; both create/update in each phase, total8 cases. Initial navigation invokes public openCalendarTo; title/location/description/date edits, all-day label toggle and Save/Create/Cancel use actual UI actions. No server route, network response, renderer result or DOM replaced.

A naturally reachable backend failure is used: clear the native all-day start date and press Save/Create. Actual app empty-date parser returns HTTP500; no event is created or existing event modified. Before: form destroyed and draft lost. After: same form retains exact edited title/location/description/empty start/valid end/all-day state. Correct the date and retry through real Save/Create: actual HTTP200, exactly one matching event, expected start/end/title/location/description persisted; page reload and actual event-row open show saved fields, Cancel still exits. All8 page-error lists empty. Other failure classes are exercised at the module-port boundary, not native HTTP.

Eight original screenshots inspected. Existing narrow mobile event-form horizontal overflow is visible and is not repaired by this failure-path change. Desktop onboarding tip is an actual app element and does not cover the event form. No CSS/HTML/font/spacing/color changes or screenshot editing. No claim of full mobile layout repair, actual phone/touch, CalDAV, external services/models, Docker, Windows, Safari/Firefox or full suite. Empty-date validation and unrelated background refresh race remain separate work.

## Fixture corrections and cleanup

First preflight tried to check the hidden switch input; corrected driver clicks the actual visible label. First result formatter evaluated a mutable UID after retry and incorrectly marked the create unchanged-server observation false; the final driver derives it from the actual failure-phase listing/original-event GET. Both phases rerun from fresh data; only final verified results are published. Neither fixture issue was treated as product evidence. App/MCP trees stopped, no child processes remain; port17871 verified closed. Passwords, DB, private app logs are excluded.

## Local compatibility

Current source plus open calendar-settings PR #7137 head2d9cf2486d3cf26d3b4385032a95d95daab376a0 applies cleanly in a detached local checkout. The same focused selection plus its actual settings-response tests:106PASS/one existing SQLAlchemy warning; node syntax and diffcheck pass. This combination is outside this PR and has no extra native app claim.
