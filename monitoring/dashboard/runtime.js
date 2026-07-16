'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Container-runtime abstraction for the Developer Dashboard.
//
// The dashboard runs in two shapes:
//
//   DEV  (docker) — `task setup && task build`. The dashboard talks to the local
//                   Docker daemon over /var/run/docker.sock and has the repo
//                   workspace mounted, so it can also run `act`, Playwright and
//                   the security scans.
//   K8s  (deploy) — deployed by the IaC repo. There is no Docker socket and no
//                   workspace; container introspection goes through the
//                   Kubernetes API instead, and the workspace-dependent panels
//                   are switched off (see capabilities()).
//
// Everything else (MySQL/Redis/MinIO/service HTTP) already resolves through
// k8s-style DNS names such as `mysql-service.default.svc.cluster.local`, which
// docker-compose mirrors via container_name — so those paths need no branching.
// ─────────────────────────────────────────────────────────────────────────────

const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';

/**
 * DEV_MODE decides which runtime we use.
 * - Explicit DEV_MODE=true/false always wins.
 * - Otherwise auto-detect: every pod gets KUBERNETES_SERVICE_HOST, so its
 *   presence means we're running in-cluster.
 */
function detectDevMode() {
  const v = String(process.env.DEV_MODE || '').trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return !process.env.KUBERNETES_SERVICE_HOST;
}

const DEV_MODE = detectDevMode();
const MODE = DEV_MODE ? 'docker' : 'k8s';

/**
 * Canonical service key shared by both runtimes, so callers (topology, UI) can
 * identify a service without caring how it is packaged.
 *   docker "mysql-service.default.svc.cluster.local" → "mysql"
 *   docker "mockten-sync"                            → "sync"
 *   k8s    pod label app=mysql                       → "mysql"
 */
function canonicalKey(name) {
  if (!name) return '';
  return String(name)
    .replace(/^\//, '')
    .replace(/\.default\.svc\.cluster\.local$/, '')
    .replace(/-service$/, '')
    .replace(/^mockten-/, '');
}

/**
 * What the UI is allowed to show. In k8s the workspace/Docker-dependent panels
 * are unavailable by design: the cluster runs released images, so Local CI and
 * the E2E runner belong to CI/dev, and only DAST makes sense against a
 * deployed URL. Container start/stop has no Kubernetes equivalent (a Pod is
 * either scheduled or gone), so only Restart is offered.
 */
function capabilities() {
  return {
    mode: MODE,
    devMode: DEV_MODE,
    containers: {
      list: true,
      logs: true,
      stats: true,
      restart: true,
      startStop: DEV_MODE, // no k8s equivalent
      exec: DEV_MODE,      // would need pods/exec RBAC; intentionally not granted
    },
    syncTrigger: DEV_MODE,     // needs exec into the sync container
    dbExportImport: DEV_MODE,  // needs exec into the mysql container (mysqldump)
    frontendDev: DEV_MODE,     // the Vite dev server only exists in DEV
    ci: DEV_MODE,              // `act` needs Docker + the repo workspace
    tests: DEV_MODE,           // Playwright runner needs Docker + the workspace
    // Every scan (including DAST, which is `docker run zaproxy …`) needs Docker
    // and the workspace, so none can run from a Pod. Scanning a deployed
    // environment belongs to the IaC/CI pipeline instead.
    security: DEV_MODE ? ['trivy', 'sca', 'sast', 'dast', 'all'] : [],
  };
}

// ── Docker runtime (DEV) ─────────────────────────────────────────────────────

function createDockerRuntime() {
  const Docker = require('dockerode');
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });

  function calcCpuPercent(stats) {
    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const sysDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cores =
      stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    if (sysDelta > 0 && cpuDelta > 0) return (cpuDelta / sysDelta) * cores * 100;
    return 0;
  }

  return {
    mode: 'docker',
    raw: docker,

    async list() {
      const containers = await docker.listContainers({ all: true });
      return containers.map(c => {
        const name = c.Names[0].replace(/^\//, '');
        return {
          id: c.Id.slice(0, 12),
          name,
          key: canonicalKey(name),
          image: c.Image,
          status: c.Status,
          state: c.State,
        };
      });
    },

    async stats(id) {
      const stats = await docker.getContainer(id).stats({ stream: false });
      const cpu = calcCpuPercent(stats);
      const numCpus =
        stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
      const mem = stats.memory_stats || {};
      let rxBytes = 0, txBytes = 0;
      Object.values(stats.networks || {}).forEach(n => {
        rxBytes += n.rx_bytes; txBytes += n.tx_bytes;
      });
      return {
        cpu: cpu.toFixed(2),
        numCpus,
        memUsage: mem.usage || 0,
        memLimit: mem.limit || 0,
        memPercent: mem.limit ? ((mem.usage / mem.limit) * 100).toFixed(2) : 0,
        rxBytes, txBytes,
      };
    },

    async start(id)   { await docker.getContainer(id).start(); },
    async stop(id)    { await docker.getContainer(id).stop(); },
    async restart(id) { await docker.getContainer(id).restart(); },

    /**
     * Text log stream. Docker multiplexes stdout/stderr with an 8-byte frame
     * header, so demux here and hand callers plain text — the k8s runtime emits
     * plain text natively, keeping both sides identical.
     */
    async logStream(id, tail, onText, onError, onEnd) {
      const stream = await docker
        .getContainer(id)
        .logs({ stdout: true, stderr: true, follow: true, tail, timestamps: true });

      stream.on('data', chunk => {
        let offset = 0;
        while (offset < chunk.length) {
          if (chunk.length - offset < 8) break;
          const size = chunk.readUInt32BE(offset + 4);
          if (chunk.length - offset - 8 < size) break;
          onText(chunk.slice(offset + 8, offset + 8 + size).toString('utf8'));
          offset += 8 + size;
        }
      });
      stream.on('error', e => onError(e));
      stream.on('end', () => onEnd());
      return { destroy: () => { try { stream.destroy?.(); } catch { /* already gone */ } } };
    },
  };
}

// ── Kubernetes runtime (deployed) ────────────────────────────────────────────

function createK8sRuntime() {
  // @kubernetes/client-node is pure ESM, so it is pulled in with a lazy dynamic
  // import() rather than require(): require(esm) only works on very recent Node
  // and is still flagged experimental. Every method here is async anyway, and
  // this keeps the module off the DEV path entirely.
  let ctx = null;
  async function init() {
    if (ctx) return ctx;
    const k8s = await import('@kubernetes/client-node');
    const kc = new k8s.KubeConfig();
    kc.loadFromCluster(); // uses the pod's ServiceAccount token + CA
    ctx = {
      k8s,
      kc,
      core: kc.makeApiClient(k8s.CoreV1Api),
      logApi: new k8s.Log(kc),
    };
    return ctx;
  }

  const phaseToState = phase => {
    switch (phase) {
      case 'Running':   return 'running';
      case 'Succeeded': return 'exited';
      case 'Failed':    return 'exited';
      case 'Pending':   return 'created';
      default:          return String(phase || '').toLowerCase();
    }
  };

  // Pods are named "<deploy>-<replicaset>-<rand>"; prefer the app label.
  const podKey = pod =>
    canonicalKey(pod.metadata?.labels?.app || pod.metadata?.generateName || pod.metadata?.name || '');

  async function listPods() {
    const { core } = await init();
    const res = await core.listNamespacedPod({ namespace: K8S_NAMESPACE });
    return res.items || [];
  }

  async function podMetrics() {
    // metrics-server is optional; without it we simply report zeros.
    try {
      const { k8s, kc } = await init();
      const metrics = new k8s.Metrics(kc);
      const res = await metrics.getPodMetrics(K8S_NAMESPACE);
      const byPod = {};
      (res.items || []).forEach(m => { byPod[m.metadata.name] = m; });
      return byPod;
    } catch {
      return {};
    }
  }

  // "123456n" (nanocores) / "500m" (millicores) → cores
  const cpuToCores = v => {
    if (!v) return 0;
    const s = String(v);
    if (s.endsWith('n')) return parseFloat(s) / 1e9;
    if (s.endsWith('u')) return parseFloat(s) / 1e6;
    if (s.endsWith('m')) return parseFloat(s) / 1e3;
    return parseFloat(s) || 0;
  };

  // "128Mi" / "1Gi" / "1000000" → bytes
  const memToBytes = v => {
    if (!v) return 0;
    const s = String(v);
    const units = { Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, K: 1e3, M: 1e6, G: 1e9 };
    for (const [suffix, mult] of Object.entries(units)) {
      if (s.endsWith(suffix)) return parseFloat(s) * mult;
    }
    return parseFloat(s) || 0;
  };

  return {
    mode: 'k8s',
    raw: null,

    async list() {
      const pods = await listPods();
      return pods.map(p => {
        const cs = p.status?.containerStatuses?.[0];
        const restarts = cs?.restartCount ?? 0;
        const phase = p.status?.phase;
        return {
          // The pod name is the handle for logs/restart, mirroring docker's id.
          id: p.metadata.name,
          name: p.metadata.name,
          key: podKey(p),
          image: cs?.image || p.spec?.containers?.[0]?.image || '',
          status: `${phase}${restarts ? ` (${restarts} restarts)` : ''}`,
          state: phaseToState(phase),
        };
      });
    },

    async stats(id) {
      const { core } = await init();
      const [pod, metricsByPod] = await Promise.all([
        core.readNamespacedPod({ name: id, namespace: K8S_NAMESPACE }).catch(() => null),
        podMetrics(),
      ]);
      const m = metricsByPod[id];
      const cores = (m?.containers || []).reduce((sum, c) => sum + cpuToCores(c.usage?.cpu), 0);
      const memUsage = (m?.containers || []).reduce((sum, c) => sum + memToBytes(c.usage?.memory), 0);
      const memLimit = (pod?.spec?.containers || []).reduce(
        (sum, c) => sum + memToBytes(c.resources?.limits?.memory), 0);
      const numCpus = (pod?.spec?.containers || []).reduce(
        (sum, c) => sum + (cpuToCores(c.resources?.limits?.cpu) || 0), 0) || 1;

      return {
        cpu: (cores * 100).toFixed(2),
        numCpus,
        memUsage,
        memLimit,
        memPercent: memLimit ? ((memUsage / memLimit) * 100).toFixed(2) : 0,
        // Per-pod network counters aren't exposed by metrics-server.
        rxBytes: 0, txBytes: 0,
      };
    },

    async start() { throw new Error('start is not supported on Kubernetes'); },
    async stop()  { throw new Error('stop is not supported on Kubernetes'); },

    // A Pod has no restart verb: delete it and let the controller recreate it.
    async restart(id) {
      const { core } = await init();
      await core.deleteNamespacedPod({ name: id, namespace: K8S_NAMESPACE });
    },

    async logStream(id, tail, onText, onError, onEnd) {
      const { core, logApi } = await init();
      const { PassThrough } = require('stream');
      const stream = new PassThrough();
      stream.on('data', chunk => onText(chunk.toString('utf8')));
      stream.on('error', e => onError(e));
      stream.on('end', () => onEnd());

      let req;
      try {
        // The client sets ?container= unconditionally, so it must be a real
        // name — passing undefined would request "container=undefined" and the
        // API would reject it. Our pods are single-container; take the first.
        const pod = await core.readNamespacedPod({ name: id, namespace: K8S_NAMESPACE });
        const container = pod?.spec?.containers?.[0]?.name;
        if (!container) throw new Error(`no container found on pod ${id}`);

        req = await logApi.log(K8S_NAMESPACE, id, container, stream, {
          follow: true,
          tailLines: tail,
          timestamps: true,
        });
      } catch (e) {
        onError(e);
      }
      return {
        destroy: () => {
          try { req?.abort?.(); } catch { /* already finished */ }
          try { stream.destroy(); } catch { /* already destroyed */ }
        },
      };
    },
  };
}

// ── Export a single runtime for the selected mode ────────────────────────────

const runtime = DEV_MODE ? createDockerRuntime() : createK8sRuntime();

module.exports = { runtime, capabilities, canonicalKey, DEV_MODE, MODE, K8S_NAMESPACE };
