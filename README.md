# Mobile sidebar edge-swipe / selection evidence for #5584

Source bb2c5853a555c238f7180b122e92eca5188cf26d, base dev3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Developed and tested with OpenAI Codex.

Only the existing swipe initializer changes: arm from a32px left/right screen edge, ignore an active noncollapsed Selection at touchstart, and cancel tracking if one appears during movement. Existing directional mapping, threshold, modal/Compare/input exclusions, desktop gate, drawer helper, hamburger, backdrop and visual styling stay unchanged.

21 new cases execute the actual production initializer under Node VM with document/input ports. Exact unchanged dev:6 behavioral failures/15 passing controls. Middle drags,32px boundaries, selection at start/during movement, both edge directions and existing desktop/modal/Compare/document/notes/scroll/control exclusions are covered. Focused pytest28 passed (21gesture cases+7existing static checks), one existing SQLAlchemy warning. Existing New Chat drawer behavior:4 Node tests passed. Source/helper syntax and diff checks passed. VM ports are not native gesture evidence.

Real-app validation starts authenticated Uvicorn/fresh SQLite/data and an owned OpenAI-compatible provider. Initial response uses the public frontend submit controller/input accessor, real multipart mode=chat /api/chat_stream and actual renderer. Native initial typing/Send-button activation was not verified. The driver waits for the controller/final message, verifies the exact assistant text through the real session-export API and reloads the conversation before testing gestures; served sidebar-layout.js bytes match the tested phase source. No route, controller, gesture implementation, selection result or DOM was replaced.

Native Chrome151/macOS at390x844 with isMobile/hasTouch emulation. Touches are dispatched through Chrome DevTools Protocol and all observed DOM touch events have isTrusted=true. Text selection is established by an actual browser mouse drag over the real assistant paragraph, not by injecting a Range. This verifies emulated touch interacting with browser-native mouse selection; it does NOT claim real phone long-press/selection-handle behavior.

Four gesture scenarios per phase (8total): middle horizontal drag; left-edge drag with preexisting native text selection; unselected left-edge control; unselected right-edge control. Before: middle and selection drags preventDefault and open the drawer. After: neither drag is prevented or opens the drawer, and the exact selected text remains selected. Both actual edge controls open the correct side in both phases. Actual backdrop taps close the drawer between scenarios. All recorded touch events trusted, zero page errors. Four mobile screenshots (middle/selection, before/after) visually inspected. No desktop screenshot: the gesture remains gated below768px; desktop behavior is covered by the controller exclusion/New Chat tests.

Both app/MCP trees stopped and provider ports17871/17872 closed. One provider chat POST per phase. Passwords, SQLite databases, private captures and app logs excluded. See source-manifest.json and runtime-cleanup.json.

Limitations: no real Android/iOS device, touch long-press/selection handles, Safari/Firefox, Docker, Windows, external providers, model inference or full suite. Selection appearing during movement is a unit-port check; the native selection scenario begins selected. Initial Playwright Response.finished observation timed out despite a completed controller and visible answer; its cause was not established. This PR does not change/claim transport-completion behavior. Final gesture evidence instead verifies the real final response through export/reload before testing input.

Workspace reproduction (adapt explicit paths/Playwright location and create fresh owned runtime roots elsewhere):

```
.venv/bin/python research/sidebar-swipe-live-check.py before
.venv/bin/python research/sidebar-swipe-live-check.py after
```

Requires project Python dependencies, native Chrome/Playwright and the exact unchanged-dev baseline worktree.
