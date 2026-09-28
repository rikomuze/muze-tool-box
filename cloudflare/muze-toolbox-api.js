const ALLOWED_ORIGINS = new Set([
  "https://rikomuze.github.io"
]);

const HASH_RE = /^[a-f0-9]{64}$/;

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-MUZE-ID",
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

async function ensureSchema(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS exchange_store_v2 (
      key_id TEXT PRIMARY KEY,
      envelope TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ).run();
}

function validEnvelope(body) {
  if (
    !body ||
    typeof body.envelope !== "object" ||
    body.envelope === null
  ) {
    return false;
  }

  const e = body.envelope;

  return (
    e.v === 2 &&
    e.alg === "AES-GCM" &&
    e.kdf === "PBKDF2-SHA256" &&
    Number.isInteger(e.iter) &&
    e.iter >= 100000 &&
    e.iter <= 1000000 &&
    typeof e.salt === "string" &&
    typeof e.iv === "string" &&
    typeof e.ct === "string" &&
    e.salt.length <= 128 &&
    e.iv.length <= 128 &&
    e.ct.length <= 1500000
  );
}

async function handleEncrypted(request, env) {
  const keyId = (
    request.headers.get("X-MUZE-ID") || ""
  ).trim().toLowerCase();

  if (!HASH_RE.test(keyId)) {
    return json({ error: "invalid_key_id" }, 401, request);
  }

  if (request.method === "GET") {
    const row = await env.DB.prepare(
      "SELECT envelope, updated_at FROM exchange_store_v2 WHERE key_id = ?"
    )
      .bind(keyId)
      .first();

    if (!row) {
      return json(
        {
          found: false,
          envelope: null,
          updatedAt: null
        },
        200,
        request
      );
    }

    let envelope = null;

    try {
      envelope = JSON.parse(row.envelope);
    } catch (_) {
      return json({ error: "corrupt_envelope" }, 500, request);
    }

    return json(
      {
        found: true,
        envelope,
        updatedAt: row.updated_at
      },
      200,
      request
    );
  }

  if (request.method === "PUT") {
    let body;

    try {
      body = await request.json();
    } catch (_) {
      return json({ error: "invalid_json" }, 400, request);
    }

    if (!validEnvelope(body)) {
      return json({ error: "invalid_envelope" }, 400, request);
    }

    const envelope = JSON.stringify(body.envelope);

    if (
      new TextEncoder().encode(envelope).byteLength >
      1100000
    ) {
      return json({ error: "payload_too_large" }, 413, request);
    }

    const updatedAt = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO exchange_store_v2
        (key_id, envelope, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key_id) DO UPDATE SET
         envelope = excluded.envelope,
         updated_at = excluded.updated_at`
    )
      .bind(keyId, envelope, updatedAt)
      .run();

    return json(
      {
        ok: true,
        encrypted: true,
        updatedAt
      },
      200,
      request
    );
  }

  if (request.method === "DELETE") {
    await env.DB.prepare(
      "DELETE FROM exchange_store_v2 WHERE key_id = ?"
    )
      .bind(keyId)
      .run();

    return json({ ok: true }, 200, request);
  }

  return json(
    { error: "method_not_allowed" },
    405,
    request
  );
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors(request)
      });
    }

    const origin = request.headers.get("Origin") || "";

    if (
      origin &&
      !ALLOWED_ORIGINS.has(origin)
    ) {
      return json(
        { error: "origin_not_allowed" },
        403,
        request
      );
    }

    if (!env.DB) {
      return json(
        { error: "db_binding_missing" },
        503,
        request
      );
    }

    await ensureSchema(env.DB);

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return json(
        {
          ok: true,
          service: "MUZE TOOL BOX API",
          version: 2,
          encryption: "client-side",
          mode: "encrypted-only"
        },
        200,
        request
      );
    }

    if (url.pathname === "/api/exchange-v2") {
      return handleEncrypted(request, env);
    }

    return json(
      { error: "not_found" },
      404,
      request
    );
  }
};
