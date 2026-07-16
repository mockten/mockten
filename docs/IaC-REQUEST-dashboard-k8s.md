# IaC change request — Developer Dashboard on Kubernetes

**For:** the IaC repo session (`mockten/IaC`, `common/k8s/dashboard` + `local`)
**From:** the mockten repo. All application-side changes are already merged; this
document lists only what the IaC side must provide.
**Status:** the dashboard image is ready for k8s — it needs the wiring below.

---

## 1. Background — what changed in the mockten repo

The dashboard previously assumed a Docker environment: it talked to
`/var/run/docker.sock` (container list, stats, logs, start/stop/restart) and had
the repo workspace bind-mounted (so it could run `act`, Playwright and the
security scans).

It now selects a **runtime** at startup:

| Mode | When | Container introspection |
|------|------|--------------------------|
| `docker` (DEV) | `task setup && task build` | Docker socket (unchanged) |
| `k8s` | deployed by IaC | Kubernetes API |

Everything else already works unchanged, because compose mirrors the k8s DNS
names via `container_name` — e.g. the dashboard connects to
`mysql-service.default.svc.cluster.local` in both worlds. **No IaC change is
needed for MySQL / Redis / MinIO / service HTTP.**

### Mode detection (no action needed, but good to know)

1. `DEV_MODE=true|false` — explicit, always wins.
2. Otherwise auto-detect: `KUBERNETES_SERVICE_HOST` is present in every pod, so
   in-cluster ⇒ `k8s`.

So the dashboard already defaults to `k8s` mode inside a pod even if you set
nothing. Setting `DEV_MODE=false` explicitly is still recommended (self-documenting).

---

## 2. Required — ServiceAccount + RBAC

The dashboard pod needs to read pods and delete them (Restart). Kubernetes has no
"restart pod" verb, so Restart = delete the pod and let the controller recreate it.

Please add to `common/k8s/dashboard`:

```hcl
resource "kubernetes_service_account" "dashboard" {
  metadata {
    name      = "dashboard-sa"
    namespace = "default"
  }
}

resource "kubernetes_role" "dashboard" {
  metadata {
    name      = "dashboard-role"
    namespace = "default"
  }
  # Read pods (Container List / Topology / Log Viewer) and delete them (Restart).
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list", "watch", "delete"]
  }
  rule {
    api_groups = [""]
    resources  = ["pods/log"]
    verbs      = ["get"]
  }
  # Optional — only if metrics-server is installed (see §4).
  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["pods"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_role_binding" "dashboard" {
  metadata {
    name      = "dashboard-rb"
    namespace = "default"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.dashboard.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.dashboard.metadata[0].name
    namespace = "default"
  }
}
```

**Deliberately NOT granted:** `pods/exec`, and any `batch`/`jobs` permission. The
dashboard does not need them (see §5) — please don't add them.

---

## 3. Required — Deployment changes

In `common/k8s/dashboard/main.tf`, the pod spec needs the ServiceAccount and the
mode env var:

```hcl
spec {
  service_account_name = kubernetes_service_account.dashboard.metadata[0].name   # NEW

  image_pull_secrets { name = var.secret_name }

  container {
    name  = "dashboard"
    image = "ghcr.io/mockten/dashboard:latest"
    port { container_port = 3001 }

    env {                       # NEW — explicit; also auto-detected in-cluster
      name  = "DEV_MODE"
      value = "false"
    }
    env {                       # NEW — optional, defaults to "default"
      name  = "K8S_NAMESPACE"
      value = "default"
    }
  }
}
```

If the deployment ever moves to a namespace other than `default`, set
`K8S_NAMESPACE` to match and scope the Role/RoleBinding to that namespace.

---

## 4. Optional — metrics-server (CPU/memory numbers)

Pod CPU/memory come from the `metrics.k8s.io` API. Without metrics-server the
dashboard **still works**: it reports zeros for CPU/memory and every other panel
is unaffected (this is handled gracefully, not an error).

If you want the CPU/Memory charts and the per-pod stats to be populated, install
metrics-server in the local cluster and keep the `metrics.k8s.io` RBAC rule
from §2.

Note: per-pod **network** counters (rx/tx) are not exposed by metrics-server, so
those read 0 in k8s by design.

---

## 5. What is intentionally disabled in k8s (no IaC action needed)

The dashboard serves `GET /api/capabilities`, and the UI hides whatever the mode
can't do. In `k8s` mode these are off — this is expected, not a bug:

| Feature | Why it's off in k8s |
|---|---|
| **Local CI Pipelines** | runs `act`, which needs Docker + the repo workspace. The cluster runs released images; CI belongs to the CI pipeline. |
| **E2E Test Runner** | `task ie2e` runs Playwright via `docker run` + the workspace. |
| **Security Scanning** | every scan needs Docker + the workspace — including DAST, which is literally `docker run … ghcr.io/zaproxy/zaproxy zap-baseline.py -t http://nginx`. **See §7.** |
| **Container start/stop** | no Kubernetes equivalent (a Pod is scheduled or gone). Restart *is* supported. |
| **Terminal / exec** | would need `pods/exec`; deliberately not granted. |
| **Sync Trigger** | execs `/sync_script.sh` inside the sync container. |
| **DB Export / Import** | shells out to `docker exec … mysqldump`. |
| **Vite frontend card/logs** | the Vite dev server only exists in DEV. In k8s the dashboard reports the **ecfront pod's** state instead. |

Everything else — Dashboard charts, Container List, Log Viewer, Topology, DB
Viewer (browse + row CRUD), API Specifications, Access Management, Model
Performance — works in k8s. **Data Pipeline needs Airflow; see §6 (parity gaps).**

---

## 6. Parity gaps found while porting (compose vs `common/k8s`)

Comparing the docker-compose services against the IaC modules, these exist in
DEV but have **no k8s module**. They matter for the "an IaC deploy reproduces
`task setup && task build` exactly" goal:

| Missing in IaC | Impact |
|---|---|
| **nginx** | The single entry point in DEV: it serves `/` (storefront), `/dashboard`, and proxies `/api/*` to Kong. Without an equivalent (an Ingress, or an nginx Deployment reusing the same config), the deployed URLs won't match DEV. The dashboard's Topology also has an `nginx` node, which will render as down. |
| **airflow-webserver / airflow-scheduler** | The dashboard's **Data Pipeline** panel calls the Airflow REST API. With no Airflow in the cluster the panel cannot work, and Topology's `airflow-web` / `airflow-sch` nodes render as down. |

**Airflow host is now configurable (mockten side, already done).** The dashboard
used a hardcoded `http://airflow-webserver:8080/api/v1` — a compose container
name that doesn't follow the `*-service.default.svc.cluster.local` convention the
rest of the platform uses, so it cannot resolve in-cluster. It now reads:

```
AIRFLOW_BASE_URL   (default: http://airflow-webserver:8080/api/v1)
AIRFLOW_USER       (default: airflow)
AIRFLOW_PASSWORD   (default: airflow)
```

So if/when Airflow is deployed, just point the dashboard at it, e.g.:

```hcl
env {
  name  = "AIRFLOW_BASE_URL"
  value = "http://airflow-webserver-service.default.svc.cluster.local:8080/api/v1"
}
```

Until Airflow exists in the cluster, the Data Pipeline panel will error — tell me
if you'd rather it be hidden in k8s like Local CI, and I'll gate it behind
`/api/capabilities` from the mockten side.

Also note `backdoor` and `ecfront` exist in IaC but not in compose (in DEV the
frontend is the host Vite dev server) — that's expected, not a gap.

---

## 7. Follow-up for the IaC/CI side — DAST

DAST was moved out of the dashboard because it cannot run from a pod under the
RBAC above. If you want ZAP against the deployed environment, please run it from
the **IaC/CI pipeline**, not the dashboard, e.g.:

```
zap-baseline.py -t http://<deployed-ingress-or-nginx-service> -r zap-report.html -I
```

as a pipeline step or a one-off `Job`. This keeps the dashboard's permissions
minimal and puts environment scanning where the deployment happens.

---

## 8. Acceptance checklist

After applying the IaC changes, the deployed dashboard should show:

- [ ] A `K8S` badge next to the view title (confirms it picked the k8s runtime).
- [ ] `GET /dashboard/api/capabilities` → `{"mode":"k8s","devMode":false,…}` with
      `ci:false`, `tests:false`, `security:[]`, `containers.startStop:false`.
- [ ] **Container List** lists the pods with state/image (Restart button only).
- [ ] **Log Viewer** streams a pod's logs.
- [ ] **Topology** shows the services as running.
- [ ] Local CI / E2E Test Runner / Security Scanning are **absent** from the nav.
- [ ] Restart on a pod deletes it and the controller recreates it.

If Container List is empty or 403s, the RBAC in §2 or the
`service_account_name` in §3 is the thing to check first.
