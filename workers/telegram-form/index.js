const MAX_FIELD_LENGTH = 2000;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }

  return headers;
}

function jsonResponse(body, status, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, env),
    },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildMessage(payload) {
  const lines = [
    "<b>Новая заявка с osamdesign.com</b>",
    "",
    `<b>Имя:</b> ${escapeHtml(payload.name)}`,
    `<b>Email:</b> ${escapeHtml(payload.email)}`,
    `<b>Бюджет:</b> ${escapeHtml(payload.budget || "—")}`,
    "",
    "<b>Сообщение:</b>",
    escapeHtml(payload.message || "—"),
  ];

  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, env),
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, origin, env);
    }

    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return jsonResponse({ ok: false, error: "not_configured" }, 500, origin, env);
    }

    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!origin || !allowed.includes(origin)) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403, origin, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: "invalid_json" }, 400, origin, env);
    }

    if (payload.company) {
      return jsonResponse({ ok: true }, 200, origin, env);
    }

    const name = String(payload.name || "").trim().slice(0, 200);
    const email = String(payload.email || "").trim().slice(0, 200);
    const budget = String(payload.budget || "").trim().slice(0, 100);
    const message = String(payload.message || "").trim().slice(0, MAX_FIELD_LENGTH);

    if (!name || !email || !isValidEmail(email)) {
      return jsonResponse({ ok: false, error: "validation" }, 400, origin, env);
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: buildMessage({ name, email, budget, message }),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!telegramResponse.ok) {
      return jsonResponse({ ok: false, error: "telegram_error" }, 502, origin, env);
    }

    return jsonResponse({ ok: true }, 200, origin, env);
  },
};
