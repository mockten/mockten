# monitoring

Observability stack and operations dashboard for mockten.

`monitoring` collects metrics and logs from the running services and provides dashboards for operators. The health/metrics it exposes also back the **Admin Portal**'s System Health view (served by [`sale`](../sale)'s admin health endpoint).

## Contents

- `prometheus.yml` — Prometheus scrape configuration (metrics collection).
- `grafana/` — Grafana provisioning (dashboards / datasources).
- `loki-config.yml` — Loki configuration (log aggregation).
- `promtail-config.yml` — Promtail configuration (log shipping).
- `dashboard/` — a small Node.js operations dashboard (`server.js`) that surfaces platform metrics.

## Stack

```
services ─→ Prometheus (metrics) ──────→ Grafana (dashboards)
         ─→ Promtail ─→ Loki (logs) ───→ Grafana
                                      └─→ dashboard/ (custom Node UI)
```
