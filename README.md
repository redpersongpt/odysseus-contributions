# Markdown table alignment evidence for #5590

Source dc04b6dbd1016c81f47f8d21a72c30ade613ade0, base dev 3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Developed and tested with OpenAI Codex.

The existing pipe-table pass discards delimiter alignment markers and emits hardcoded left alignment. This change parses the delimiter once per table and applies only literal left/center/right values to each column's existing header and body cell styles. Plain/no-marker/invalid-marker columns retain left alignment. Table recognition, HTML structure, sanitization, classes, colors, spacing and fonts are unchanged. This does not claim full GFM-table conformance (escaped pipes, arbitrary block grammar, etc.). The targeted alignment behavior follows https://github.github.io/gfm/#tables-extension- including single-hyphen delimiter cells.

15 new structural tests use the actual Markdown renderer through its existing Node loader (minimal browser globals, tableRow import shim matching the existing helper, actual emoji helpers). Exact unchanged dev: 8 behavioral failures / 7 passing controls. Final focused pytest: 80 passed, one existing SQLAlchemy warning. Header/all body rows, optional outer pipes, all four marker forms, empty cells, independent tables, one-hyphen markers, inline formatting, non-markers and fenced literals are covered. Node every-prefix streaming/render-invariance and segmenter checks:126 passed. Source syntax and diff checks passed.

A local-only worktree combines this source with separate open raster-image #7201 (7eb06d4d8c8607ef2f0bd26aaeadddab7f11e350) and nested-list #7205 (8c814b864278cf9c8d9a2534854111132e5c9428):115 pytest /138 streaming checks pass. The combined code is not this PR's diff and has no separate native-app claim.

Native running-app validation: authenticated Uvicorn, fresh SQLite/data, owned OpenAI-compatible loopback provider, actual frontend public submit controller/input accessor, real multipart mode=chat /api/chat_stream, three content chunks separated by0.2seconds and actual streaming renderer. No route, renderer result or DOM was replaced. Native typing/Send-button activation not tested.

Four cases in Chrome151/macOS: before/after at1440x1000 and390x844. Before all nine cells left-aligned. After each header/body row left/center/right. DOM-computed styles and actual text-range geometry verify center/right placement (not just the HTML style string). Same after reload; raw Markdown markers preserved. Served markdown.js bytes match tested source and page errors are empty. All four screenshots were visually inspected. Both app/MCP trees stopped; provider ports17871/17872 closed. Passwords, private captures, databases and app logs excluded. See source-manifest.json and runtime-cleanup.json.

Not verified: actual model inference/external providers, real phone/touch, Docker, Windows, Firefox/Safari, full suite or full GFM conformance. The owned response is a fixture, not evidence of model quality.

Workspace reproduction (adapt explicit paths/Playwright location; create fresh owned runtime roots):

```
.venv/bin/python research/table-alignment-live-check.py before
.venv/bin/python research/table-alignment-live-check.py after
```

Requires project Python dependencies, native Chrome/Playwright and the exact unchanged-dev baseline worktree.
