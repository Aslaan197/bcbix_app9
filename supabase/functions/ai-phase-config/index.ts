// Supabase Edge Function — AI Phase Config
// Deploy: supabase functions deploy ai-phase-config
// Secret:  supabase secrets set AI_API_KEY=sk-ant-...

/// <reference path="../deno.d.ts" />

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Must be present on EVERY response, including errors and the OPTIONS preflight.
// Access-Control-Max-Age tells the browser to cache the preflight for 10 minutes
// so it doesn't re-send an OPTIONS request on every call.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age':       '600',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ABA clinical rules engine.
Convert the user's natural language instructions into a structured phase progression configuration.
Always return ONLY valid JSON — no markdown, no prose, no code fences.

Rules for parsing:
- "around X%" or "approximately X%" → use X / 100 as threshold
- "X days" → treat as X sessions
- "at least X trials" → min_trials: X
- missing regression → omit the "regression" key entirely
- allow_failures: 0 means no failures allowed; 1 means allow 1 failure

Output schema (strictly follow this):
{
  "threshold": <number 0-1>,
  "sessions_required": <integer >= 1>,
  "consecutive": <boolean>,
  "min_trials": <integer >= 1>,
  "allow_failures": <0 or 1>,
  "regression": {
    "threshold": <number 0-1>,
    "sessions_required": <integer >= 1>,
    "action": "move_back"
  }
}
The "regression" field is OPTIONAL — only include it when the user mentions regression, reverting, or going back a phase.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[${reqId}] ${req.method} ${req.url}`);

  // ── CORS preflight ──
  // The browser sends OPTIONS before every cross-origin POST.
  // We must respond 200 with all CORS headers — any other status blocks the real request.
  if (req.method === 'OPTIONS') {
    console.log(`[${reqId}] CORS preflight — returning 200`);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // ── Debug: log authorization header ──
  console.log(`[${reqId}] authorization header:`, req.headers.get('authorization'));

  // ── Only accept POST ──
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Parse request body ──
    // Accept both application/json and text/plain (text/plain avoids CORS preflight
    // when called from the browser without an Authorization header on the request).
    let prompt: string;
    try {
      const text = await req.text();
      const body = JSON.parse(text) as { prompt?: unknown };
      prompt = body?.prompt as string;
      console.log(`[${reqId}] Received prompt: "${String(prompt).slice(0, 120)}"`);
    } catch (parseErr) {
      console.error(`[${reqId}] Failed to parse request body:`, parseErr);
      return json({ error: 'Invalid JSON in request body' }, 400);
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return json({ error: 'Missing or empty "prompt" field' }, 400);
    }

    // ── Check API key ──
    const apiKey = Deno.env.get('AI_API_KEY');
    if (!apiKey) {
      console.error(`[${reqId}] AI_API_KEY secret is not set`);
      return json({ error: 'Missing API key' }, 500);
    }

    // ── Call Anthropic ──
    console.log(`[${reqId}] Calling Anthropic claude-opus-4-6...`);
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-6',
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: prompt.trim() }],
      }),
    });

    console.log(`[${reqId}] Anthropic response status: ${anthropicRes.status}`);

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`[${reqId}] Anthropic error body:`, errText);
      return json({ error: `Anthropic API error (HTTP ${anthropicRes.status})`, raw: errText }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const raw: string   = anthropicData?.content?.[0]?.text ?? '';
    console.log(`[${reqId}] Anthropic raw response: "${raw.slice(0, 200)}"`);

    // ── Parse JSON from response ──
    // Strip accidental markdown code fences the model sometimes adds
    const cleaned = raw
      .replace(/^```(?:json)?[\r\n]*/i, '')
      .replace(/[\r\n]*```$/,            '')
      .trim();

    let config: unknown;
    try {
      config = JSON.parse(cleaned);
      console.log(`[${reqId}] Parsed config:`, JSON.stringify(config));
    } catch (parseErr) {
      console.error(`[${reqId}] JSON.parse failed on cleaned text:`, cleaned, parseErr);
      return json({ error: 'AI response could not be parsed as JSON', raw }, 422);
    }

    return json({ config, raw });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error(`[${reqId}] Unhandled error:`, err);
    return json({ error: message }, 500);
  }
});
