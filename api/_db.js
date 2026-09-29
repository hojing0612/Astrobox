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
  if (!ready) ready = (async () => { const run = async (q) => { try { await q; } catch (e) { if (!/already exists|duplicate/i.test(String(e.message))) throw e; } };
    await run(s`create schema if not exists astrobox`);
    await run(s`create table if not exists astrobox.families (id bigserial primary key, code text unique not null, pin_hash text not null, child_name text not null, created_at timestamptz default now())`);
    await run(s`create table if not exists astrobox.events (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, client_id text not null, t bigint not null, type text not null, data jsonb not null default '{}', unique (family_id, client_id))`);
    await run(s`create table if not exists astrobox.cards (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, client_id text not null, t bigint not null, data jsonb not null default '{}', unique (family_id, client_id))`);
    await run(s`create index if not exists astrobox_events_family on astrobox.events(family_id, t)`);
    await run(s`create table if not exists astrobox.requests (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, mission text not null, next_mission text, status text not null default 'pending', t bigint not null, decided_at bigint)`);
    await run(s`create table if not exists astrobox.entitlements (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, pack text not null, source text not null, t bigint not null, unique (family_id, pack))`);
    await run(s`create table if not exists astrobox.orders (id bigserial primary key, family_id bigint references astrobox.families(id) on delete cascade, pack text not null, amount int not null, currency text not null default 'KRW', provider text not null, status text not null, t bigint not null)`);
  })();
  await ready; return s;
}
export function json(res, status, body) { res.statusCode = status; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(body)); }
export async function readBody(req) { if (req.body && typeof req.body === 'object') return req.body; if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } } return new Promise((resolve) => { let d = ''; req.on('data', (c) => { d += c; }); req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } }); }); }
