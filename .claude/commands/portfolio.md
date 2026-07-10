---
description: Snapshot of the paper account — equity, cash, positions, orders, PDT status
---

Show the current state of the Alpaca PAPER account:

1. Run `scripts/alpaca.sh account`, `scripts/alpaca.sh positions`,
   `scripts/alpaca.sh orders` and `scripts/alpaca.sh daytrades`.
2. Summarize in a short table: equity, cash, day P&L vs the last entry in
   memory/DAILY-SUMMARY.md, open positions (should be none outside market
   hours), open orders, daytrade_count and remaining day trades.
3. If any position exists outside 8:30 AM–3:00 PM CT, flag it in bold as an
   overnight-rule violation.
