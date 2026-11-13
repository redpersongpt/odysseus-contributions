# Email archive/spam result handling

Issue: https://github.com/odysseus-dev/odysseus/issues/7218

Active Email library card Archive (Inbox/Sent) and reader More → Move to Archive/Spam only remove messages after confirmed success. Existing delete/bulk behavior and inactive sidebar code are outside this change. Closed, unmerged #5099 by uhhgoat previously included an archive success guard alongside Archive-folder creation; this independently scoped fix revalidates generic failure handling on current dev and includes reader Spam.

- before-tests.log: shipped menu handlers on unchanged production,24 failures/4 successful-path passes. Separate Node VM collaborators supply DOM and transport; this is not browser evidence.
- focused-tests.log:73 passed after fix (one existing SQLAlchemy warning), including28 new result/pending/success cases plus existing bulk and delete-lookup coverage.
- native-before/after.json: actual authenticated Uvicorn app, Chrome157,1440/390 viewports,4 active flows each. Eight failures before hide/drop the message without an error. Eight failures after retain message/cache/reader and show the existing error toast. All8 retries return success and persist Archive/Junk in the built-in fixture.
- Three email-move-result scripts drive native application setup/navigation/actions. Normal backend endpoints return HTTP200/success:false when the fixture UID changes after the UI loads it. No route, auth dependency, DOM/CSS or HTTP response replacement. The built-in fixture is not a real IMAP service.
- Eight original before/after screenshots visually inspected. They show both reader and Sent-card failures. Existing narrow-reader text clipping remains; this is not a layout repair.
- before/after cleanup files prove app and children stopped, port17871 closed. source-manifest.json records exact source hashes, base/head, results and limitations. initial-duplicates.json records searches and related closed work.

The initial discovery probe targeted inactive sidebar functions, so it is excluded. An initial native assertion checked DOM count; the reader intentionally keeps a mounted, removal-class node. Final runs check visible/non-removing state and actual cache IDs; the preliminary run is excluded from evidence. No database, credentials or raw application logs are published.

Not tested: external IMAP providers, Docker, other OSes, Safari/Firefox, actual phone/touch gestures or full local repository suite. AI assistance: OpenAI Codex. Runtime scripts use absolute local-workspace paths; adjust them when reproducing elsewhere.
