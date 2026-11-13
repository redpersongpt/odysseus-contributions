# Nested list rendering evidence for issue #5581

Source: 8c814b864278cf9c8d9a2534854111132e5c9428, based on unchanged dev 3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Developed and tested with OpenAI Codex.

The three drivers start authenticated Uvicorn with fresh SQLite/data roots and an owned loopback OpenAI-compatible response server. The real chat submission controller posts multipart mode=chat to /api/chat_stream. The provider sends four content chunks with 0.2-second separation, including a cut immediately before the first nested child; real stream consumption and rendering are used. The browser waits for response completion and removal of the message streaming class, checks served JS/CSS bytes against the tested source, and reloads the persisted conversation. No renderer/route result or DOM was replaced. Native typing/Send-button activation was not verified: submission uses the public frontend controller and its real input accessor.

Each phase runs at 1440x1000 and 390x844 in native Chrome 151 on macOS. Before, zero nested lists and only two root checkbox items; after, three child ULs, one child OL and four independent checkbox items. A single root OL with three direct siblings replaces two separate OL groups. Child task rows appear below their parent; an unchecked child of a checked parent has no check fill or text strike. Hierarchy/state checks also pass after reload; zero page errors. All four screenshots were visually inspected. The existing narrow root ordered-marker clipping is visible in both phases; this PR does not change message overflow/marker spacing and does not claim to fix that separate styling behavior. The older issue's invalid P/OL DOM was not observed on current dev.

23 focused structural tests: exact unchanged dev has 18 behavioral failures / 5 passing controls; final branch passes all 23. The complete focused selection passes 88 tests (one existing SQLAlchemy warning). Node streaming segmenter and every-prefix render-invariance checks pass 132 tests, including mixed ordered nesting and nested task/emphasis samples. A local-only worktree applies the separate open raster-image PR #7201 on this source; the same focused/streaming tests and its own raster-image tests pass. That combination is not part of the published source diff and has no separate native app claim.

The existing limited Markdown grammar is retained; this is not a claim of full CommonMark support, arbitrary multiline blocks/loose lists, blockquoted lists or ordered start-number preservation. No real model inference, external provider, actual phone/touch, Docker, Windows, Firefox/Safari or full-suite verification. Both app/MCP process trees were stopped and fixture providers closed. Passwords, SQLite databases, private captures and app logs are excluded. See source-manifest.json and runtime-cleanup.json for provenance and exact counts.

Reproduction in this workspace:

```
.venv/bin/python research/nested-list-live-check.py before
.venv/bin/python research/nested-list-live-check.py after
```

The drivers contain explicit workspace paths, expect the existing Python dependencies, native Chrome and Playwright, and require fresh owned runtime directories. Adapt paths for another checkout; the baseline source must be unchanged dev. Read the fixture limitations above before treating screenshots as model evidence.
