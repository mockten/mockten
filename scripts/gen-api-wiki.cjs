// Generates docs/API.md — a copy-paste-ready API reference for the GitHub wiki
// (https://github.com/mockten/mockten/wiki/API) at the same detail as the
// Developer Dashboard's API Specifications panel (method/path, backend target,
// description, input schema, response schema), minus the interactive Test
// Request / Response Log.
//
// Source of truth = the Dashboard's own tested data:
//   - route list + backend URLs come from the live Kong spec
//     (GET /dashboard/api/kong/spec — the stack must be running)
//   - descriptions / input schemas / response schemas are read straight out of
//     monitoring/dashboard/public/app.js (API_DESCRIPTIONS / API_SCHEMAS /
//     API_RESPONSE_SCHEMAS), so this never drifts from what the Dashboard shows.
//
// Usage (with the stack up, e.g. after `task build`):
//   node scripts/gen-api-wiki.cjs
// then paste docs/API.md into the wiki's API page. Regenerate rather than
// hand-editing the wiki.

const fs = require('fs');
const vm = require('vm');
const { execSync } = require('child_process');

// 1. Pull the three data dictionaries out of the dashboard app.js by brace-matching.
const app = fs.readFileSync(require('path').join(__dirname,'..','monitoring/dashboard/public/app.js'), 'utf8');
function extractConst(name) {
  const start = app.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error('not found: ' + name);
  let i = app.indexOf('{', start), depth = 0, inStr = null, esc = false;
  for (; i < app.length; i++) {
    const c = app[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') inStr = c;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const objSrc = app.slice(app.indexOf('{', start), i);
  return vm.runInNewContext('(' + objSrc + ')');
}
const DESC = extractConst('API_DESCRIPTIONS');
const SCHEMAS = extractConst('API_SCHEMAS');
const RESP = extractConst('API_RESPONSE_SCHEMAS');
const AUTH = SCHEMAS['__auth__'];
const SELLER = SCHEMAS['__seller_token__'];

function expandSchema(raw) {
  if (!raw) return null;
  return raw.map(f => f === '__auth__' ? AUTH : f === '__seller_token__' ? SELLER : f);
}
function normalizePath(p) {
  if (p.startsWith('~')) p = p.slice(1).trim();
  if (p.endsWith('$')) p = p.slice(0, -1);
  p = p.replace(/\([^)]+\)/g, ':id');
  return p;
}
function findByKey(dict, method, cleanPath) {
  const key = `${method} ${cleanPath}`;
  if (dict[key]) return dict[key];
  for (const k of Object.keys(dict)) {
    const sp = k.indexOf(' '); const m = k.slice(0, sp); const p = k.slice(sp + 1);
    if (m !== method) continue;
    const rx = '^' + p.replace(/:[^/]+/g, '[^/]+').replace(/\(\[\^\/\]\+\)/g, '[^/]+') + '$';
    if (new RegExp(rx).test(cleanPath)) return dict[k];
  }
  return null;
}
// HTML -> markdown for inline tags used in descriptions
function md(s) {
  return String(s || '')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/\s+/g, ' ').trim();
}
function cell(s) { return md(s).replace(/\|/g, '\\|'); }

const spec = JSON.parse(execSync('curl -s http://localhost/dashboard/api/kong/spec', { encoding: 'utf8' }));

let out = [];
out.push('# API Reference');
out.push('');
out.push('> Generated from the platform\'s live Kong routing (`apigw/kong.yaml`) and the Developer Dashboard\'s tested API Specifications. Every method/path, backend target, description, input schema and response schema below matches the running services. Regenerate rather than hand-edit (see the repo\'s generator).');
out.push('');
out.push('Base host: all paths are relative to the gateway (e.g. `http://localhost` locally). A `Bearer` token in the `Authorization` header is required wherever the input schema lists it.');
out.push('');

let count = 0;
for (const svc of spec) {
  for (const route of svc.routes || []) {
    const rawPath = (route.paths || [])[0] || '';
    const cleanPath = normalizePath(rawPath);
    const methods = (route.methods || []).filter(m => m !== 'OPTIONS');
    for (const method of methods) {
      const desc = findByKey(DESC, method, cleanPath);
      const schema = expandSchema(findByKey(SCHEMAS, method, cleanPath));
      const resp = findByKey(RESP, method, cleanPath);
      // Skip undocumented secondary methods (no description AND no schema) to
      // avoid phantom entries (e.g. PUT/DELETE on catch-all routes with no handler).
      const isPrimary = method === methods[0];
      if (!desc && !schema && !isPrimary) continue;
      count++;
      out.push(`## \`${method} ${cleanPath}\``);
      out.push('');
      out.push(`**Backend target:** \`${svc.url}\``);
      out.push('');
      if (desc) { out.push(md(desc)); out.push(''); }
      // Input schema
      out.push('**Input schema**');
      out.push('');
      if (schema && schema.length) {
        out.push('| Parameter | Location | Type | Mandatory | Description |');
        out.push('|-----------|----------|------|-----------|-------------|');
        for (const f of schema) {
          out.push(`| \`${f.name}\` | ${f.location} | ${f.type} | ${f.required ? 'Yes' : 'No'} | ${cell(f.desc)} |`);
        }
      } else {
        out.push('_No parameters. (Authorization header attached automatically where required.)_');
      }
      out.push('');
      // Response schema
      out.push('**Response schema**');
      out.push('');
      if (resp && resp.length) {
        out.push('| Field | Type | Description |');
        out.push('|-------|------|-------------|');
        for (const f of resp) {
          out.push(`| \`${f.field}\` | ${f.type} | ${cell(f.desc)} |`);
        }
      } else {
        out.push('_Not documented._');
      }
      out.push('');
      out.push('---');
      out.push('');
    }
  }
}
fs.writeFileSync(require('path').join(__dirname,'..','docs/API.md'), out.join('\n'));
console.error(`generated ${count} endpoints -> docs/API.md`);
