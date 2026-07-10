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
