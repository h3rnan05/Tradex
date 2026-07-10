# TRADING STRATEGY — News-Catalyst Day Trading (Paper, $1,000)

This replaces any swing-trading strategy. The bot is a DAY trader.

## Hard rules

- Stocks only. Never options, never crypto, never shorts (for now).
- **No position ever passes the night.** Everything closes before market
  close, no exceptions, win or lose. Market-close routine at 2:45 PM CT
  closes and verifies.
- Max **1 new trade per day** (PDT rule, see below). Only the single
  highest-conviction setup from the morning research.
- Max **30% of equity per position** (~$300 on $1,000). Whole shares only,
  so the tradable universe is liquid stocks priced ≤ $300.
- Every trade carries a news catalyst documented THAT day in
  RESEARCH-LOG.md. No catalyst, no trade.
- **Stop loss:** −1.5% to −2.5% from entry, placed as a REAL order in Alpaca
  immediately after the fill (`type=stop`, `time_in_force=day` — never GTC,
  because nothing lives more than one day).
- **Target:** minimum 2:1 reward/risk. If price touches target, close.
  If by 2:45 PM CT neither stop nor target has been hit, close at market.
- **Daily loss brake:** if the day's P&L touches **−3% of equity** (~−$30),
  close everything and do not trade again that day.
- **Weekly brake:** if the week accumulates **−8%**, the bot enters HOLD
  mode until the Friday review.
- Not trading is a valid and frequent decision. Default: HOLD. A no-trade
  day with capital intact is a good day.
- Do not trade during the first hour after FOMC/CPI announcements on those
  days.

## PDT design (Pattern Day Trader rule)

Alpaca paper simulates PDT: with equity < $25,000, max 3 day trades per
rolling 5 business days. This can NOT be ignored, even in paper.

- Pre-market ALWAYS reports the current `daytrade_count` and how many day
  trades remain in the window (`scripts/alpaca.sh daytrades`).
- If no day trades remain, the day is automatically HOLD. Research still
  happens; the best idea is documented as a "mental paper trade" in
  RESEARCH-LOG.md, and the weekly review records what would have happened.
- With only ~3 trades per week available, take ONLY high-conviction setups.
  Discard everything rated "medium" or below.

## Buy gate — ALL must pass; if one fails, skip the trade and log the reason

1. `daytrade_count` < 3 (leaves room in the 5-day PDT window).
2. This is the only new trade of the day.
3. Cost ≤ 30% of equity AND ≤ available cash.
4. Catalyst documented TODAY in RESEARCH-LOG.md.
5. Bid/ask spread < 0.3% (`scripts/alpaca.sh quote SYMBOL` prints the gate).
   Wider means illiquid or halted — skip.
6. Stop and target defined BEFORE the entry order, with R:R ≥ 2:1.

## Execution sequence for an approved trade

1. `scripts/alpaca.sh quote SYMBOL` — fresh quote, verify spread gate.
2. `scripts/alpaca.sh buy SYMBOL QTY` — market buy, day order.
3. Poll `scripts/alpaca.sh order-status ID` until filled; record fill price.
4. IMMEDIATELY: `scripts/alpaca.sh stop SYMBOL QTY STOP_PRICE` (−1.5% to
   −2.5% from actual fill).
5. Log entry, stop, target, catalyst and R:R in TRADE-LOG.md. Commit & push.
