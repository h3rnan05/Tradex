# DAILY SUMMARY

EOD snapshots written by the daily-summary routine (3:30 PM CT), and the
fallback output of `scripts/clickup.sh` when ClickUp is not configured.
Because this file is committed, it is readable straight from GitHub.

## Entry template

```
## YYYY-MM-DD — EOD snapshot
- Equity: $X,XXX.XX (day P&L: $±XX.XX / ±X.X%)
- Cash: $X,XXX.XX (must be 100% — no overnight positions)
- Trades today: 0 or 1 (ticker, realized P&L) / HOLD (reason)
- daytrade_count: N (remaining: N)
- Week-to-date P&L: ±X.X% (weekly brake at −8%)
- Mental paper trade outcome (if PDT-blocked): <what would have happened>
- Notes:
```

---

## 2026-07-10 — System setup (Day 0 smoke test)
- Equity: $1,000.00 (baseline Day 0)
- Cash: $1,000.00 (100%)
- Trades today: none — system not yet live during market hours
- daytrade_count: 0 (remaining: 3)
- Notes: Smoke test PASS — `daytrades`, `positions` (empty), `orders` (empty),
  `clock` OK; paper-only guard verified (exit 2 on live endpoint). The 6 cloud
  routines were created (pre-market, market-open, midday, market-close,
  daily-summary, weekly-review) with cron in UTC (CT+5 during CDT); they run
  on this branch. First full trading cycle: Monday 2026-07-13.
