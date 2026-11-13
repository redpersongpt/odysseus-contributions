# Responsive Calendar event forms — issue #7212

Source1cfd23ecf446301b1f661968eee7d197dda2235c, base dev3d01007b9f573af9b4fed8e6e152bafcddeaeba5. Six added CSS lines at the existing520px breakpoint: existing form/action rows wrap; native input widths use auto/flexible intrinsic sizing. No JS/HTML/colors/fonts/spacing changes, no clipping suppression or DOM replacement.

## Actual app proof

Authenticated native Uvicorn/fresh owned data+SQLite, Chrome157.0.8103.51/macOS. Five fine-pointer viewports320/390/520/768/1440, three coarse-touch emulations320/390/520; create+update at each =16cases per phase/32total. Each records timed state, focused end-date state, settled All day state =96observations. No CSS/DOM/network response substitution. Initial navigation uses public openCalendarTo; real inputs, visible toggle label, event rows and Create/Save controls are exercised.

Unchanged dev:8cases fail geometry (320/390px, normal+touch, create+edit),8wider controls fit. At320 the details width242px faces a331px date row; at390 details312px face331px. Clicking All day scrolls the overflow:hidden details panel, clipping multiple inputs on the left. Edit Delete also clips at320. CSS root/body/form zoom and visualViewport scale are1.

After: all48geometry states have every measured field/action inside the form, row scrollWidth<=clientWidth+1px, details/body scrollLeft0. Native date inputs preserve readable intrinsic width (e.g.320px case date widths221.58/203.69px, not forced narrow). All16 actual POST/PUT saves return200 and authenticated GET verifies dates/summary/location/all_day. Wide768/1440 horizontal field/action geometry matches before in all12measured states. Eight original settled-switch screenshots visually inspected; desktop controls included.

## Existing test checks and transport limitation

The standard command `python -m pytest -q tests/test_css_computed_style_snapshot.py tests/test_static_stylesheet_manifest.py tests/test_calendar_visual_static.py` ran twice on modified CSS:34PASS/1transportFAIL. The exact same full selection on unchanged dev:34PASS/1transportFAIL. The CSS reorder self-test's route.fetch receives ECONNRESET from the auxiliary static server; no CSS assertion produced that failure. The isolated self-test on unchanged dev passes. Initial detached checkout lacked ESM Playwright resolution; a symlink to existing workspace node_modules was provided before valid controls (those setup-failure logs are excluded).

`run-css-tests-with-listener-capacity.py` runs those SAME unmodified tests with only Python's auxiliary socketserver accept backlog changed5->socket.SOMAXCONN(128):35PASS/one existing SQLAlchemy warning. No CSS, page contents, browser routes, snapshots or assertions are replaced. This is explicit test-server configuration, not an application change or claim that the default full invocation passed. Committed snapshot baseline unchanged; native app geometry above is separate behavioral proof. No new implementation-mirroring source test added for six reversible CSS lines.

## Fixture and coverage limits

First extended native loop logged in16times and its final login was non-2xx; the status was not captured (source limiter15/min). Final driver authenticates once, shares the normal cookie state, and reruns both phases fresh; no auth bypass/config override. Earlier screenshots captured checkbox transition mid-frame; final driver waits350ms and all final images were re-inspected. Original probe/preflight runs are not canonical proof.

No actual phone/virtual keyboard, Safari/Firefox, Windows, Docker, CalDAV, Larger text/CSSzoom variants, exhaustive localized text, custom exact-time reminder or multi-calendar picker coverage claimed. Timed geometry was checked, while final save controls use All day. Both actual app/MCP trees stopped with no children; port17871 closed. Passwords, DB and private app logs excluded.
