# Mermaid palette synchronization evidence for #5586

Source:47ea40c36226b278638e74c1bac81fd4363cf14f. Base:unchanged dev3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Developed and tested with OpenAI Codex.

The existing vendored Mermaid loader remains lazy and memoized. Its configuration now uses the themeable base theme with the app's existing palette/font variables. A root-style observer compares the palette signature, avoiding redraws for unrelated style changes. Initializations and draws share one queue. A queued update reads the latest palette, retains original diagram text in a WeakMap and restores that text when redrawing connected diagrams. Old disconnected stream nodes are ignored. Existing securityLevel is unchanged; no library upgrade, CSS component or parallel palette was added. Theme-variable usage follows https://mermaid.js.org/config/theming.html.

Six new module/DOM-port cases use the actual Markdown module and the existing loader harness with a Mermaid boundary port. They cover palette/font configuration, retained source, theme changes while a prior draw is held, latest-palette coalescing, no redraw on unrelated styles, empty-page laziness and recovery after a failed draw. These are scheduling/configuration checks, not real SVG rendering. Exact unchanged dev:3 behavioral failures/3 passing controls. Final focused pytest:71 passed, one existing SQLAlchemy warning. Existing streaming/segmenter checks:120 passed. Syntax and diff checks passed.

A local-only worktree combines this source with open raster-image #7201, nested-list #7205 and table-alignment #7207:121 pytest/138 streaming checks passed. That combination is outside this PR's diff and has no separate native-app claim. Exact source hashes are in source-manifest.json.

Real-app verification uses authenticated Uvicorn, fresh SQLite/data and an owned OpenAI-compatible provider emitting three content chunks. The actual public chat controller/input accessor sends multipart mode=chat to /api/chat_stream; real stream consumption, Markdown, the vendored Mermaid build and resulting SVG are used. Native typing/initial Send activation was not verified. No renderer/route result, SVG, palette result or DOM was replaced.

Four Chrome151/macOS viewport cases:before/after at1440x1000 and390x844. Each verifies a real flowchart and sequence diagram at the initial palette, after actual Theme/light-swatch activation, after actual midnight-swatch activation, and after a rapid light/ocean/midnight batch through the public applyColors controller. Closing the popup uses its button on desktop and Escape on the mobile layout; exact inputs are recorded. These are mobile viewport checks, not a real phone.

Before, node fill stays rgb(31,32,32) through palette changes. After, flowchart node fill/text/stroke and sequence actor fill match the current app tokens and Fira Code is used. Light fill becomes rgb(255,255,255); midnight fill becomes rgb(22,27,34). SVG count, node count and both diagram labels/messages remain valid. Rapid updates settle on the latest palette. Served Markdown bytes match the tested phase source; all page-error lists are empty. Existing diagram container surfaces remain styled by the app's CSS. Four final light-palette screenshots were visually inspected after dismissing onboarding tips through UI input.

Both app/MCP trees stopped and owned provider ports17871/17872 closed. Two provider chat POSTs per phase. Passwords, databases, private captures and app logs are excluded. See runtime-cleanup.json.

Limits:no exhaustive Mermaid diagram-type or diagram-specific directive coverage, CSS colors outside the app's hexadecimal palette contract, real phone/touch, Safari/Firefox, Docker, Windows, external provider/model inference or full suite. Real browser checks cover rapid palette batches; explicit in-flight serialization is covered by the held-draw module-port test. Mermaid can redraw diagram DOM on a palette change; preservation of a text selection or interactive SVG state during redraw is not claimed.

Workspace reproduction (adapt explicit driver/Playwright paths and create fresh owned runtime roots):

```
.venv/bin/python research/mermaid-palette-live-check.py before
.venv/bin/python research/mermaid-palette-live-check.py after
```

Requires project Python dependencies, native Chrome/Playwright and the exact unchanged-dev baseline worktree.
