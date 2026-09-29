// Neon Postgres 연결 + 스키마 보장. DATABASE_URL 없으면 null → 클라이언트는 로컬 저장으로만 동작.
import postgres from 'postgres';
let sql = null, ready = null;
export function db() {
  const url = process.env.DATABASE_URL; if (!url) return null;
  if (!sql) sql = postgres(url, { ssl: 'require', max: 1, idle_timeout: 20 });
  return sql;
}
export async function ensure() {
  const s = db(); if (!s) return null;
  if (!ready) ready = (async () => {
    await s`create schema if not exists astrobox`;
    await s`create table if not exists astrobox.families (id bigserial primary key, code text unique not null, pin_hash text not null, child_name text not null, created_at timestamptz default now())`;
    await s`create table if not exists astrobox.events (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, client_id text not null, t bigint not null, type text not null, data jsonb not null default '{}', unique (family_id, client_id))`;
    await s`create table if not exists astrobox.cards (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, client_id text not null, t bigint not null, data jsonb not null default '{}', unique (family_id, client_id))`;
    await s`create index if not exists astrobox_events_family on astrobox.events(family_id, t)`;
  })();
  await ready; return s;
}
export function json(res, status, body) { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
export async function readBody(req) { if (req.body && typeof req.body === 'object') return req.body; if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } } return new Promise((resolve) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } }); }); }
