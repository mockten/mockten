// Runtime configuration placeholder.
//
// In a container this file is REPLACED at startup by docker-entrypoint.sh, which
// renders it from the environment — that is how the image stays environment-
// agnostic and carries no keys.
//
// During `npm run dev` Vite serves this file as-is: the object stays empty and
// src/config.ts falls back to import.meta.env (ecfront/.env).
window.__APP_CONFIG__ = {};
