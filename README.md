# Test static listener capacity evidence

Issue: https://github.com/odysseus-dev/odysseus/issues/7214

Only tests/conftest.py changes: import socket and give its threaded HTTP server socket.SOMAXCONN pending connections. No production, CSS, browser-route or snapshot changes.

Standard pytest commands from the repository root, using installed project dependencies:

```sh
python -m pytest -q tests/test_css_computed_style_snapshot.py tests/test_static_stylesheet_manifest.py tests/test_calendar_visual_static.py
python -m pytest -q tests/test_static_test_server.py tests/test_css_computed_style_snapshot.py tests/test_static_stylesheet_manifest.py tests/test_calendar_visual_static.py
```

- baseline-style-tests.log: unchanged dev, 34 passed / 1 ECONNRESET transport failure; isolated reorder test is not invariably failing.
- style-tests.log: source fixture fix, standard first command, 35 passed.
- final-runtime-tests.log: source fixture fix, standard second command, 39 passed, including real HTTP/speculative connection and Chromium capture controls.
- source-manifest.json: base, exact source diff, OS/Python/Node and inherited queue5/OS capacity128.
- fresh-duplicates.json: compact fresh open/closed GitHub search results. Additional ThreadingTCPServer/static searches and #7006 inspected before issue publication.

No global listener override, special launcher, retry, skip or baseline regeneration used in the final validation. Uvicorn app, Docker, other OSes and full repository suite not run. This checks the actual auxiliary HTTP/browser runtime for a test-only change.

AI assistance: OpenAI Codex. Evidence is separate from the PR's source diff.
