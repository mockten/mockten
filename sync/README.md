# sync

Incremental MySQL → Meilisearch synchronization.

`sync` keeps the [`meilisearch`](../meilisearch) product index in step with the [`mysql`](../mysql) source of truth. It runs `sync_script.sh` on a schedule: it reads a watermark timestamp, selects rows changed since the last run, pushes them into the Meilisearch index (and removes deactivated products), and advances the watermark.

## Layout

```
sync/
├── sync_script.sh   # the incremental sync job (bash + mysql client + Meilisearch HTTP API)
└── Dockerfile       # runs the script on an interval
```

## How it works

1. Read the last-sync timestamp from `/tmp/last_sync_timestamp.txt` (defaults to the epoch on first run → a full initial sync).
2. Capture a new high-watermark (`NOW()`), then `SELECT` products created/updated since the last watermark from MySQL.
3. Push the changed rows into the Meilisearch index over its HTTP API; products deactivated by a seller are removed from the index.
4. Write the new watermark back, so each tick only re-indexes deltas and stays cheap.

## Configuration

The MySQL and Meilisearch endpoints are set at the top of `sync_script.sh`:

| Setting | Default |
|---------|---------|
| `MYSQL_HOST` | `mysql-service.default.svc.cluster.local` |
| `MYSQL_DB` | `mocktendb` |
| `MEILI_URL` | `http://meilisearch-service.default.svc.cluster.local:7700` |

## Related

- Source of truth: [`mysql`](../mysql). Search index consumer: [`searchitem`](../searchitem) via [`meilisearch`](../meilisearch).
