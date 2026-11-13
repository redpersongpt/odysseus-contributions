# Rewrite provider-error evidence for issue #5738

Source 897d0f0514ec70f77353883f96e3220f750bc9b9, base dev 3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Developed and tested with OpenAI Codex.

This changes only the public rewrite controller's SSE error classification: track event:error, accept status/text as well as error/status, and reuse the existing createTerminalStreamError formatter. It preserves the original bubble and avoids saving a partial rewrite/variant after a provider failure. It does not implement subscription credential refresh, fallback routing or a general-purpose SSE parser.

Tests execute the actual rewriteWith function and the actual shared error helper under Node VM with UI/network/renderer ports. The port renderers do not constitute browser/Markdown coverage. Seventeen cases cover 1-byte and whole-response transport chunks, failures after partial content, text/string/object/status-only errors, ordinary progress/real content/thinking, HTTP failure and empty output. Exact unchanged dev: 12 behavioral failures and 5 passing controls. Final focused pytest selection: 51 passed, one existing SQLAlchemy warning. Includes existing stream-error classification, rewrite persistence and error-redaction tests. Syntax and diff checks passed.

The real-app drivers run authenticated Uvicorn with fresh SQLite/data and an owned OpenAI-compatible loopback provider. Initial chat uses the real frontend public submit controller/input accessor and the actual multipart mode=chat /api/chat_stream route. Native typing/initial Send-button activation was not tested. The original assistant response comes through the real stream/renderer. The browser then clicks the ACTUAL More actions and Rewrite shorter buttons. The real /api/rewrite route calls the real LLM transport; the fixture returns HTTP401 with an owned error body. The actual frontend receives event:error with status401 and text. No route/controller/DOM result was replaced.

Four cases: before/after at 1440x1000 and 390x844 in native Chrome151/macOS. Before toast: model returned no rewritten text. After toast: local endpoint rejected the API key, with the owned failure detail and existing reconnect guidance. Original HTML/raw and persisted response survive; no rewrite metadata POST; spinner removed; zero page errors. Served chat.js bytes match the tested phase source. Screenshots wait for the existing toast entrance animation/bounds before capture and were visually inspected. Both app/MCP trees stopped and provider ports closed. Passwords, private captures, databases and app logs excluded.

Limitations: no actual ChatGPT Subscription credentials/token refresh, external providers, real model inference, phone/touch, Docker, Windows, Firefox/Safari, full suite, arbitrary multiline SSE payloads or unterminated final SSE frames. The owned fixture returns401 deliberately; it does not prove a real provider's auth lifecycle. Partial-content failure and successful rewrite controls are unit-controller checks, not additional native app scenarios. Existing source style, Fira Code, dark theme, toast/component classes and spacing are unchanged.

Reproduction in the recorded workspace (adapt explicit driver paths and create fresh owned runtime roots elsewhere):

```
.venv/bin/python research/rewrite-error-live-check.py before
.venv/bin/python research/rewrite-error-live-check.py after
```

Requires project Python dependencies, native Chrome, existing local Playwright and the exact unchanged-dev baseline worktree. Read source-manifest.json for provenance and runtime-cleanup.json for capture/cleanup counts.
