# monitoring

Observability stack and the **Developer Dashboard** for mockten.

`monitoring` collects metrics and logs from the running services, provides Grafana dashboards, and hosts the Developer Dashboard — the web operations portal at **http://localhost/dashboard** (introduced in [PR #195](https://github.com/mockten/mockten/pull/195)).

## Layout

```
monitoring/
├── prometheus.yml       # Prometheus scrape config (metrics collection)
├── promtail-config.yml  # Promtail config (log shipping)
├── loki-config.yml      # Loki config (log aggregation)
├── grafana/             # Grafana provisioning (dashboards / datasources)
└── dashboard/           # the Developer Dashboard (Node.js)
    ├── server.js        # Express server: container/DB/Kong/CI/e2e/scan endpoints
    └── public/          # UI (index.html, app.js) incl. the API Specifications panel
```

## Stack

```
services ─→ Prometheus (metrics) ──────→ Grafana (dashboards)
         ─→ Promtail ─→ Loki (logs) ───→ Grafana
                                      └─→ dashboard/ (custom Node UI at /dashboard)
```

## Developer Dashboard

`dashboard/server.js` exposes `/dashboard/api/*` endpoints that the UI (`public/app.js`) consumes — container control, MySQL browsing, the Kong spec parser (which powers the **API Specifications** panel), local CI (`act`), e2e runners, the Airflow pipeline trigger, and Trivy/ZAP security scans. See the root [README](../README.md#-developer-dashboard--httplocalhostdashboard) for the full panel list.

The system metrics surfaced here also back the **Admin Portal**'s System Health view (served by [`sale`](../sale)'s `/v1/admin/health` endpoint).

## Notes

- The API Specifications panel builds itself by parsing [`apigw/kong.yaml`](../apigw) live, so new gateway routes appear automatically; per-endpoint descriptions, input/response schemas, and the runnable Test Request forms are defined in `dashboard/public/app.js`.
