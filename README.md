# PR #7200: SearXNG engine-selection runtime evidence

Source change: `10276a00f8a8327449e074e523beb3a1977291bf`.
Baseline: `3d01007b9f573af9b4fed8e6e152bafcddeaeba5`.

The driver uses the maintained base Compose file and its existing CI isolation
overlay. The image, root entrypoint wrapper, healthcheck and capability set are
preserved. Only owned temporary settings volumes and validation source mounts
are supplied. No operator `.env` is loaded and no host port is published.

The immutable image reference is recorded in the driver and result. Tests ran
on native ARM64 Linux in an isolated Lima VM on an Apple Silicon macOS host.
This does not establish amd64, native Windows or external-provider availability.

`result.json` records real `GET /` and `GET /config` responses, actual image
configuration, healthy startups, retained-file ownership/mode and restart
idempotence. Non-disabled YAML definitions and `/config` enabled-engine flags
are recorded separately: a provider may not register without its optional
requirements. No user search query or model inference is issued by the driver;
normal SearXNG engine initialization is unmodified.

Reproduce on a disposable Linux Docker host with Compose:

```sh
mkdir -p /tmp/pr083-evidence/before /tmp/pr083-evidence/after
cp check_container.py /tmp/pr083-evidence/
cp docker-compose.yml /tmp/pr083-evidence/base-compose.yml
cp .github/searxng-validation.compose.yml /tmp/pr083-evidence/validation.compose.yml
git show 3d01007b9f573af9b4fed8e6e152bafcddeaeba5:scripts/migrate_searxng_settings.py > /tmp/pr083-evidence/before/migrate_searxng_settings.py
cp scripts/migrate_searxng_settings.py /tmp/pr083-evidence/after/
cp config/searxng/settings.yml /tmp/pr083-evidence/before/settings.yml
cp config/searxng/settings.yml /tmp/pr083-evidence/after/settings.yml
python3 /tmp/pr083-evidence/check_container.py
```

Run the commands with the PR source checked out. The driver creates uniquely
named/labeled settings volumes and removes its Compose services and volumes
on completion/failure. It refuses to reuse an existing volume. It never removes
unrelated Docker objects.

The driver seeds files as `searxng:searxng`, mode `0640`, before the maintained
root wrapper runs with `cap_drop: ALL` plus only `CHOWN`, `SETGID`, `SETUID` and
`DAC_OVERRIDE`. Docker's `CAP_` spelling is normalized only for the assertion;
raw inspected capabilities remain in the result. SearXNG's existing lowercase
normalization is used when comparing registered engine names, while the source
configuration names remain unchanged. The explicit-no-inheritance control uses
the real image's complete Brave engine definition.

Six selection cases run on baseline and fixed code; three policy controls run
on fixed code. Each case is started and then actually restarted, with a new
container start timestamp and an unchanged settings hash, inode, mtime, owner
and mode. All fifteen cases must complete for a full successful run.
