const ALLOWED_ORIGINS = new Set([
  "https://rikomuze.github.io"
]);

const KEY_RE = /^MUZE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-MUZE-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      ...cors(request),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

async function hashKey(key) {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS exchange_store (
      key_hash TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }

    const origin = request.headers.get("Origin") || "";
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, request);
    }

    const url = new URL(request.url);
    if (url.pathname === "/") {
      return json({ ok: true, service: "MUZE TOOL BOX API" }, 200, request);
    }
    if (url.pathname !== "/api/exchange") {
      return json({ error: "not_found" }, 404, request);
    }
    if (!env.DB) {
      return json({ error: "db_binding_missing" }, 503, request);
    }

    const key = (request.headers.get("X-MUZE-Key") || "").trim().toUpperCase();
    if (!KEY_RE.test(key)) {
      return json({ error: "invalid_key" }, 401, request);
    }

    await ensureSchema(env.DB);
    const keyHash = await hashKey(key);

    if (request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT payload, updated_at FROM exchange_store WHERE key_hash = ?"
      ).bind(keyHash).first();

      if (!row) {
        return json({ found: false, rows: [], updatedAt: null }, 200, request);
      }

      let rows = [];
      try {
        const parsed = JSON.parse(row.payload);
        rows = Array.isArray(parsed) ? parsed : [];
      } catch (_) {}

      return json({
        found: true,
        rows,
        updatedAt: row.updated_at
      }, 200, request);
    }

    if (request.method === "PUT") {
      let body;
      try {
        body = await request.json();
      } catch (_) {
        return json({ error: "invalid_json" }, 400, request);
      }

      if (!body || !Array.isArray(body.rows)) {
        return json({ error: "rows_must_be_array" }, 400, request);
      }
      if (body.rows.length > 500) {
        return json({ error: "too_many_rows" }, 413, request);
      }

      const payload = JSON.stringify(body.rows);
      if (new TextEncoder().encode(payload).byteLength > 900000) {
        return json({ error: "payload_too_large" }, 413, request);
      }

      const updatedAt = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO exchange_store (key_hash, payload, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key_hash) DO UPDATE SET
           payload = excluded.payload,
           updated_at = excluded.updated_at`
      ).bind(keyHash, payload, updatedAt).run();

      return json({ ok: true, updatedAt }, 200, request);
    }

    return json({ error: "method_not_allowed" }, 405, request);
  }
};
