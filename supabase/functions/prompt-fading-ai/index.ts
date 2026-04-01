// Supabase Edge Function — Prompt Fading AI
// Deploy: supabase functions deploy prompt-fading-ai
// Secret:  supabase secrets set AI_API_KEY=sk-ant-...

/// <reference path="../deno.d.ts" />

// ─── CORS ─────────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailablePrompt {
  name: string;
  code: string;
}

interface CurrentConfig {
  prompt_flow:     string[];   // ordered prompt codes
  removed_prompts: string[];   // excluded prompt codes
  move_forward:    { accuracy: number; trials: number; sessions: number };
  move_backward:   { accuracy: number; trials: number; sessions: number };
}

interface RequestBody {
  user_input:        string;
  available_prompts: AvailablePrompt[];
  current_config:    CurrentConfig;
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert in ABA (Applied Behavior Analysis) therapy software, specializing in prompt fading — a technique where therapists systematically reduce prompting levels to increase learner independence.

The user will describe changes to make to a Prompt Fading configuration in natural language.

You will receive:
- The user's instruction
- A list of available prompts (name + code)
- The current configuration

Return ONLY valid JSON — no markdown, no prose, no code fences — in this exact schema:
{
  "prompt_flow": ["FP", "PP", "M", "G", "V", "I"],
  "move_forward":  { "accuracy": 80, "trials": 3, "sessions": 1 },
  "move_backward": { "accuracy": 50, "trials": 3, "sessions": 1 },
  "removed_prompts": []
}

Field rules:
- "prompt_flow": ordered array of prompt CODES (from starting position to goal). Must contain at least one code. Only use codes from the available_prompts list.
- "removed_prompts": array of prompt CODES to exclude from fading evaluation. These must NOT appear in prompt_flow.
- "move_forward.accuracy": integer 1–100 (percentage). The learner must reach this accuracy to advance to a less intrusive prompt.
- "move_backward.accuracy": integer 0–99 (percentage). Must be strictly LESS than move_forward.accuracy. When accuracy falls below this, the learner regresses to a more intrusive prompt.
- "trials" and "sessions": positive integers, minimum 1.

ABA terminology mappings:
- "most-to-least" = most intrusive prompt first: order from FP → PP → M → G → V → I
- "least-to-most" = least intrusive prompt first: order from I → V → G → M → PP → FP
- "fade" / "decrease prompting" / "move forward" = go to less intrusive prompt
- "regress" / "increase prompting" / "move backward" = go to more intrusive prompt
- "start from X" = X is the first prompt in prompt_flow (the starting position)
- "fade to Y" = Y is the last prompt in prompt_flow (the goal)
- "independent" = code "I"
- "gestural" or "gesture" = code "G"
- "verbal" = code "V"
- "model" = code "M"
- "partial physical" = code "PP"
- "full physical" = code "FP"
- "no response" or "NR" = exclude (put in removed_prompts)

If the user doesn't mention something, keep its value from current_config.
Always ensure move_forward.accuracy > move_backward.accuracy.`;

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[${reqId}] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log(`[${reqId}] CORS preflight — returning 200`);
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // ── Parse request body ────────────────────────────────────────────────────
    let body: RequestBody;
    try {
      const text = await req.text();
      body = JSON.parse(text) as RequestBody;
      console.log(`[${reqId}] user_input: "${String(body?.user_input).slice(0, 160)}"`);
    } catch (parseErr) {
      console.error(`[${reqId}] Failed to parse request body:`, parseErr);
      return json({ error: 'Invalid JSON in request body' }, 400);
    }

    if (!body?.user_input || typeof body.user_input !== 'string' || !body.user_input.trim()) {
      return json({ error: 'Missing or empty "user_input" field' }, 400);
    }
    if (!Array.isArray(body?.available_prompts)) {
      return json({ error: 'Missing "available_prompts" array' }, 400);
    }
    if (!body?.current_config || typeof body.current_config !== 'object') {
      return json({ error: 'Missing "current_config" object' }, 400);
    }

    // ── Check API key ─────────────────────────────────────────────────────────
    const apiKey = Deno.env.get('AI_API_KEY');
    if (!apiKey) {
      console.error(`[${reqId}] AI_API_KEY secret is not set`);
      return json({ error: 'AI_API_KEY secret is not configured on this deployment. Run: supabase secrets set AI_API_KEY=sk-ant-...' }, 500);
    }

    // ── Build user message ────────────────────────────────────────────────────
    const promptList = body.available_prompts
      .map((p: AvailablePrompt) => `  - "${p.name}" (code: "${p.code}")`)
      .join('\n');

    const userMessage = `
User instruction: "${body.user_input.trim()}"

Available prompts:
${promptList}

Current configuration:
${JSON.stringify(body.current_config, null, 2)}
`.trim();

    console.log(`[${reqId}] Calling Anthropic claude-sonnet-4-6...`);

    // ── Call Anthropic ────────────────────────────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });

    console.log(`[${reqId}] Anthropic status: ${anthropicRes.status}`);

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error(`[${reqId}] Anthropic error:`, errText);
      return json({ error: `Anthropic API error (HTTP ${anthropicRes.status})`, raw: errText }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const raw: string   = anthropicData?.content?.[0]?.text ?? '';
    console.log(`[${reqId}] Anthropic raw: "${raw.slice(0, 300)}"`);

    // ── Strip markdown fences if present ─────────────────────────────────────
    const cleaned = raw
      .replace(/^```(?:json)?[\r\n]*/i, '')
      .replace(/[\r\n]*```$/,            '')
      .trim();

    // ── Parse and validate the JSON ───────────────────────────────────────────
    let config: {
      prompt_flow:     string[];
      move_forward:    { accuracy: number; trials: number; sessions: number };
      move_backward:   { accuracy: number; trials: number; sessions: number };
      removed_prompts: string[];
    };

    try {
      config = JSON.parse(cleaned);
      console.log(`[${reqId}] Parsed config:`, JSON.stringify(config));
    } catch (parseErr) {
      console.error(`[${reqId}] JSON.parse failed:`, cleaned, parseErr);
      return json({ error: 'AI response could not be parsed as JSON', raw }, 422);
    }

    // Basic structural validation
    if (!Array.isArray(config.prompt_flow) || config.prompt_flow.length === 0) {
      return json({ error: 'AI returned an empty or missing prompt_flow', raw }, 422);
    }
    if (!config.move_forward || typeof config.move_forward.accuracy !== 'number') {
      return json({ error: 'AI returned invalid move_forward config', raw }, 422);
    }
    if (!config.move_backward || typeof config.move_backward.accuracy !== 'number') {
      return json({ error: 'AI returned invalid move_backward config', raw }, 422);
    }
    if (!Array.isArray(config.removed_prompts)) {
      config.removed_prompts = [];
    }

    // Clamp values to safe ranges
    config.move_forward.accuracy  = Math.min(100, Math.max(1,  Math.round(config.move_forward.accuracy)));
    config.move_backward.accuracy = Math.min(99,  Math.max(0,  Math.round(config.move_backward.accuracy)));
    config.move_forward.trials    = Math.min(20,  Math.max(1,  Math.round(config.move_forward.trials ?? 3)));
    config.move_forward.sessions  = Math.min(20,  Math.max(1,  Math.round(config.move_forward.sessions ?? 1)));
    config.move_backward.trials   = Math.min(20,  Math.max(1,  Math.round(config.move_backward.trials ?? 3)));
    config.move_backward.sessions = Math.min(20,  Math.max(1,  Math.round(config.move_backward.sessions ?? 1)));

    // Ensure move_backward < move_forward
    if (config.move_backward.accuracy >= config.move_forward.accuracy) {
      config.move_backward.accuracy = Math.max(0, config.move_forward.accuracy - 10);
    }

    return json({ config, raw });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error(`[${reqId}] Unhandled error:`, err);
    return json({ error: message }, 500);
  }
});
