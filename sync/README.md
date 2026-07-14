# sync

Incremental MySQL → Meilisearch synchronization.

`sync` keeps the [`meilisearch`](../meilisearch) product index in step with the [`mysql`](../mysql) source of truth. It runs `sync_script.sh` on a schedule: it reads a watermark timestamp, selects rows changed since the last run, pushes them into the Meilisearch index, and advances the watermark.

## Contents

- `sync_script.sh` — the incremental sync job (bash + `mysql` client + Meilisearch HTTP API).
- `Dockerfile` — container image that runs the script on an interval.

## Behavior

- The last-sync timestamp is persisted at `/tmp/last_sync_timestamp.txt` (defaults to the epoch on first run, i.e. a full initial sync).
- Only products created/updated since the last watermark are re-indexed, keeping the job cheap on each tick.
