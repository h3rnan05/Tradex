#!/usr/bin/env bash
#
# clickup.sh — send a notification/summary. ClickUp is OPTIONAL.
#
# Usage:
#   scripts/clickup.sh "Title" "Body markdown"
#
# If CLICKUP_API_TOKEN + CLICKUP_LIST_ID are set, creates a ClickUp task.
# Otherwise falls back to appending to memory/DAILY-SUMMARY.md, which is
# committed to the repo and therefore readable from GitHub.
#
# Future improvement (see docs/BOT-SETUP.md): replace with telegram.sh
# using the free Telegram Bot API.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

title="${1:?usage: clickup.sh \"Title\" \"Body\"}"
body="${2:-}"

if [[ -n "${CLICKUP_API_TOKEN:-}" && -n "${CLICKUP_LIST_ID:-}" ]]; then
  curl -sS -X POST "https://api.clickup.com/api/v2/list/$CLICKUP_LIST_ID/task" \
    -H "Authorization: $CLICKUP_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(python3 - "$title" "$body" <<'PY'
import json, sys
print(json.dumps({"name": sys.argv[1], "markdown_description": sys.argv[2]}))
PY
)" >/dev/null
  echo "ClickUp task created: $title"
else
  out="$REPO_ROOT/memory/DAILY-SUMMARY.md"
  {
    echo ""
    echo "---"
    echo ""
    echo "## $title"
    echo ""
    echo "_$(date -u '+%Y-%m-%d %H:%M UTC')_"
    echo ""
    echo "$body"
  } >>"$out"
  echo "FALLBACK: appended to memory/DAILY-SUMMARY.md (commit it so it is readable from GitHub)."
fi
