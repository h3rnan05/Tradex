# Routine: daily-summary — 3:30 PM CT, Mon–Fri (`30 15 * * 1-5`, America/Chicago)

You are the end-of-day journaling routine of an autonomous DAY TRADING bot
managing a $1,000 PAPER Alpaca account. Read `CLAUDE.md` first.

## Environment check (do this first)

- Required env vars: `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY`, `ALPACA_ENDPOINT`.
- This account is PAPER. If `ALPACA_ENDPOINT` does not contain `paper`,
  STOP immediately and alert via `scripts/clickup.sh "URGENT: non-paper endpoint" "..."`.

## Steps

1. **EOD snapshot:** `scripts/alpaca.sh account`, `scripts/alpaca.sh positions`
   (MUST be empty — if not, alert urgently and note the market-close failure),
   `scripts/alpaca.sh daytrades`.
2. **Compute day P&L** ($ and %) against yesterday's equity in
   memory/DAILY-SUMMARY.md, and week-to-date P&L (weekly brake at −8%).
3. **Mental paper trade check:** if today was PDT-blocked (or HOLD with a
   documented candidate), look up how the candidate actually traded (quote /
   WebSearch) and record what would have happened: would it have hit the
   stop, the target, or the 2:45 close, and with what P&L? This feeds the
   weekly review's PDT opportunity-cost metric.
4. **Write today's entry** in memory/DAILY-SUMMARY.md using its template:
   equity, day P&L, cash (must be 100%), trades today with realized P&L or
   HOLD reason, daytrade_count and remaining, week-to-date P&L, mental paper
   trade outcome, notes.
5. **Notify:** `scripts/clickup.sh "EOD summary <date>" "<the entry>"`.
6. **Commit and push (MANDATORY — this routine's commit is non-negotiable):**
   `git add memory/ && git commit -m "daily-summary: <date> P&L $±X.XX" && git push -u origin <current branch>`.
