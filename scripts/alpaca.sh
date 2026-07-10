#!/usr/bin/env bash
#
# alpaca.sh — Alpaca PAPER trading API wrapper.
#
# HARD RULE: this project trades EXCLUSIVELY against the paper API.
# If ALPACA_ENDPOINT does not contain the word "paper", this script
# refuses to run and exits with code 2. Never remove this check.
#
# Usage:
#   scripts/alpaca.sh account                     # account snapshot (equity, cash, daytrade_count)
#   scripts/alpaca.sh daytrades                   # daytrade_count + remaining day trades in PDT window
#   scripts/alpaca.sh positions                   # open positions
#   scripts/alpaca.sh orders                      # open orders
#   scripts/alpaca.sh clock                       # market clock (is_open, next_open, next_close)
#   scripts/alpaca.sh quote SYMBOL                # latest bid/ask + spread %
#   scripts/alpaca.sh buy SYMBOL QTY              # market buy, time_in_force=day
#   scripts/alpaca.sh sell SYMBOL QTY             # market sell, time_in_force=day
#   scripts/alpaca.sh stop SYMBOL QTY STOP_PRICE  # stop-loss sell, type=stop, time_in_force=day (never GTC)
#   scripts/alpaca.sh order-status ORDER_ID       # check one order
#   scripts/alpaca.sh cancel ORDER_ID             # cancel one order
#   scripts/alpaca.sh cancel-all                  # cancel every open order
#   scripts/alpaca.sh close SYMBOL                # close one position at market
#   scripts/alpaca.sh close-all                   # close ALL positions and cancel all orders
#
# Env vars (set in cloud routine env block, or in local .env):
#   ALPACA_KEY_ID, ALPACA_SECRET_KEY
#   ALPACA_ENDPOINT       (must be https://paper-api.alpaca.markets/v2)
#   ALPACA_DATA_ENDPOINT  (default https://data.alpaca.markets/v2)

set -euo pipefail

# Load local .env if present (cloud routines inject env vars directly).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/../.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/../.env"
  set +a
fi

ALPACA_ENDPOINT="${ALPACA_ENDPOINT:-https://paper-api.alpaca.markets/v2}"
ALPACA_DATA_ENDPOINT="${ALPACA_DATA_ENDPOINT:-https://data.alpaca.markets/v2}"

# ---------------------------------------------------------------------------
# PAPER-ONLY GUARD — do not remove, do not bypass.
# ---------------------------------------------------------------------------
if [[ "$ALPACA_ENDPOINT" != *paper* ]]; then
  echo "FATAL: ALPACA_ENDPOINT is not a paper endpoint: $ALPACA_ENDPOINT" >&2
  echo "This account is PAPER ONLY. Refusing to run against a live endpoint." >&2
  exit 2
fi

if [[ -z "${ALPACA_KEY_ID:-}" || -z "${ALPACA_SECRET_KEY:-}" ]]; then
  echo "ERROR: ALPACA_KEY_ID / ALPACA_SECRET_KEY are not set." >&2
  exit 1
fi

AUTH=(-H "APCA-API-KEY-ID: $ALPACA_KEY_ID" -H "APCA-API-SECRET-KEY: $ALPACA_SECRET_KEY")

api() { # api METHOD PATH [JSON_BODY]
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "${AUTH[@]}" -H "Content-Type: application/json")
  [[ -n "$body" ]] && args+=(-d "$body")
  curl "${args[@]}" "$ALPACA_ENDPOINT$path"
}

data_api() { # data_api PATH
  curl -sS "${AUTH[@]}" "$ALPACA_DATA_ENDPOINT$1"
}

pretty() { python3 -m json.tool 2>/dev/null || cat; }

cmd="${1:-}"
case "$cmd" in
  account)
    api GET /account | pretty
    ;;

  daytrades)
    api GET /account | python3 -c '
import json, sys
a = json.load(sys.stdin)
used = int(a.get("daytrade_count", 0))
remaining = max(0, 3 - used)
equity, cash = a.get("equity"), a.get("cash")
print(f"daytrade_count (rolling 5 business days): {used}")
print(f"day trades remaining before PDT block:    {remaining}")
print(f"equity: {equity}  cash: {cash}")
if remaining == 0:
    print("PDT: NO day trades available -> today is automatically HOLD.")
'
    ;;

  positions)
    api GET /positions | pretty
    ;;

  orders)
    api GET "/orders?status=open&limit=100" | pretty
    ;;

  clock)
    api GET /clock | pretty
    ;;

  quote)
    sym="${2:?usage: alpaca.sh quote SYMBOL}"
    data_api "/stocks/${sym^^}/quotes/latest" | python3 -c '
import json, sys
d = json.load(sys.stdin)
q = d.get("quote") or {}
bid, ask = q.get("bp"), q.get("ap")
print(json.dumps(q, indent=2))
if bid and ask and bid > 0:
    mid = (bid + ask) / 2
    spread = (ask - bid) / mid * 100
    print(f"\nbid={bid} ask={ask} spread={spread:.3f}%")
    print("SPREAD GATE: " + ("PASS (<0.3%)" if spread < 0.3 else "FAIL (>=0.3% - skip this trade)"))
'
    ;;

  buy|sell)
    sym="${2:?usage: alpaca.sh $cmd SYMBOL QTY}"
    qty="${3:?usage: alpaca.sh $cmd SYMBOL QTY}"
    api POST /orders "{\"symbol\":\"${sym^^}\",\"qty\":\"$qty\",\"side\":\"$cmd\",\"type\":\"market\",\"time_in_force\":\"day\"}" | pretty
    ;;

  stop)
    sym="${2:?usage: alpaca.sh stop SYMBOL QTY STOP_PRICE}"
    qty="${3:?usage: alpaca.sh stop SYMBOL QTY STOP_PRICE}"
    px="${4:?usage: alpaca.sh stop SYMBOL QTY STOP_PRICE}"
    # time_in_force=day on purpose: nothing in this system lives more than one day.
    api POST /orders "{\"symbol\":\"${sym^^}\",\"qty\":\"$qty\",\"side\":\"sell\",\"type\":\"stop\",\"stop_price\":\"$px\",\"time_in_force\":\"day\"}" | pretty
    ;;

  order-status)
    id="${2:?usage: alpaca.sh order-status ORDER_ID}"
    api GET "/orders/$id" | pretty
    ;;

  cancel)
    id="${2:?usage: alpaca.sh cancel ORDER_ID}"
    api DELETE "/orders/$id"
    echo "cancel requested: $id"
    ;;

  cancel-all)
    api DELETE /orders | pretty
    ;;

  close)
    sym="${2:?usage: alpaca.sh close SYMBOL}"
    api DELETE "/positions/${sym^^}" | pretty
    ;;

  close-all)
    api DELETE "/positions?cancel_orders=true" | pretty
    ;;

  *)
    grep '^#   scripts/alpaca.sh' "$0" | sed 's/^#   //'
    exit 1
    ;;
esac
