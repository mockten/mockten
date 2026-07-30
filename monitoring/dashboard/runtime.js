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

const os = require('os');

const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'default';

// Prefer bash when the image has it, fall back to sh. Shared by both runtimes so
// the terminal behaves the same whether it lands in a container or a pod.
const SHELL_CMD = ['/bin/sh', '-c', '[ -x /bin/bash ] && exec /bin/bash || exec /bin/sh'];

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

// ── Deployment shape — deliberately NOT the same axis as MODE ────────────────
//
// MODE answers "how do I inspect containers" (Docker socket vs Kubernetes API).
// MOCKTEN_MODE answers "what shape is this deployment" — which URLs the portals
// live on, whether the console needs a login, whether READY applies.
//
// They are orthogonal, and the combination that proves it is a *local* k8s
// cluster: MODE=k8s (talk to the API server) but MOCKTEN_MODE=dev (localhost,
// no public domain, no login). Folding one into the other would send local k8s
// down the dockerode path and break the container list, logs and terminal.
const CLOUD_MODE = String(process.env.MOCKTEN_MODE || '').trim().toLowerCase() === 'cloud';

// No scheme, no trailing dot — e.g. "mockten.dpdns.org". Only meaningful in
// cloud; the domain is never baked into an image, so the same artifact can be
// pointed at whatever domain the operator brings.
const PUBLIC_BASE_DOMAIN = String(process.env.PUBLIC_BASE_DOMAIN || '')
  .trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/\.$/, '');

/**
 * Where each surface lives. Derived from the one domain rather than injected as
 * four separate variables, so adding a cloud never means adding more config.
 * In dev everything is same-origin on localhost, which is what it is today.
 */
function publicUrls() {
  if (!CLOUD_MODE || !PUBLIC_BASE_DOMAIN) {
    return { storefront: '/', sales: '/seller/login', admin: '/admin', dashboard: '/dashboard' };
  }
  const d = PUBLIC_BASE_DOMAIN;
  return {
    storefront: `https://${d}`,
    sales: `https://sales.${d}`,
    admin: `https://admin.${d}`,
    dashboard: `https://dashboard.${d}`,
  };
}

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
    // The image version CI baked in (Dockerfile ARG APP_VERSION). Empty in DEV
    // builds, which never pass the build-arg; the UI only shows it when set.
    appVersion: process.env.APP_VERSION || null,
    // Deployment shape (see CLOUD_MODE) — separate from `mode` above, which is
    // the container runtime.
    deployment: CLOUD_MODE ? 'cloud' : 'dev',
    publicBaseDomain: PUBLIC_BASE_DOMAIN || null,
    urls: publicUrls(),
    // The console is only exposed to the internet in cloud, so that's the only
    // place it demands a login.
    authRequired: CLOUD_MODE,
    containers: {
      list: true,
      logs: true,
      stats: true,
      restart: true,
      startStop: DEV_MODE, // no k8s equivalent (a Pod is scheduled or gone)
      // `kubectl exec` equivalent; needs pods/exec RBAC in the cluster.
      exec: true,
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
        // Per-container ceiling — drives this row's own bar.
        memLimit: mem.limit || 0,
        memPercent: mem.limit ? ((mem.usage / mem.limit) * 100).toFixed(2) : 0,
        rxBytes, txBytes,
      };
    },

    /**
     * Denominator for "Total Memory Usage": what this stack is *allowed* to use.
     * In compose that's the sum of the per-service mem_limit values — the budget
     * we handed the stack — which is the Docker analogue of a namespace's
     * ResourceQuota. A service with no mem_limit can use the whole machine, so
     * the total is capped there; it can never exceed the machine.
     */
    async memCapacity() {
      const machine = os.totalmem();
      try {
        const containers = await docker.listContainers({ all: false });
        const limits = await Promise.all(containers.map(async c => {
          try {
            const info = await docker.getContainer(c.Id).inspect();
            const lim = info?.HostConfig?.Memory || 0; // 0 = unlimited
            return lim > 0 ? lim : machine;
          } catch { return 0; }
        }));
        const sum = limits.reduce((a, b) => a + b, 0);
        if (sum > 0) {
          return sum < machine
            ? { bytes: sum, source: 'compose mem_limit total' }
            : { bytes: machine, source: 'machine memory (limits exceed it)' };
        }
      } catch { /* fall through */ }
      return { bytes: machine, source: 'machine memory' };
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

    /**
     * Run a command in a container and return its stdout.
     * Docker frames exec output with an 8-byte stdout/stderr header even when a
     * TTY is requested, so strip it — otherwise the header bytes land inside the
     * first line and corrupt whatever parses it.
     */
    async execCapture(id, cmd) {
      const exec = await docker.getContainer(id).exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
      });
      const stream = await exec.start({});
      const raw = await new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      let out = '';
      let offset = 0;
      while (offset + 8 <= raw.length) {
        const size = raw.readUInt32BE(offset + 4);
        if (offset + 8 + size > raw.length) break;
        out += raw.slice(offset + 8, offset + 8 + size).toString('utf8');
        offset += 8 + size;
      }
      // If it wasn't framed after all, don't silently return nothing.
      return offset === 0 ? raw.toString('utf8') : out;
    },

    /** Interactive shell. Returns a handle to write stdin and tear the session down. */
    async execStream(id, cols, rows, onText, onError, onEnd) {
      const container = docker.getContainer(id);
      const exec = await container.exec({
        Cmd: SHELL_CMD,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
      });
      const stream = await exec.start({ hijack: true, stdin: true });
      try {
        await exec.resize({ w: cols, h: rows });
      } catch (e) {
        console.warn('Failed to resize terminal:', e.message);
      }
      stream.on('data', chunk => onText(chunk.toString('utf8')));
      stream.on('end', () => onEnd());
      stream.on('error', e => onError(e));
      return {
        write: data => { if (stream.writable) stream.write(data); },
        destroy: () => { try { stream.destroy?.(); } catch { /* already gone */ } },
      };
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

      // Denominators. Pods here usually declare no resource limits, and using a
      // missing limit made CPU read >100% (the caller divides by numCpus) and
      // memory read 0% (divide by a zero limit). Fall back to the node's own
      // capacity, which os.cpus()/os.totalmem() report from inside a pod — that
      // needs no extra RBAC, unlike reading the Node object.
      const podCpuLimit = (pod?.spec?.containers || []).reduce(
        (sum, c) => sum + (cpuToCores(c.resources?.limits?.cpu) || 0), 0);
      const podMemLimit = (pod?.spec?.containers || []).reduce(
        (sum, c) => sum + memToBytes(c.resources?.limits?.memory), 0);
      const numCpus = podCpuLimit || os.cpus().length || 1;
      const memLimit = podMemLimit || os.totalmem() || 0;

      return {
        // Percent of a single core, matching the Docker runtime's semantics.
        cpu: (cores * 100).toFixed(2),
        numCpus,
        memUsage,
        memLimit,
        memPercent: memLimit ? ((memUsage / memLimit) * 100).toFixed(2) : 0,
        // Per-pod network counters aren't exposed by metrics-server.
        rxBytes: 0, txBytes: 0,
      };
    },

    /**
     * Denominator for "Total Memory Usage": the memory this namespace is allotted.
     *
     * Read it from the namespace's ResourceQuota, not from a node. The node's
     * capacity only happens to be right on a single-node cluster (docker-desktop):
     * on GKE/EKS/AKS the pods are spread over many nodes, so dividing the whole
     * namespace's usage by whichever node the dashboard landed on inflates the
     * figure — and on a heterogeneous node pool the number would even change with
     * rescheduling. A quota is namespace-scoped, so reading it needs no
     * ClusterRole, and "% of what we were allotted" means the same thing on every
     * cluster.
     *
     * Falls back to the node's memory when no quota exists, which keeps a
     * quota-less local cluster reading sensibly.
     */
    async memCapacity() {
      try {
        const { core } = await init();
        const res = await core.listNamespacedResourceQuota({ namespace: K8S_NAMESPACE });
        for (const q of res.items || []) {
          const hard = q.status?.hard || q.spec?.hard || {};
          const v = hard['limits.memory'] || hard['requests.memory'];
          if (v) {
            return {
              bytes: memToBytes(v),
              source: `ResourceQuota ${q.metadata?.name} (${K8S_NAMESPACE})`,
            };
          }
        }
      } catch (e) {
        // No quota, or no RBAC to read one — fall back rather than break the chart.
        console.warn('[runtime] ResourceQuota unavailable:', e.message);
      }
      return {
        bytes: os.totalmem(),
        source: 'node memory (no ResourceQuota; single-node only)',
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

    /** Run a command in a pod and return its stdout (`kubectl exec` equivalent). */
    async execCapture(id, cmd) {
      const { k8s, kc, core } = await init();
      const { PassThrough } = require('stream');

      const pod = await core.readNamespacedPod({ name: id, namespace: K8S_NAMESPACE });
      const container = pod?.spec?.containers?.[0]?.name;
      if (!container) throw new Error(`no container found on pod ${id}`);

      const stdout = new PassThrough();
      const stderr = new PassThrough();
      let out = '';
      stdout.on('data', chunk => { out += chunk.toString('utf8'); });

      return await new Promise((resolve, reject) => {
        new k8s.Exec(kc)
          .exec(K8S_NAMESPACE, id, container, cmd, stdout, stderr, null, false, () => resolve(out))
          .then(conn => conn.on?.('error', reject))
          .catch(reject);
      });
    },

    /** Interactive shell, the Kubernetes equivalent of `kubectl exec -it`. */
    async execStream(id, cols, rows, onText, onError, onEnd) {
      const { k8s, kc, core } = await init();
      const { PassThrough } = require('stream');

      const pod = await core.readNamespacedPod({ name: id, namespace: K8S_NAMESPACE });
      const container = pod?.spec?.containers?.[0]?.name;
      if (!container) throw new Error(`no container found on pod ${id}`);

      const stdin = new PassThrough();
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      stdout.on('data', chunk => onText(chunk.toString('utf8')));
      stderr.on('data', chunk => onText(chunk.toString('utf8')));

      // Note: cols/rows are accepted for parity with the Docker runtime but not
      // applied — resizing needs the exec channel's dedicated resize stream, and
      // the shell simply uses its default geometry.
      const conn = await new k8s.Exec(kc).exec(
        K8S_NAMESPACE, id, container, SHELL_CMD,
        stdout, stderr, stdin, true /* tty */,
        () => onEnd(),
      );
      conn.on?.('error', e => onError(e));

      return {
        write: data => { try { stdin.write(data); } catch (e) { onError(e); } },
        destroy: () => {
          try { conn?.close?.(); } catch { /* already closed */ }
          try { stdin.end(); } catch { /* already ended */ }
        },
      };
    },
  };
}

// ── Export a single runtime for the selected mode ────────────────────────────

const runtime = DEV_MODE ? createDockerRuntime() : createK8sRuntime();

module.exports = {
  runtime, capabilities, canonicalKey, publicUrls,
  DEV_MODE, MODE, K8S_NAMESPACE,
  CLOUD_MODE, PUBLIC_BASE_DOMAIN,
};
