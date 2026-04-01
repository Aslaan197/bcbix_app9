// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by the prompt-fading-ai edge function */
export interface AIFadingConfig {
  /** Ordered array of prompt CODES (e.g. ["FP","PP","G","V","I"]) */
  prompt_flow:     string[];
  move_forward:    { accuracy: number; trials: number; sessions: number };
  move_backward:   { accuracy: number; trials: number; sessions: number };
  /** Prompt CODES excluded from fading evaluation */
  removed_prompts: string[];
}

export interface AIFadingResult {
  config: AIFadingConfig;
  raw:    string;
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Calls the prompt-fading-ai Supabase Edge Function.
 * Throws on network failure, non-OK HTTP, or missing/malformed config.
 */
export async function generateFadingConfig(
  userInput:        string,
  availablePrompts: Array<{ name: string; code: string }>,
  currentConfig:    {
    prompt_flow:     string[];
    removed_prompts: string[];
    move_forward:    { accuracy: number; trials: number; sessions: number };
    move_backward:   { accuracy: number; trials: number; sessions: number };
  },
): Promise<AIFadingResult> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, '');
  const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

  if (!supabaseUrl || supabaseUrl.includes('localhost')) {
    throw new Error(
      'VITE_SUPABASE_URL is not set. Add it to .env.local and restart the dev server.',
    );
  }
  if (!supabaseKey) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }

  const endpoint = `${supabaseUrl}/functions/v1/prompt-fading-ai`;
  console.log('[Prompt Fading AI] POST', endpoint);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        user_input:        userInput,
        available_prompts: availablePrompts,
        current_config:    currentConfig,
      }),
    });
  } catch (networkErr) {
    console.error('[Prompt Fading AI] network error:', networkErr);
    // In browsers a CORS preflight failure (e.g. function not deployed) is
    // indistinguishable from a true network error — both throw a TypeError.
    // Give an actionable message that covers the most likely cause.
    throw new Error(
      'Could not reach the AI service. The most likely cause is that the ' +
      'prompt-fading-ai edge function has not been deployed yet.\n\n' +
      'Run the deploy script:\n' +
      'SUPABASE_ACCESS_TOKEN=sbp_… ANTHROPIC_API_KEY=sk-ant-… ./deploy-ai-function.sh',
    );
  }

  console.log('[Prompt Fading AI] response status:', res.status);

  let body: { config?: AIFadingConfig; raw?: string; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error(`AI service returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok || body.error) {
    console.error('[Prompt Fading AI] function error:', body.error);
    throw new Error(body.error ?? `AI service error (HTTP ${res.status})`);
  }

  if (!body.config || typeof body.config !== 'object') {
    console.error('[Prompt Fading AI] unexpected response — missing config:', body);
    throw new Error(
      'The prompt-fading-ai edge function is not yet deployed. ' +
      'Run: supabase functions deploy prompt-fading-ai',
    );
  }

  console.log('[Prompt Fading AI] received config:', body.config);
  return { config: body.config, raw: body.raw ?? '' };
}
