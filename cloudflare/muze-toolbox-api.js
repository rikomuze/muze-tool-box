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

// ---------- 締め切りボード：カレンダー用ファイル（.ics）を返す ----------
// 送られてきた予定の情報から .ics を作って返すだけ。何も保存しない。
// 例: /api/ics?t=〆 応募&s=2026-10-26T23:59:00%2B09:00&a=2026-10-25T11:00:00Z,2026-10-26T11:59:00Z&id=auto-1

const ICS_LIMITS = { t: 120, d: 1500, u: 500 };

function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

// 1行75バイト以内に折り返す（RFC 5545）
function icsFold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > 73) {
      out.push(cur);
      cur = " " + ch;
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

function icsUtc(ms) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsDate(ymd) {
  return ymd.replace(/-/g, "");
}

function nextDay(ymd) {
  const d = new Date(ymd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function icsError(message) {
  return new Response(message, {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function handleIcs(request) {
  if (request.method !== "GET") {
    return icsError("GET only");
  }

  const q = new URL(request.url).searchParams;
  const title = (q.get("t") || "").trim().slice(0, ICS_LIMITS.t);
  const start = (q.get("s") || "").trim();
  const desc = (q.get("d") || "").slice(0, ICS_LIMITS.d);
  const link = (q.get("u") || "").trim().slice(0, ICS_LIMITS.u);
  const uid = (q.get("id") || "event").replace(/[^\w.-]/g, "").slice(0, 64) || "event";

  if (!title) return icsError("title is required");

  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const startMs = allDay ? Date.parse(start + "T00:00:00Z") : Date.parse(start);
  if (!start || Number.isNaN(startMs)) return icsError("invalid start");

  const now = Date.now();
  const alarms = (q.get("a") || "")
    .split(",")
    .map((s) => Date.parse(s.trim()))
    .filter((ms) => !Number.isNaN(ms) && ms > now - 60000)
    .slice(0, 2);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MUZE TOOL BOX//Deadline Board//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + uid + "@muze-tool-box",
    "DTSTAMP:" + icsUtc(now),
    "SUMMARY:" + icsEscape(title)
  ];

  if (allDay) {
    lines.push("DTSTART;VALUE=DATE:" + icsDate(start), "DTEND;VALUE=DATE:" + icsDate(nextDay(start)));
  } else {
    lines.push("DTSTART:" + icsUtc(startMs), "DTEND:" + icsUtc(startMs));
  }

  if (desc) lines.push("DESCRIPTION:" + icsEscape(desc));
  if (/^https?:\/\/[^\s]+$/.test(link)) lines.push("URL:" + link);

  for (const ms of alarms) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsEscape(title),
      "TRIGGER;VALUE=DATE-TIME:" + icsUtc(ms),
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return new Response(lines.map(icsFold).join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="deadline-' + uid + '.ics"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default {
  async fetch(request, env) {
    const icsPath = new URL(request.url).pathname;
    if (icsPath === "/api/ics") {
      // カレンダー追加はページ遷移で開くので、DB も CORS も使わない
      return handleIcs(request);
    }

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
