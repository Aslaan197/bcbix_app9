// ─── Types ────────────────────────────────────────────────────────────────────

export interface AIPhaseConfig {
  threshold: number;           // 0–1  (e.g. 0.8 = 80%)
  sessions_required: number;
  consecutive: boolean;
  min_trials: number;
  allow_failures: number;      // 0 = none, 1 = allow one
  regression?: {
    threshold: number;         // 0–1
    sessions_required: number;
    action: 'move_back';
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AIPhaseConfigResult {
  config: AIPhaseConfig;
  raw: string;
  errors: ValidationError[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateAIConfig(config: Partial<AIPhaseConfig> | undefined | null): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({ field: 'config', message: 'No configuration was returned by the AI' });
    return errors;
  }

  if (config.threshold === undefined || isNaN(config.threshold)) {
    errors.push({ field: 'threshold', message: 'Accuracy threshold is missing or invalid' });
  } else if (config.threshold < 0 || config.threshold > 1) {
    errors.push({ field: 'threshold', message: 'Accuracy threshold must be between 0 and 1' });
  }

  if (!config.sessions_required || config.sessions_required < 1) {
    errors.push({ field: 'sessions_required', message: 'Sessions required must be at least 1' });
  }

  if (!config.min_trials || config.min_trials < 1) {
    errors.push({ field: 'min_trials', message: 'Minimum trials must be at least 1' });
  }

  if (config.allow_failures === undefined || ![0, 1].includes(config.allow_failures)) {
    errors.push({ field: 'allow_failures', message: 'Failure tolerance must be 0 or 1' });
  }

  if (config.consecutive === undefined || typeof config.consecutive !== 'boolean') {
    errors.push({ field: 'consecutive', message: 'Consecutive sessions flag is missing or invalid' });
  }

  if (config.regression) {
    if (
      config.threshold !== undefined &&
      !isNaN(config.threshold) &&
      config.regression.threshold >= config.threshold
    ) {
      errors.push({
        field: 'regression.threshold',
        message: 'Regression threshold must be below mastery threshold',
      });
    }
    if (!config.regression.sessions_required || config.regression.sessions_required < 1) {
      errors.push({
        field: 'regression.sessions_required',
        message: 'Regression sessions must be at least 1',
      });
    }
  }

  return errors;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function generatePhaseConfig(prompt: string): Promise<AIPhaseConfigResult> {
  // Read credentials directly from env vars at call-time.
  // This bypasses supabase.functions.invoke() which calls auth.getSession()
  // internally — that internal call can throw and get wrapped as a misleading
  // "Failed to send a request to the Edge Function" error even when the
  // function is perfectly reachable.
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '');
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

  // Send the anon key only as the Authorization bearer token.
  // The deployed Supabase gateway only allows 'authorization' and 'content-type'
  // in its CORS Access-Control-Allow-Headers — sending an 'apikey' header causes
  // the browser to reject the CORS preflight before the request can be sent.
  const endpoint = `${supabaseUrl}/functions/v1/ai-phase-config`;
  console.log('[AI Assist] POST', endpoint);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ prompt }),
    });
  } catch (networkErr) {
    console.error('[AI Assist] network error:', networkErr);
    throw new Error(
      `Network error reaching the edge function.\n` +
      `URL: ${supabaseUrl}/functions/v1/ai-phase-config\n` +
      `Check your internet connection and that VITE_SUPABASE_URL is correct.`,
    );
  }

  console.log('[AI Assist] response status:', res.status);

  let body: { config: AIPhaseConfig; raw: string; error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error(`Edge function returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (!res.ok || body.error) {
    console.error('[AI Assist] function error:', body.error);
    throw new Error(body.error ?? `Edge function error (HTTP ${res.status})`);
  }

  // Guard against stub / mis-deployed function that returns a response without
  // a `config` object (e.g. {"success":true,"message":"..."}).
  if (!body.config || typeof body.config !== 'object') {
    console.error('[AI Assist] unexpected response shape — missing config:', body);
    throw new Error(
      'The edge function is not yet deployed with the AI implementation. ' +
      'Run the deploy-ai-function.sh script to deploy it, then try again.',
    );
  }

  console.log('[AI Assist] received config:', body.config);

  const errors = validateAIConfig(body.config);
  return { config: body.config, raw: body.raw ?? '', errors };
}
