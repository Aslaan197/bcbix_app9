#!/bin/bash
# ─── Deploy AI edge functions to Supabase ────────────────────────────────────
# Deploys:
#   • ai-phase-config     — Phase Progression AI Assist
#   • prompt-fading-ai    — Prompt Fading AI Assist
#
# Usage:
#   chmod +x deploy-ai-function.sh
#   SUPABASE_ACCESS_TOKEN=<your-token> ANTHROPIC_API_KEY=<your-key> ./deploy-ai-function.sh

set -e

SUPABASE_BIN="${SUPABASE_BIN:-/tmp/supabase}"
PROJECT_REF="okmffythecmzyakxbhxg"

# ── Validate inputs ───────────────────────────────────────────────────────────
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo ""
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo ""
  echo "Get your personal access token from:"
  echo "  https://supabase.com/dashboard/account/tokens"
  echo ""
  echo "Then run:"
  echo "  SUPABASE_ACCESS_TOKEN=sbp_xxxx ANTHROPIC_API_KEY=sk-ant-xxxx ./deploy-ai-function.sh"
  echo ""
  exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "ERROR: ANTHROPIC_API_KEY is not set."
  echo ""
  echo "Get your Anthropic API key from:"
  echo "  https://console.anthropic.com/account/keys"
  echo ""
  echo "Then run:"
  echo "  SUPABASE_ACCESS_TOKEN=sbp_xxxx ANTHROPIC_API_KEY=sk-ant-xxxx ./deploy-ai-function.sh"
  echo ""
  exit 1
fi

# ── Download Supabase CLI if not present ─────────────────────────────────────
if [ ! -f "$SUPABASE_BIN" ]; then
  echo "Downloading Supabase CLI..."
  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_darwin_arm64.tar.gz \
    -o /tmp/supabase.tar.gz
  tar xzf /tmp/supabase.tar.gz -C /tmp
  chmod +x /tmp/supabase
fi

echo "Supabase CLI: $($SUPABASE_BIN --version)"

# ── Set the AI_API_KEY secret (shared by all AI functions) ────────────────────
echo ""
echo "Setting AI_API_KEY secret..."
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  "$SUPABASE_BIN" secrets set AI_API_KEY="$ANTHROPIC_API_KEY" \
    --project-ref "$PROJECT_REF"

echo "Secret set successfully."

# ── Deploy ai-phase-config ────────────────────────────────────────────────────
echo ""
echo "Deploying ai-phase-config edge function..."
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  "$SUPABASE_BIN" functions deploy ai-phase-config \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt

echo "ai-phase-config deployed."

# ── Deploy prompt-fading-ai ───────────────────────────────────────────────────
echo ""
echo "Deploying prompt-fading-ai edge function..."
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
  "$SUPABASE_BIN" functions deploy prompt-fading-ai \
    --project-ref "$PROJECT_REF" \
    --no-verify-jwt

echo "prompt-fading-ai deployed."

echo ""
echo "All done! Both AI Assist features should now work:"
echo "  • Phase Progression AI Assist"
echo "  • Prompt Fading AI Assist"
