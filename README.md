# Documents confirmed delete batch — actual runtime evidence

Fixes upstream issue7223. Source base3d01007; final source6fc2fea (full source hashes in manifest). Only libraryBulkDelete snapshots IDs before its confirmation; no API/style/session/execution changes.

Before/after: real authenticated Uvicorn/native macOS/Python3.12 app, disposable SQLite, Chrome157,1440/390px. Normal UI checkbox and confirmation clicks. CDP imposes1500ms request latency; no interception, route, response, dependency, DOM or CSS replacement. Selecting a third document during the first DELETE sends3requests before/2after. Unselecting the second sends1before/2after. GET readbacks confirm is_active values; these are soft deletes.4cases per phase,zero pageerrors,zoom/scale1.4original PNGs inspected; app/children stopped and17871closed. Source-level tests also mutate selection during confirmation, cancellation and failed request.

New12tests:9fail/3pass unchanged production. Focused15pass/1existing SQLAlchemywarning after. Drivers, results and exact commands/logs are included. A preliminary selector, GET-status assumption (soft delete returns200) and mobile navigation harness were corrected before the final runs; those preliminary failed runs are not passed off as product evidence.

Not tested: Docker, otherOSes, Safari/Firefox, realphone/touch or full local suite. Existing selection-mode exit and failure reporting are unchanged. The app wrapper creates only owned auth in a disposable data store. No credentials, DBs or raw app logs are published.
