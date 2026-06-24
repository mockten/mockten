const express = require('express');
const Docker = require('dockerode');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');
const fs = require('fs');
const net = require('net');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const { MongoClient } = require('mongodb');

const app = express();
app.use(express.json());

// ── DB connections ────────────────────────────────────────────────────────────
const MYSQL_CONFIG = {
  host:     'mysql-service.default.svc.cluster.local',
  port:     3306,
  user:     'mocktenusr',
  password: 'mocktenpassword',
  database: 'mocktendb',
  connectTimeout: 5000,
};

// Reuse a pool instead of creating a new connection per request
const mysqlPool = mysql.createPool({
  ...MYSQL_CONFIG,
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

function getRedis() {
  return new Redis({
    host: 'redis-service.default.svc.cluster.local',
    port: 6379,
    password: 'mocktenpass',
    connectTimeout: 3000,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
}

const MONGO_CONFIG = {
  url: 'mongodb://bar:bar@mongo-service.default.svc.cluster.local:27017/?authSource=admin',
  dbName: 'product_info',
};

async function withMongoClient(fn) {
  const client = new MongoClient(MONGO_CONFIG.url, { connectTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(MONGO_CONFIG.dbName);
    return await fn(db);
  } finally {
    await client.close().catch(() => {});
  }
}

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

app.use(express.static(path.join(__dirname, 'public')));

// ── Containers ────────────────────────────────────────────────────────────────
app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers.map(c => ({
      id: c.Id.slice(0, 12),
      name: c.Names[0].replace(/^\//, ''),
      image: c.Image,
      status: c.Status,
      state: c.State,
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: service topology (static graph derived from docker-compose architecture)
// ── MySQL DB API ──────────────────────────────────────────────────────────────
const ALLOWED_TABLES = [
  'Product','Stock','Category','Seller','Order','Transaction',
  'Payment','PaymentProfile','PaymentMethod','Review',
  'TimeSale','Wishlist','Geo','ShippingRate','DomesticAirCost','SeaCost','AirCost',
];

app.get('/api/db/mysql/tables', async (req, res) => {
  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const [rows] = await conn.query(
      `SELECT TABLE_NAME as name, TABLE_ROWS as approxRows
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [MYSQL_CONFIG.database]
    );
    const allowed = rows.filter(r => ALLOWED_TABLES.includes(r.name));
    res.json(allowed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/db/mysql/table/:table', async (req, res) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Table not allowed' });
  const limit  = Math.min(parseInt(req.query.limit  || 50), 200);
  const offset = parseInt(req.query.offset || 0);
  const search = req.query.search || '';

  let conn;
  try {
    conn = await mysqlPool.getConnection();
    // Get column names and metadata
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [MYSQL_CONFIG.database, table]
    );
    const columns = cols.map(c => c.COLUMN_NAME);
    const columnMeta = Object.fromEntries(cols.map(c => [c.COLUMN_NAME, {
      dataType: c.DATA_TYPE,
      nullable: c.IS_NULLABLE === 'YES',
      hasDefault: c.COLUMN_DEFAULT !== null || (c.EXTRA || '').includes('auto_increment'),
    }]));

    const [pkRows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
       ORDER BY ORDINAL_POSITION`,
      [MYSQL_CONFIG.database, table]
    );
    const primaryKeys = pkRows.map(r => r.COLUMN_NAME);

    let countSql = `SELECT COUNT(*) as total FROM \`${table}\``;
    let dataSql  = `SELECT * FROM \`${table}\``;
    const params = [];

    if (search && columns.length > 0) {
      const conditions = columns.slice(0, 5).map(c => `\`${c}\` LIKE ?`).join(' OR ');
      const like = `%${search}%`;
      const likeParams = columns.slice(0, 5).map(() => like);
      countSql += ` WHERE ${conditions}`;
      dataSql  += ` WHERE ${conditions}`;
      params.push(...likeParams);
    }

    dataSql += ` LIMIT ? OFFSET ?`;

    const [[{ total }]] = await conn.query(countSql, params);
    const [rows] = await conn.query(dataSql, [...params, limit, offset]);
    res.json({ columns, columnMeta, primaryKeys, rows, total, limit, offset });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/db/mysql/table/:table', async (req, res) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Table not allowed' });
  const row = req.body;
  if (!row || Object.keys(row).length === 0) return res.status(400).json({ error: 'Row data required' });

  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const keys = Object.keys(row);
    const values = Object.values(row);
    const columnsString = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO \`${table}\` (${columnsString}) VALUES (${placeholders})`;

    await conn.query(sql, values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/db/mysql/table/:table', async (req, res) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Table not allowed' });
  // Support composite PK via pkNames[]=col1&pkNames[]=col2&pkValues[]=v1&pkValues[]=v2
  // or legacy single: pkName=col&pkValue=val
  const { pkName, pkValue } = req.query;
  const rawPkNames = req.query.pkNames ?? req.query['pkNames[]'];
  const rawPkValues = req.query.pkValues ?? req.query['pkValues[]'];
  const pkNames = rawPkNames ? [].concat(rawPkNames) : (pkName ? [pkName] : []);
  const pkValues = rawPkValues ? [].concat(rawPkValues) : (pkValue !== undefined ? [pkValue] : []);
  if (pkNames.length === 0) return res.status(400).json({ error: 'primary key info required' });

  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const whereClause = pkNames.map(k => `\`${k}\` = ?`).join(' AND ');
    const sql = `DELETE FROM \`${table}\` WHERE ${whereClause}`;
    await conn.query(sql, pkValues);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});

app.put('/api/db/mysql/table/:table', async (req, res) => {
  const table = req.params.table;
  if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Table not allowed' });
  // Support both single PK (legacy: pkName/pkValue) and composite PK (pkNames/pkValues)
  const { row, pkName, pkValue, pkNames, pkValues } = req.body;
  if (!row) return res.status(400).json({ error: 'row required' });

  const pks = pkNames || (pkName ? [pkName] : []);
  const vals = pkValues || (pkValue !== undefined ? [pkValue] : []);
  if (pks.length === 0) return res.status(400).json({ error: 'primary key info required' });

  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const pkSet = new Set(pks);
    const keys = Object.keys(row).filter(k => !pkSet.has(k));
    const values = keys.map(k => row[k]);
    const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
    const whereClause = pks.map(k => `\`${k}\` = ?`).join(' AND ');
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;

    await conn.query(sql, [...values, ...vals]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (conn) conn.release();
  }
});

// ── Redis DB API ──────────────────────────────────────────────────────────────
app.get('/api/db/redis/keys', async (req, res) => {
  const pattern = req.query.pattern || '*';
  const r = getRedis();
  try {
    await r.connect();
    const info = await r.info('keyspace');
    const keys = [];
    let cursor = '0';
    do {
      const [next, batch] = await r.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
      if (keys.length >= 500) break;
    } while (cursor !== '0');
    const dbInfo = info.match(/keys=(\d+)/)?.[1] || '?';
    res.json({ keys: keys.slice(0, 500), total: parseInt(dbInfo) || keys.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    r.disconnect();
  }
});

app.get('/api/db/redis/key', async (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'key required' });
  const r = getRedis();
  try {
    await r.connect();
    const type = await r.type(key);
    const ttl  = await r.ttl(key);
    let value;
    if (type === 'string') {
      value = await r.get(key);
    } else if (type === 'hash') {
      value = await r.hgetall(key);
    } else if (type === 'list') {
      value = await r.lrange(key, 0, 99);
    } else if (type === 'set') {
      value = await r.smembers(key);
    } else if (type === 'zset') {
      const raw = await r.zrangebyscore(key, '-inf', '+inf', 'WITHSCORES', 'LIMIT', 0, 50);
      value = [];
      for (let i = 0; i < raw.length; i += 2) value.push({ member: raw[i], score: raw[i+1] });
    } else {
      value = null;
    }
    res.json({ key, type, ttl, value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    r.disconnect();
  }
});

// ── MongoDB DB API ────────────────────────────────────────────────────────────
app.get('/api/db/mongo/collections', async (req, res) => {
  try {
    const result = await withMongoClient(async (db) => {
      const collections = await db.listCollections().toArray();
      const counts = [];
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        counts.push({ name: col.name, approxRows: count });
      }
      counts.sort((a, b) => a.name.localeCompare(b.name));
      return counts;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/db/mongo/collection/:collection', async (req, res) => {
  const collectionName = req.params.collection;
  const limit  = Math.min(parseInt(req.query.limit  || 50), 200);
  const offset = parseInt(req.query.offset || 0);
  const search = req.query.search || '';

  try {
    const result = await withMongoClient(async (db) => {
      const col = db.collection(collectionName);
      let filter = {};
      if (search) {
        filter = {
          $or: [
            { product_id: { $regex: search, $options: 'i' } },
            { product_name: { $regex: search, $options: 'i' } },
            { seller_name: { $regex: search, $options: 'i' } },
            { summary: { $regex: search, $options: 'i' } },
            { detail: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const total = await col.countDocuments(filter);
      const rows = await col.find(filter).skip(offset).limit(limit).toArray();

      const colSet = new Set();
      rows.forEach(row => {
        Object.keys(row).forEach(k => colSet.add(k));
      });
      const columns = Array.from(colSet);
      const idIdx = columns.indexOf('_id');
      if (idIdx > -1) {
        columns.splice(idIdx, 1);
        columns.unshift('_id');
      }

      return { columns, rows, total, limit, offset };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/db/mongo/collection/:collection', async (req, res) => {
  const collectionName = req.params.collection;
  const doc = req.body;
  if (!doc || Object.keys(doc).length === 0) return res.status(400).json({ error: 'Document data required' });

  try {
    const result = await withMongoClient(async (db) => {
      const cleanedDoc = {};
      for (const [k, v] of Object.entries(doc)) {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              cleanedDoc[k] = JSON.parse(trimmed);
              continue;
            } catch (e) {}
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            const parsedDate = new Date(trimmed);
            if (!isNaN(parsedDate.getTime())) {
              cleanedDoc[k] = parsedDate;
              continue;
            }
          }
        }
        cleanedDoc[k] = v;
      }

      const col = db.collection(collectionName);
      const resVal = await col.insertOne(cleanedDoc);
      return { ok: true, insertedId: resVal.insertedId };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/db/mongo/collection/:collection', async (req, res) => {
  const collectionName = req.params.collection;
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const result = await withMongoClient(async (db) => {
      const { ObjectId } = require('mongodb');
      let filter = {};
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { _id: id };
      }

      const col = db.collection(collectionName);
      const resVal = await col.deleteOne(filter);
      return { ok: true, deletedCount: resVal.deletedCount };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/db/mongo/collection/:collection', async (req, res) => {
  const collectionName = req.params.collection;
  const { id, doc } = req.body;
  if (!id || !doc) return res.status(400).json({ error: 'id and doc required' });

  try {
    const result = await withMongoClient(async (db) => {
      const { ObjectId } = require('mongodb');
      let filter = {};
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { _id: id };
      }

      const cleanedDoc = {};
      for (const [k, v] of Object.entries(doc)) {
        if (k === '_id') continue;
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
              cleanedDoc[k] = JSON.parse(trimmed);
              continue;
            } catch (e) {}
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            const parsedDate = new Date(trimmed);
            if (!isNaN(parsedDate.getTime())) {
              cleanedDoc[k] = parsedDate;
              continue;
            }
          }
        }
        cleanedDoc[k] = v;
      }

      const col = db.collection(collectionName);
      const resVal = await col.updateOne(filter, { $set: cleanedDoc });
      return { ok: true, matchedCount: resVal.matchedCount, modifiedCount: resVal.modifiedCount };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

let _topologyCache = null;
let _topologyCacheAt = 0;
const TOPOLOGY_CACHE_TTL = 10000; // 10 seconds

app.get('/api/topology', async (req, res) => {
  try {
    if (_topologyCache && Date.now() - _topologyCacheAt < TOPOLOGY_CACHE_TTL) {
      return res.json(_topologyCache);
    }
    const running = await docker.listContainers({ all: true });
    const stateMap = {};
    running.forEach(c => {
      const name = c.Names[0].replace(/^\//, '');
      stateMap[name] = c.State;
    });

    // Nodes — short display label + full container name
    const nodes = [
      { id: 'nginx',          label: 'nginx\n(gateway)',     group: 'gateway'  },
      { id: 'frontend',       label: '⚡ Vite\nFrontend',   group: 'frontend' },
      { id: 'apigw',          label: 'apigw\n(Kong)',        group: 'gateway'  },
      { id: 'uam',            label: 'uam\n(Keycloak)',      group: 'auth'     },
      { id: 'mysql',          label: 'MySQL',                group: 'data'     },
      { id: 'redis',          label: 'Redis',                group: 'data'     },
      { id: 'minio',          label: 'MinIO',                group: 'data'     },
      { id: 'meilisearch',    label: 'Meilisearch',          group: 'data'     },
      { id: 'searchitem',     label: 'searchitem\nsvc',      group: 'service'  },
      { id: 'product',        label: 'product\nsvc',         group: 'service'  },
      { id: 'cart',           label: 'cart\nsvc',            group: 'service'  },
      { id: 'ranking',        label: 'ranking\nsvc',         group: 'service'  },
      { id: 'sale',           label: 'sale\nsvc',            group: 'service'  },
      { id: 'ecpay',          label: 'ecpay\nsvc',           group: 'service'  },
      { id: 'shipment',       label: 'shipment\nsvc',        group: 'service'  },
      { id: 'geocoding',      label: 'geocoding\nsvc',       group: 'service'  },
      { id: 'recommendation', label: 'recommendation\nsvc',  group: 'service'  },
      { id: 'sync',           label: 'mockten\nsync',        group: 'service'  },
      { id: 'dashboard',      label: 'dashboard\n(this)',    group: 'meta'     },
      { id: 'airflow-web',    label: 'Airflow\nWebserver',   group: 'pipeline' },
      { id: 'airflow-sch',    label: 'Airflow\nScheduler',   group: 'pipeline' },
      { id: 'mongodb',        label: 'MongoDB',               group: 'data'     },
    ];

    // Container name mapping for state lookup
    const containerName = {
      nginx:          'nginx',
      apigw:          'apigw',
      uam:            'uam-service.default.svc.cluster.local',
      mysql:          'mysql-service.default.svc.cluster.local',
      redis:          'redis-service.default.svc.cluster.local',
      minio:          'minio-service.default.svc.cluster.local',
      meilisearch:    'meilisearch-service.default.svc.cluster.local',
      searchitem:     'searchitem-service.default.svc.cluster.local',
      product:        'product-service.default.svc.cluster.local',
      cart:           'cart-service.default.svc.cluster.local',
      ranking:        'ranking-service.default.svc.cluster.local',
      sale:           'sale-service.default.svc.cluster.local',
      ecpay:          'ecpay-service.default.svc.cluster.local',
      shipment:       'shipment-service.default.svc.cluster.local',
      geocoding:      'geocoding-service.default.svc.cluster.local',
      recommendation: 'recommendation-service.default.svc.cluster.local',
      sync:           'mockten-sync',
      dashboard:      'mockten-dashboard',
      'airflow-web':  'airflow-webserver',
      'airflow-sch':  'airflow-scheduler',
      mongodb:        'mongo-service.default.svc.cluster.local',
    };

    // Edges derived from environment variables + known architecture
    const edges = [
      // Client → nginx
      { source: 'frontend',       target: 'nginx' },
      // nginx routes
      { source: 'nginx',          target: 'apigw' },
      { source: 'nginx',          target: 'uam' },
      { source: 'nginx',          target: 'dashboard' },
      // apigw → microservices
      { source: 'apigw',          target: 'searchitem' },
      { source: 'apigw',          target: 'product' },
      { source: 'apigw',          target: 'cart' },
      { source: 'apigw',          target: 'ranking' },
      { source: 'apigw',          target: 'sale' },
      { source: 'apigw',          target: 'ecpay' },
      { source: 'apigw',          target: 'shipment' },
      { source: 'apigw',          target: 'geocoding' },
      { source: 'apigw',          target: 'recommendation' },
      // data dependencies (from env vars)
      { source: 'ranking',        target: 'mysql' },
      { source: 'ranking',        target: 'redis' },
      { source: 'ecpay',          target: 'mysql' },
      { source: 'ecpay',          target: 'ranking' },
      { source: 'sale',           target: 'mysql' },
      { source: 'sale',           target: 'meilisearch' },
      { source: 'shipment',       target: 'mysql' },
      { source: 'recommendation', target: 'mysql' },
      { source: 'recommendation', target: 'minio' },
      { source: 'recommendation', target: 'ranking' },
      { source: 'sync',           target: 'mysql' },
      { source: 'sync',           target: 'meilisearch' },
      { source: 'sync',           target: 'redis' },
      { source: 'searchitem',     target: 'meilisearch' },
      { source: 'product',        target: 'minio' },
      // dashboard monitors everything
      { source: 'dashboard',      target: 'mysql',        dashed: true },
      { source: 'dashboard',      target: 'mongodb',      dashed: true },
      // Airflow pipeline
      { source: 'dashboard',      target: 'airflow-web',  dashed: true },
      { source: 'airflow-web',    target: 'mysql' },
      { source: 'airflow-sch',    target: 'mysql' },
      { source: 'airflow-sch',    target: 'minio' },
      { source: 'airflow-web',    target: 'airflow-sch',  dashed: true },
    ];

    // Attach live state to each node
    nodes.forEach(n => {
      if (n.id === 'frontend') {
        // Checked separately; we'll mark unknown here, client will overlay with fetchFrontendStatus
        n.state = 'frontend';
      } else {
        const cname = containerName[n.id];
        n.state = cname ? (stateMap[cname] || 'exited') : 'unknown';
      }
    });

    const result = { nodes, edges };
    _topologyCache = result;
    _topologyCacheAt = Date.now();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/containers/:id/stats', async (req, res) => {
  try {
    const stats = await docker.getContainer(req.params.id).stats({ stream: false });
    const cpu = calcCpuPercent(stats);
    const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const mem = stats.memory_stats;
    const networks = stats.networks || {};
    let rxBytes = 0, txBytes = 0;
    Object.values(networks).forEach(n => { rxBytes += n.rx_bytes; txBytes += n.tx_bytes; });
    res.json({
      cpu: cpu.toFixed(2),
      numCpus,
      memUsage: mem.usage || 0,
      memLimit: mem.limit || 0,
      memPercent: mem.limit ? ((mem.usage / mem.limit) * 100).toFixed(2) : 0,
      rxBytes, txBytes,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/containers/:id/start',   async (req, res) => { try { await docker.getContainer(req.params.id).start();   res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/containers/:id/stop',    async (req, res) => { try { await docker.getContainer(req.params.id).stop();    res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/containers/:id/restart', async (req, res) => { try { await docker.getContainer(req.params.id).restart(); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// System restart — all containers except nginx and mockten-dashboard
app.post('/api/system/restart', async (req, res) => {
  const SKIP = ['nginx', 'mockten-dashboard'];
  try {
    const containers = await docker.listContainers({ all: false }); // running only
    const targets = containers.filter(c => {
      const name = c.Names[0].replace(/^\//, '');
      return !SKIP.includes(name);
    });
    // Start restarts in parallel, report results
    const results = await Promise.allSettled(
      targets.map(c => docker.getContainer(c.Id).restart())
    );
    const names = targets.map(c => c.Names[0].replace(/^\//, ''));
    res.json({
      restarted: names.filter((_, i) => results[i].status === 'fulfilled'),
      failed:    names.filter((_, i) => results[i].status === 'rejected'),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Sync trigger — runs /sync_script.sh inside mockten-sync container
app.post('/api/sync/trigger', async (req, res) => {
  try {
    const container = docker.getContainer('mockten-sync');
    const exec = await container.exec({
      Cmd: ['/sync_script.sh'],
      AttachStdout: true,
      AttachStderr: true,
    });
    
    const stream = await exec.start({});
    
    // Wait for the sync script to execute completely
    await new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', chunk => output += chunk.toString('utf8'));
      stream.on('end', () => resolve(output));
      stream.on('error', reject);
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const HOST_WORKSPACE_PATH = process.env.HOST_WORKSPACE_PATH || process.cwd();

// Services/routes that are internal-only (not called directly by the browser as a user)
const INTERNAL_SERVICE_NAMES = new Set([
  'keycloak-creation-token',   // injects hardcoded superadmin creds — backend-only
  'keycloak-admin-users',      // Keycloak Admin REST API
  'keycloak-admin-roles',      // Keycloak Admin REST API
  'keycloak-broker-google-endpoint', // OAuth broker callback — browser is redirected here, not a user-facing fetch
]);
const INTERNAL_ROUTE_NAMES = new Set([
  'train-model',       // triggered from dashboard only
  'get-model-status',  // dashboard internal polling
]);

function parseKongYaml() {
  try {
    const filepath = '/app/kong.yaml';
    if (!fs.existsSync(filepath)) {
      return { error: 'kong.yaml not found' };
    }
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    const services = [];
    let currentService = null;
    let currentRoute = null;
    let mode = null;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);

      if (trimmed.startsWith('- name:')) {
        if (indent === 2) {
          currentService = {
            name: trimmed.replace('- name:', '').trim(),
            url: '',
            routes: [],
            plugins: []
          };
          services.push(currentService);
          currentRoute = null;
          mode = 'service';
        } else if (indent === 6 && currentService) {
          currentRoute = {
            name: trimmed.replace('- name:', '').trim(),
            paths: [],
            methods: []
          };
          currentService.routes.push(currentRoute);
          mode = 'route';
        }
      } else if (trimmed.startsWith('name:')) {
        const val = trimmed.replace('name:', '').trim();
        if (indent === 4 && currentService) {
          currentService.name = val;
        } else if (indent === 8 && currentRoute) {
          currentRoute.name = val;
        }
      } else if (trimmed.startsWith('url:') && currentService) {
        currentService.url = trimmed.replace('url:', '').trim();
      } else if (trimmed.startsWith('routes:')) {
        mode = 'routes';
      } else if (trimmed.startsWith('plugins:')) {
        mode = 'plugins';
      } else if (trimmed.startsWith('paths:')) {
        mode = 'paths';
        // Handle inline array: paths: [ /foo, /bar ]
        const inlineArr = trimmed.match(/^paths:\s*\[\s*([^\]]+)\s*\]/);
        if (inlineArr && currentRoute) {
          inlineArr[1].split(',').forEach(p => {
            const v = p.trim().replace(/"/g, '').replace(/'/g, '');
            if (v) currentRoute.paths.push(v);
          });
        }
      } else if (trimmed.startsWith('methods:')) {
        mode = 'methods';
        // Handle inline array: methods: [ GET, POST ]
        const inlineArr = trimmed.match(/^methods:\s*\[\s*([^\]]+)\s*\]/);
        if (inlineArr && currentRoute) {
          inlineArr[1].split(',').forEach(m => {
            const v = m.trim().replace(/"/g, '').replace(/'/g, '');
            if (v) currentRoute.methods.push(v);
          });
        }
      } else if (trimmed.startsWith('- ') && currentRoute) {
        const val = trimmed.replace('- ', '').trim().replace(/"/g, '').replace(/'/g, '');
        if (mode === 'paths') {
          currentRoute.paths.push(val);
        } else if (mode === 'methods') {
          currentRoute.methods.push(val);
        }
      }
    }
    // Filter internal services and routes
    return services
      .filter(svc => !INTERNAL_SERVICE_NAMES.has(svc.name))
      .map(svc => ({
        ...svc,
        routes: svc.routes.filter(r => !INTERNAL_ROUTE_NAMES.has(r.name) && r.methods && r.methods.length > 0)
      }))
      .filter(svc => svc.routes.length > 0);
  } catch (err) {
    return { error: err.message };
  }
}

// ── REST API Extensions ───────────────────────────────────────────────────────
// Cache superadmin token (expires ~5min; refresh on demand)
let _superadminToken = null;
let _superadminTokenExpiry = 0;
app.get('/api/superadmin-token', async (req, res) => {
  try {
    if (_superadminToken && Date.now() < _superadminTokenExpiry) {
      return res.json({ token: _superadminToken });
    }
    const r = await fetch('http://apigw:8082/api/uam/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'superadmin', password: 'superadmin' })
    });
    if (!r.ok) throw new Error(`Keycloak returned ${r.status}`);
    const data = await r.json();
    _superadminToken = data.access_token;
    _superadminTokenExpiry = Date.now() + (data.expires_in - 30) * 1000;
    res.json({ token: _superadminToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kong/spec', (req, res) => {
  res.json(parseKongYaml());
});

app.get('/api/keycloak/info', (req, res) => {
  try {
    const filepath = '/app/realm-export-dev.json';
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'realm-export-dev.json not found' });
    }
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    res.json({
      realm: data.realm,
      enabled: data.enabled,
      registrationAllowed: data.registrationAllowed,
      clients: data.clients.map(c => ({
        clientId: c.clientId,
        enabled: c.enabled,
        protocol: c.protocol,
        publicClient: c.publicClient,
        redirectUris: c.redirectUris,
        webOrigins: c.webOrigins
      })),
      roles: data.roles?.realm || [],
      groups: data.groups?.map(g => ({ name: g.name })) || [],
      users: data.users?.map(u => ({
        username: u.username,
        enabled: u.enabled,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        groups: u.groups || [],
        realmRoles: u.realmRoles || [],
        attributes: u.attributes || {}
      })) || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/keycloak/users/live', async (req, res) => {
  try {
    let token = _superadminToken;
    if (!token || Date.now() >= _superadminTokenExpiry) {
      const r = await fetch('http://apigw:8082/api/uam/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: 'superadmin', password: 'superadmin' })
      });
      if (!r.ok) throw new Error(`Token fetch failed: ${r.status}`);
      const td = await r.json();
      token = td.access_token;
      _superadminToken = token;
      _superadminTokenExpiry = Date.now() + (td.expires_in - 30) * 1000;
    }
    const ur = await fetch('http://apigw:8082/api/uam/users?max=200', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!ur.ok) throw new Error(`Users fetch failed: ${ur.status}`);
    const users = await ur.json();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recommend', async (req, res) => {
  try {
    const { user_id, limit = 10 } = req.query;
    const response = await fetch(`http://recommendation-service.default.svc.cluster.local:8080/recommend?user_id=${user_id}&limit=${limit}`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message, recommendations: [] });
  }
});

app.get('/api/recommendation/status', async (req, res) => {
  try {
    const response = await fetch('http://recommendation-service.default.svc.cluster.local:8080/model/status');
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recommendation/train', async (req, res) => {
  try {
    const response = await fetch('http://recommendation-service.default.svc.cluster.local:8080/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recommendation/metrics', async (req, res) => {
  try {
    const { Client } = await import('minio');
    const mc = new Client({
      endPoint: 'minio-service.default.svc.cluster.local',
      port: 9000, useSSL: false,
      accessKey: 'minioadmin', secretKey: 'minioadmin'
    });
    const stream = await mc.getObject('models', 'recommendation/metrics.json');
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const json = JSON.parse(Buffer.concat(chunks).toString());
    res.json(json);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/tests/list', (req, res) => {
  try {
    const testsDir = '/app/tests';
    if (!fs.existsSync(testsDir)) {
      return res.status(404).json({ error: 'tests directory not found' });
    }
    const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
    const testSuites = [];

    for (const file of files) {
      const content = fs.readFileSync(path.join(testsDir, file), 'utf8');
      const testMatches = [];
      const lines = content.split('\n');
      let currentDescribe = '';
      for (const line of lines) {
        const descMatch = line.match(/describe\s*\(\s*['"`](.*?)['"`]/);
        if (descMatch) {
          currentDescribe = descMatch[1];
        }
        const testMatch = line.match(/test\s*\(\s*['"`](.*?)['"`]/);
        if (testMatch) {
          testMatches.push({
            name: testMatch[1],
            describe: currentDescribe
          });
        }
      }
      testSuites.push({
        file,
        cases: testMatches
      });
    }
    res.json(testSuites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/mysql/query', async (req, res) => {
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL query required' });

  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const [result] = await conn.query(sql);
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return res.json({ columns: [], rows: [], total: 0 });
      }
      const columns = Object.keys(result[0]);
      res.json({ columns, rows: result, total: result.length });
    } else {
      res.json({ info: result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/db/mysql/export', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const child = spawn('docker', [
      'exec', 'mysql-service.default.svc.cluster.local',
      'mysqldump', '-umocktenusr', '-pmocktenpassword', 'mocktendb'
    ]);
    res.setHeader('Content-Disposition', 'attachment; filename="mocktendb_dump.sql"');
    res.setHeader('Content-Type', 'application/sql');
    child.stdout.pipe(res);
    child.stderr.on('data', data => {
      console.error('mysqldump error:', data.toString());
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/mysql/import', (req, res) => {
  try {
    const { spawn } = require('child_process');
    const child = spawn('docker', [
      'exec', '-i', 'mysql-service.default.svc.cluster.local',
      'mysql', '-umocktenusr', '-pmocktenpassword', 'mocktendb'
    ]);

    req.pipe(child.stdin);

    let errData = '';
    child.stderr.on('data', data => {
      errData += data.toString();
    });

    child.on('close', code => {
      if (code === 0) {
        res.json({ ok: true });
      } else {
        res.status(500).json({ error: errData || `mysql exited with code ${code}` });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const getKongApiStats = () => {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('docker exec apigw tail -n 5000 /tmp/access.log', { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve({ topApis: [], slowApis: [] });
      }
      const counts = {};
      const rtSums = {};
      const rtCounts = {};
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/"(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD) ([^?\s]+)[?\s]/);
        if (!match) continue;
        const method = match[1];
        let path = match[2];
        path = path.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':id');
        // Also normalize png filenames under /api/storage/
        path = path.replace(/^(\/api\/storage\/)[\w\-.]+\.png$/, '$1:id.png');
        const key = `${method} ${path}`;
        counts[key] = (counts[key] || 0) + 1;
        const rtMatch = line.match(/rt=([\d.]+|-)/);
        if (rtMatch && rtMatch[1] !== '-') {
          rtSums[key] = (rtSums[key] || 0) + parseFloat(rtMatch[1]);
          rtCounts[key] = (rtCounts[key] || 0) + 1;
        }
      }
      const topApis = Object.entries(counts)
        .map(([key, count]) => {
          const [method, ...rest] = key.split(' ');
          return { method, path: rest.join(' '), count };
        })
        .sort((a, b) => b.count - a.count);

      const slowApis = Object.entries(rtSums)
        .filter(([key]) => (rtCounts[key] || 0) >= 3)
        .map(([key, sum]) => {
          const [method, ...rest] = key.split(' ');
          const avgMs = Math.round((sum / rtCounts[key]) * 1000);
          return { method, path: rest.join(' '), avgMs, sampleCount: rtCounts[key] };
        })
        .sort((a, b) => b.avgMs - a.avgMs);

      resolve({ topApis, slowApis });
    });
  });
};

app.get('/api/stats', async (req, res) => {
  try {
    const { topApis, slowApis } = await getKongApiStats();
    const type = req.query.type;
    if (type === 'slow') return res.json({ slowApis });
    if (type === 'top')  return res.json({ topApis });
    res.json({ topApis, slowApis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telemetry', async (req, res) => {
  const telemetry = {
    kong: { active: 0, total: 0, db: 'unknown', topApis: [], slowApis: [] },
    mysql: { connections: 0, queries: 0, uptime: 0 },
    redis: { clients: 0, memory: 0, hitRate: 0 },
    mongodb: { connections: 0, ops: 0 }
  };

  try {
    const kongStats = await getKongApiStats();
    telemetry.kong.topApis = kongStats.topApis;
    telemetry.kong.slowApis = kongStats.slowApis;
  } catch (err) {
    console.error('Error fetching Kong top APIs:', err);
  }

  // 1. Kong Status
  try {
    const kongRes = await fetch('http://apigw:8001/status');
    if (kongRes.ok) {
      const data = await kongRes.json();
      telemetry.kong.active = data.server?.connections_active || 0;
      telemetry.kong.total = data.server?.total_requests || 0;
      telemetry.kong.db = data.database ? (data.database.reachable ? 'connected' : 'disconnected') : 'connected';
    }
  } catch (e) {
    console.error('Kong telemetry error:', e.message);
  }

  // 2. MySQL Status
  let conn;
  try {
    conn = await mysqlPool.getConnection();
    const [statusRows] = await conn.query("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected', 'Questions', 'Uptime')");
    statusRows.forEach(row => {
      if (row.Variable_name === 'Threads_connected') telemetry.mysql.connections = parseInt(row.Value);
      if (row.Variable_name === 'Questions') telemetry.mysql.queries = parseInt(row.Value);
      if (row.Variable_name === 'Uptime') telemetry.mysql.uptime = parseInt(row.Value);
    });
  } catch (e) {
    console.error('MySQL telemetry error:', e.message);
  } finally {
    if (conn) conn.release();
  }

  // 3. Redis Status
  const r = getRedis();
  try {
    await r.connect();
    const info = await r.info();
    const clients = info.match(/connected_clients:(\d+)/)?.[1];
    const memory = info.match(/used_memory:(\d+)/)?.[1];
    const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
    const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total * 100).toFixed(1) : '0.0';

    telemetry.redis = {
      clients: parseInt(clients || '0'),
      memory: parseInt(memory || '0'),
      hitRate: parseFloat(hitRate)
    };
  } catch (e) {
    console.error('Redis telemetry error:', e.message);
  } finally {
    r.disconnect();
  }

  // 4. MongoDB Status
  try {
    await withMongoClient(async (db) => {
      const serverStatus = await db.admin().serverStatus();
      telemetry.mongodb = {
        connections: serverStatus.connections?.current || 0,
        ops: (serverStatus.opcounters?.insert || 0) + (serverStatus.opcounters?.query || 0) + (serverStatus.opcounters?.update || 0) + (serverStatus.opcounters?.delete || 0)
      };
    });
  } catch (e) {
    console.error('MongoDB telemetry error:', e.message);
  }

  res.json(telemetry);
});

// ── Metrics History Ring Buffer ────────────────────────────────────────────────
const MAX_HISTORY = 8640; // 12h × 5s interval
const metricsHistory = { timestamps: [], cpu: [], mem: [], memMB: [], telemetry: { mysql: [], redis: [], mongo: [], kong: [] } };

// Persist one snapshot to MongoDB dashboard_metrics collection (writes every ~60s)
let _mongoMetricsTick = 0;
async function persistMetricToMongo(snapshot) {
  try {
    const client = new MongoClient(MONGO_CONFIG.url, { connectTimeoutMS: 3000, serverSelectionTimeoutMS: 3000 });
    await client.connect();
    const col = client.db('product_info').collection('dashboard_metrics');
    await col.insertOne({ ...snapshot, createdAt: new Date() });
    // Keep only last 1440 records (24h at 60s)
    const count = await col.countDocuments();
    if (count > 1440) {
      const oldest = await col.find().sort({ createdAt: 1 }).limit(count - 1440).toArray();
      if (oldest.length > 0) {
        const ids = oldest.map(d => d._id);
        await col.deleteMany({ _id: { $in: ids } });
      }
    }
    await client.close().catch(() => {});
  } catch {
    // MongoDB unavailable — silently skip persistence
  }
}

// On startup: restore in-memory history from MongoDB (last 200 records for quick boot)
async function loadMetricsFromMongo() {
  try {
    const client = new MongoClient(MONGO_CONFIG.url, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const col = client.db('product_info').collection('dashboard_metrics');
    const docs = await col.find().sort({ createdAt: -1 }).limit(200).toArray();
    docs.reverse().forEach(d => {
      metricsHistory.timestamps.push(d.ts);
      metricsHistory.cpu.push(d.cpu);
      metricsHistory.mem.push(d.mem);
      metricsHistory.memMB.push(d.memMB);
      metricsHistory.telemetry.mysql.push(d.mysql);
      metricsHistory.telemetry.redis.push(d.redis);
      metricsHistory.telemetry.mongo.push(d.mongo);
      metricsHistory.telemetry.kong.push(d.kong);
    });
    await client.close().catch(() => {});
    if (docs.length > 0) console.log(`Loaded ${docs.length} metrics snapshots from MongoDB.`);
  } catch {
    // No MongoDB yet — start fresh
  }
}

async function collectMetricsSnapshot() {
  try {
    const containers = await docker.listContainers({ all: false });
    let totalCpuSum = 0, totalMemUsage = 0, maxMemLimit = 0, numCpus = 1;
    await Promise.all(containers.map(async c => {
      try {
        const stats = await docker.getContainer(c.Id).stats({ stream: false });
        const cpu = calcCpuPercent(stats);
        const n = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
        totalCpuSum += cpu;
        if (n > numCpus) numCpus = n;
        const mem = stats.memory_stats;
        totalMemUsage += mem.usage || 0;
        if ((mem.limit || 0) > maxMemLimit) maxMemLimit = mem.limit;
      } catch {}
    }));
    const aggCpu = numCpus > 0 ? totalCpuSum / numCpus : 0;
    const aggMemPct = maxMemLimit > 0 ? (totalMemUsage / maxMemLimit) * 100 : 0;
    const aggMemMB = totalMemUsage / 1024 / 1024;

    // Collect telemetry
    let mysqlConn = 0, redisClients = 0, mongoConn = 0, kongTotal = 0;
    try {
      const conn = await mysqlPool.getConnection();
      const [rows] = await conn.query("SHOW STATUS WHERE Variable_name IN ('Threads_connected')");
      rows.forEach(r => { if (r.Variable_name === 'Threads_connected') mysqlConn = parseInt(r.Value); });
      conn.release();
    } catch {}
    try {
      const r = new (require('ioredis'))({ host:'redis-service.default.svc.cluster.local', port:6379, password:'mocktenpass', connectTimeout:2000, maxRetriesPerRequest:0, lazyConnect:true, retryStrategy: () => null, enableOfflineQueue: false });
      await r.connect();
      const info = await r.info('clients');
      const m = info.match(/connected_clients:(\d+)/);
      if (m) redisClients = parseInt(m[1]);
      await r.quit().catch(() => {});
    } catch {}
    try {
      const mc = new (require('mongodb').MongoClient)('mongodb://bar:bar@mongo-service.default.svc.cluster.local:27017/?authSource=admin', { connectTimeoutMS:3000 });
      await mc.connect();
      const si = await mc.db('admin').command({ serverStatus: 1 });
      mongoConn = si.connections?.current || 0;
      await mc.close().catch(() => {});
    } catch {}
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 3000);
      const kr = await fetch('http://apigw:8001/status', { signal: ac.signal });
      clearTimeout(tid);
      if (kr.ok) { const kd = await kr.json(); kongTotal = kd.server?.total_requests || 0; }
    } catch {}

    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    metricsHistory.timestamps.push(ts);
    metricsHistory.cpu.push(parseFloat(aggCpu.toFixed(2)));
    metricsHistory.mem.push(parseFloat(aggMemPct.toFixed(2)));
    metricsHistory.memMB.push(parseFloat(aggMemMB.toFixed(1)));
    metricsHistory.telemetry.mysql.push(mysqlConn);
    metricsHistory.telemetry.redis.push(redisClients);
    metricsHistory.telemetry.mongo.push(mongoConn);
    metricsHistory.telemetry.kong.push(kongTotal);

    if (metricsHistory.timestamps.length > MAX_HISTORY) {
      metricsHistory.timestamps.shift();
      metricsHistory.cpu.shift();
      metricsHistory.mem.shift();
      metricsHistory.memMB.shift();
      metricsHistory.telemetry.mysql.shift();
      metricsHistory.telemetry.redis.shift();
      metricsHistory.telemetry.mongo.shift();
      metricsHistory.telemetry.kong.shift();
    }

    // Persist to MongoDB every 12 ticks (60 seconds) to prove MongoDB is used by dashboard
    _mongoMetricsTick++;
    if (_mongoMetricsTick % 12 === 0) {
      persistMetricToMongo({
        ts, cpu: parseFloat(aggCpu.toFixed(2)), mem: parseFloat(aggMemPct.toFixed(2)),
        memMB: parseFloat(aggMemMB.toFixed(1)),
        mysql: mysqlConn, redis: redisClients, mongo: mongoConn, kong: kongTotal,
      });
    }
  } catch (e) {
    console.error('metrics snapshot error:', e.message);
  }
}

setInterval(collectMetricsSnapshot, 5000);
// Load historical metrics from MongoDB before starting collection
loadMetricsFromMongo().then(() => collectMetricsSnapshot());

app.get('/api/metrics/history', (req, res) => {
  res.json(metricsHistory);
});

function calcCpuPercent(stats) {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const sysDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
  if (sysDelta > 0 && cpuDelta > 0) return (cpuDelta / sysDelta) * numCpus * 100.0;
  return 0;
}

// ── Frontend (Vite) ───────────────────────────────────────────────────────────
async function getSyncTimestamp() {
  try {
    const container = docker.getContainer('mockten-sync');
    const exec = await container.exec({
      Cmd: ['cat', '/tmp/last_sync_timestamp.txt'],
      AttachStdout: true,
      AttachStderr: true,
    });
    
    return new Promise((resolve, reject) => {
      exec.start({}, (err, stream) => {
        if (err) return reject(err);
        
        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString('utf8');
        });
        
        stream.on('end', () => {
          const dateMatch = output.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
          resolve(dateMatch ? dateMatch[0] : null);
        });
        
        stream.on('error', reject);
      });
    });
  } catch (e) {
    console.error('Error in getSyncTimestamp:', e.message);
    return null;
  }
}

app.get('/api/frontend/status', async (req, res) => {
  const socket = new net.Socket();
  let done = false;
  
  const checkFrontend = new Promise((resolve) => {
    socket.setTimeout(2000);
    socket.on('connect', () => { done = true; socket.destroy(); resolve(true); });
    socket.on('error',   () => { if (!done) { done = true; resolve(false); } });
    socket.on('timeout', () => { if (!done) { done = true; socket.destroy(); resolve(false); } });
    socket.connect(5173, 'host.docker.internal');
  });

  const running = await checkFrontend;
  let lastSyncMinutesAgo = null;
  let lastSyncTime = null;

  try {
    const timestamp = await getSyncTimestamp();
    if (timestamp) {
      lastSyncTime = timestamp;
      let conn;
      try {
        conn = await mysqlPool.getConnection();
        const [rows] = await conn.query(
          `SELECT TIMESTAMPDIFF(MINUTE, ?, NOW()) AS diff_minutes`,
          [timestamp]
        );
        if (rows && rows.length > 0) {
          lastSyncMinutesAgo = rows[0].diff_minutes;
        }
      } catch (dbErr) {
        console.error('Failed to calculate sync time diff from DB:', dbErr.message);
      } finally {
        if (conn) conn.release();
      }
    }
  } catch (e) {
    console.error('Failed to get sync timestamp details:', e.message);
  }

  res.json({ running, lastSyncMinutesAgo, lastSyncTime });
});

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

// ── WebSocket — use noServer pattern to avoid multi-WSS conflict ──────────────
const wssContainer        = new WebSocket.Server({ noServer: true });
const wssFrontend         = new WebSocket.Server({ noServer: true });
const wssExec             = new WebSocket.Server({ noServer: true });
const wssCI               = new WebSocket.Server({ noServer: true });
const wssTests            = new WebSocket.Server({ noServer: true });
const wssVulnerability    = new WebSocket.Server({ noServer: true });
const wssFrontendStart    = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/ws/logs') {
    wssContainer.handleUpgrade(request, socket, head, ws => wssContainer.emit('connection', ws, request));
  } else if (pathname === '/ws/frontend-logs') {
    wssFrontend.handleUpgrade(request, socket, head, ws => wssFrontend.emit('connection', ws, request));
  } else if (pathname === '/ws/exec') {
    wssExec.handleUpgrade(request, socket, head, ws => wssExec.emit('connection', ws, request));
  } else if (pathname === '/ws/ci') {
    wssCI.handleUpgrade(request, socket, head, ws => wssCI.emit('connection', ws, request));
  } else if (pathname === '/ws/tests') {
    wssTests.handleUpgrade(request, socket, head, ws => wssTests.emit('connection', ws, request));
  } else if (pathname === '/ws/vulnerability') {
    wssVulnerability.handleUpgrade(request, socket, head, ws => wssVulnerability.emit('connection', ws, request));
  } else if (pathname === '/ws/frontend-start') {
    wssFrontendStart.handleUpgrade(request, socket, head, ws => wssFrontendStart.emit('connection', ws, request));
  } else {
    socket.destroy();
  }
});

// Container log streaming
wssContainer.on('connection', async (ws, req) => {
  const params = new URLSearchParams(new URL(req.url, 'http://localhost').search);
  const containerId = params.get('id');
  const tail = parseInt(params.get('tail') || '100');
  if (!containerId) { ws.close(); return; }

  let logStream;
  try {
    const container = docker.getContainer(containerId);
    logStream = await container.logs({ stdout: true, stderr: true, follow: true, tail, timestamps: true });

    logStream.on('data', chunk => {
      // Docker multiplexes stdout/stderr: 8-byte header per frame
      let offset = 0;
      while (offset < chunk.length) {
        if (chunk.length - offset < 8) break;
        const size = chunk.readUInt32BE(offset + 4);
        if (chunk.length - offset - 8 < size) break;
        const payload = chunk.slice(offset + 8, offset + 8 + size);
        if (ws.readyState === WebSocket.OPEN) ws.send(payload.toString('utf8'));
        offset += 8 + size;
      }
    });
    logStream.on('end',   () => ws.close());
    logStream.on('error', e => { if (ws.readyState === WebSocket.OPEN) ws.send('[error] ' + e.message); });
  } catch (e) {
    if (ws.readyState === WebSocket.OPEN) ws.send('[error] ' + e.message);
    ws.close();
  }
  ws.on('close', () => { if (logStream?.destroy) logStream.destroy(); });
});

// Frontend (Vite) log file streaming
wssFrontend.on('connection', ws => {
  const logPath = '/app/ecfront2.log';

  if (!fs.existsSync(logPath)) {
    if (ws.readyState === WebSocket.OPEN) ws.send('[info] ecfront2.log not found — frontend may not be running yet.');
    // Still watch in case it appears
  } else {
    // Send existing tail first
    const content = fs.readFileSync(logPath, 'utf8');
    content.split('\n').filter(Boolean).slice(-200).forEach(l => {
      if (ws.readyState === WebSocket.OPEN) ws.send(l);
    });
  }

  let size = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

  const watcher = fs.watchFile(logPath, { interval: 500 }, curr => {
    if (curr.size <= size) return;
    try {
      const fd = fs.openSync(logPath, 'r');
      const buf = Buffer.alloc(curr.size - size);
      fs.readSync(fd, buf, 0, buf.length, size);
      fs.closeSync(fd);
      size = curr.size;
      buf.toString('utf8').split('\n').filter(Boolean).forEach(l => {
        if (ws.readyState === WebSocket.OPEN) ws.send(l);
      });
    } catch {}
  });

  ws.on('close', () => fs.unwatchFile(logPath, watcher));
});

// Interactive terminal exec streaming
wssExec.on('connection', async (ws, req) => {
  const params = new URLSearchParams(new URL(req.url, 'http://localhost').search);
  const containerId = params.get('id');
  const cols = parseInt(params.get('cols') || '80');
  const rows = parseInt(params.get('rows') || '24');
  if (!containerId) { ws.close(); return; }

  let stream;
  try {
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', '[ -x /bin/bash ] && exec /bin/bash || exec /bin/sh'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      OpenStdin: true,
      StdinOnce: false
    });

    stream = await exec.start({ hijack: true, stdin: true });

    // Resize TTY to match client size
    try {
      await exec.resize({ w: cols, h: rows });
    } catch (resizeErr) {
      console.warn('Failed to resize terminal:', resizeErr.message);
    }

    stream.on('data', chunk => {
      if (ws.readyState === WebSocket.OPEN) {
        const text = chunk.toString('utf8');
        ws.send(text);
        if (text.includes('OCI runtime exec failed') || text.includes('stat /bin/sh: no such file or directory')) {
          ws.send('\r\n\x1b[33m[Note] This container does not have a shell (/bin/sh or /bin/bash) available.\r\nIt might be built from a minimal "scratch" or distroless image (like Portainer).\x1b[0m\r\n');
        }
      }
    });

    stream.on('end', () => {
      ws.close();
    });

    stream.on('error', err => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('\r\n[exec error] ' + err.message + '\r\n');
      }
      ws.close();
    });

    ws.on('message', message => {
      if (stream && stream.writable) {
        stream.write(message);
      }
    });

  } catch (e) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('\r\n[setup error] ' + e.message + '\r\n');
    }
    ws.close();
  }

  ws.on('close', () => {
    if (stream && stream.destroy) {
      try { stream.destroy(); } catch {}
    }
  });
});

// ── WebSockets for container executions ─────────────────────────────────────────
wssCI.on('connection', ws => {
  const { spawn } = require('child_process');

  // Ensure actrc exists so act doesn't show interactive image-select prompt
  const actrcDir = '/root/.config/act';
  const actrcPath = `${actrcDir}/actrc`;
  try {
    fs.mkdirSync(actrcDir, { recursive: true });
    // Map both ubuntu-latest and ubuntu-22.04 (used in ci.yml) to the same runner image
    fs.writeFileSync(actrcPath, '-P ubuntu-latest=catthehacker/ubuntu:act-22.04\n-P ubuntu-22.04=catthehacker/ubuntu:act-22.04\n');
  } catch {}

  ws.send('Starting CI workflow simulation (act)...\r\n');

  const child = spawn('act', [
    'pull_request',
    '-W', '/app/.github/workflows/ci.yml',
    '-C', HOST_WORKSPACE_PATH,
    '--concurrent-jobs', '2',
    '--pull=false',
  ], { cwd: '/app' });

  child.stdout.on('data', data => ws.send(data.toString()));
  child.stderr.on('data', data => ws.send(data.toString()));
  child.on('close', code => {
    ws.send(`\r\nCI Pipeline finished with exit code ${code}\r\n`);
    ws.close();
  });
  ws.on('close', () => {
    child.kill();
  });
});

wssTests.on('connection', (ws, req) => {
  const params = new URLSearchParams(new URL(req.url, 'http://localhost').search);
  const spec = params.get('spec') || '';

  const { spawn } = require('child_process');
  ws.send(`Starting Playwright test runner ${spec ? `for ${spec}` : 'for all specs'}...\r\n`);

  const taskArgs = spec ? ['ie2e-spec', `SPEC=${spec}`] : ['ie2e'];
  const child = spawn('/usr/local/bin/task', taskArgs, {
    cwd: '/app',
    env: { ...process.env, HOST_WORKSPACE_PATH }
  });

  child.stdout.on('data', data => ws.send(data.toString()));
  child.stderr.on('data', data => ws.send(data.toString()));
  child.on('close', code => {
    ws.send(`\r\nPlaywright run finished with exit code ${code}\r\n`);
    ws.close();
  });
  ws.on('close', () => {
    child.kill();
  });
});

wssVulnerability.on('connection', (ws, req) => {
  const { spawn } = require('child_process');
  const params = new URLSearchParams(new URL(req.url, 'http://localhost').search);
  const scanType = params.get('type') || 'all';

  const taskMap = {
    trivy: 'trivy',
    sca:   'sca',
    sast:  'sast',
    dast:  'dast',
    all:   'infosec'
  };
  const taskName = taskMap[scanType] || 'infosec';
  ws.send(`Starting security scan: task ${taskName}...\r\n`);

  const child = spawn('task', [taskName], {
    cwd: '/app',
    env: {
      ...process.env,
      HOST_WORKSPACE_PATH: process.env.HOST_WORKSPACE_PATH || process.cwd()
    }
  });

  child.stdout.on('data', data => ws.send(data.toString()));
  child.stderr.on('data', data => ws.send(data.toString()));
  child.on('close', code => {
    ws.send(`\r\nSecurity scan (${taskName}) finished with exit code ${code}\r\n`);
    ws.close();
  });
  ws.on('close', () => {
    child.kill();
  });
});

wssFrontendStart.on('connection', ws => {
  // The Vite frontend runs on the host (not inside this container).
  // node_modules built on macOS are incompatible with the Alpine Linux container.
  ws.send('The Vite frontend runs on the host machine, not inside this container.\r\n');
  ws.send('Run "task start-frontend" from the project root to start only the Vite dev server.\r\n');
  ws.close();
});

// ── Airflow API proxy ─────────────────────────────────────────────────────
const AIRFLOW_BASE = 'http://airflow-webserver:8080/api/v1';
const AIRFLOW_AUTH = 'Basic ' + Buffer.from('airflow:airflow').toString('base64');

function airflowFetch(path, options = {}) {
  const url = new URL(AIRFLOW_BASE + path);
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': AIRFLOW_AUTH,
        'Content-Type': 'application/json',
        'Connection': 'close',
        ...(options.headers || {}),
      },
      agent: false, // disable keep-alive pooling
    };
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => Promise.resolve(JSON.parse(body)),
          text: () => Promise.resolve(body),
        });
      });
    });
    req.setTimeout(8000, () => { req.destroy(new Error('Airflow request timeout')); });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

app.get('/api/pipeline/status', async (req, res) => {
  try {
    const r = await airflowFetch('/dags/mockten_data_pipeline');
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'Airflow unavailable', detail: e.message });
  }
});

app.get('/api/pipeline/runs', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const r = await airflowFetch(`/dags/mockten_data_pipeline/dagRuns?limit=${limit}&order_by=-execution_date`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'Airflow unavailable', detail: e.message });
  }
});

app.post('/api/pipeline/trigger', async (req, res) => {
  try {
    // Unpause DAG first so the run actually executes
    await airflowFetch('/dags/mockten_data_pipeline', {
      method: 'PATCH',
      body: JSON.stringify({ is_paused: false }),
    });
    const r = await airflowFetch('/dags/mockten_data_pipeline/dagRuns', {
      method: 'POST',
      body: JSON.stringify({ conf: {} }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(503).json({ error: 'Airflow unavailable', detail: e.message });
  }
});

app.get('/api/pipeline/runs/:runId/tasks', async (req, res) => {
  try {
    const r = await airflowFetch(`/dags/mockten_data_pipeline/dagRuns/${req.params.runId}/taskInstances`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'Airflow unavailable', detail: e.message });
  }
});

app.get('/api/pipeline/tasks', async (req, res) => {
  try {
    const r = await airflowFetch('/dags/mockten_data_pipeline/tasks');
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(503).json({ error: 'Airflow unavailable', detail: e.message });
  }
});

// Task logs from Airflow  (?runId=...&taskId=...&try=1)
app.get('/api/pipeline/task-logs', async (req, res) => {
  try {
    const { runId, taskId } = req.query;
    const tryNumber = req.query.try || 1;
    const r = await airflowFetch(
      `/dags/mockten_data_pipeline/dagRuns/${runId}/taskInstances/${taskId}/logs/${tryNumber}`,
      { headers: { 'Accept': 'text/plain' } }
    );
    const text = await r.text();
    // Parse log lines into structured entries: { ts, level, msg }
    const lines = text.split('\n').filter(Boolean);
    const parsed = lines.map(line => {
      const m = line.match(/^\[([^\]]+)\]\s+\{[^}]+\}\s+(\w+)\s+-\s+(.*)$/);
      if (m) return { ts: m[1], level: m[2], msg: m[3] };
      return { ts: null, level: 'INFO', msg: line };
    });
    res.json({ task_id: taskId, run_id: runId, logs: parsed });
  } catch (e) {
    res.status(503).json({ error: 'Log fetch failed', detail: e.message });
  }
});

// ── MinIO / Data Lake viewer ──────────────────────────────────────────────────
const MINIO_ENDPOINT = 'minio-service.default.svc.cluster.local';
const MINIO_PORT     = 9000;
const MINIO_ACCESS   = 'minioadmin';
const MINIO_SECRET   = 'minioadmin';

const LAYER_BUCKETS = {
  bronze:      'mockten-bronze',
  silver:      'mockten-silver',
  gold:        'mockten-gold',
  model_train: 'mockten-models',
};

function getMinioClient() {
  const Minio = require('minio');
  return new Minio.Client({
    endPoint:  MINIO_ENDPOINT,
    port:      MINIO_PORT,
    useSSL:    false,
    accessKey: MINIO_ACCESS,
    secretKey: MINIO_SECRET,
  });
}

// List objects in a layer's bucket
app.get('/api/pipeline/layer/:layer/files', async (req, res) => {
  const bucket = LAYER_BUCKETS[req.params.layer];
  if (!bucket) return res.status(400).json({ error: 'Unknown layer' });
  try {
    const mc = getMinioClient();
    const exists = await mc.bucketExists(bucket).catch(() => false);
    if (!exists) return res.json({ files: [] });
    const files = await new Promise((resolve, reject) => {
      const items = [];
      const stream = mc.listObjectsV2(bucket, '', true);
      stream.on('data', obj => items.push({ name: obj.name, size: obj.size, lastModified: obj.lastModified }));
      stream.on('end', () => resolve(items));
      stream.on('error', reject);
    });
    res.json({ bucket, files });
  } catch (e) {
    res.status(503).json({ error: 'MinIO unavailable', detail: e.message });
  }
});

// Read a Parquet file and return rows as JSON (first 200 rows)
app.get('/api/pipeline/layer/:layer/data', async (req, res) => {
  const bucket = LAYER_BUCKETS[req.params.layer];
  if (!bucket) return res.status(400).json({ error: 'Unknown layer' });
  const { file } = req.query;
  if (!file) return res.status(400).json({ error: 'file query param required' });
  try {
    const mc = getMinioClient();
    const buf = await new Promise((resolve, reject) => {
      const chunks = [];
      mc.getObject(bucket, file, (err, stream) => {
        if (err) return reject(err);
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    });

    // hyparquet is ESM-only; use dynamic import()
    const { parquetRead, parquetMetadata } = await import('hyparquet');
    // Node Buffer → ArrayBuffer (copy to avoid detached buffer issues)
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const meta = parquetMetadata(ab);
    const rows = [];
    await parquetRead({
      file: ab,
      rowLimit: 200,
      onChunk: ({ columnName, columnData, rowStart }) => {
        for (let i = 0; i < columnData.length; i++) {
          if (!rows[rowStart + i]) rows[rowStart + i] = {};
          let v = columnData[i];
          // Convert BigInt to number for JSON serialization
          if (typeof v === 'bigint') v = Number(v);
          rows[rowStart + i][columnName] = v;
        }
      },
    });
    const schema = meta.schema.map(s => s.name).filter(n => n !== 'schema');
    res.json({ file, schema, rows: rows.filter(Boolean) });
  } catch (e) {
    res.status(503).json({ error: 'Read failed', detail: e.message });
  }
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => console.log(`Dashboard server running on :${PORT}`));
