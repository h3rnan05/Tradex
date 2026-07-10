#!/usr/bin/env bash
#
# perplexity.sh — news research via Perplexity API, with graceful fallback.
#
# Usage:
#   scripts/perplexity.sh "Biggest stock market news today 2026-07-10"
#
# If PERPLEXITY_API_KEY is not set, prints a FALLBACK marker and exits 0.
# The calling routine prompt must then run the same query with Claude's
# native WebSearch tool instead. Perplexity is OPTIONAL for this project.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/../.env"
  set +a
fi

query="${1:?usage: perplexity.sh \"query\"}"

if [[ -z "${PERPLEXITY_API_KEY:-}" ]]; then
  echo "FALLBACK: PERPLEXITY_API_KEY not set. Use Claude's native WebSearch tool for this query:"
  echo "QUERY: $query"
  exit 0
fi

curl -sS https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 - "$query" <<'PY'
import json, sys
print(json.dumps({
    "model": "sonar",
    "messages": [
        {"role": "system", "content": "Be precise and factual. Answer with concrete facts, tickers, numbers and cite sources."},
        {"role": "user", "content": sys.argv[1]},
    ],
}))
PY
)" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d["choices"][0]["message"]["content"])
cites = d.get("citations") or []
if cites:
    print("\nSources:")
    for c in cites:
        print(f"- {c}")
'
