# PROJECT CONTEXT

## Mission

Validate over 4+ weeks whether a news-catalyst day-trading strategy
generates consistent returns in PAPER trading, with an auditable record of
every decision, before even considering real capital.

Going live with real money is NOT part of this project. It will only be
evaluated after a minimum of 4 weeks of weekly reviews with consistent
results.

## Account

- Alpaca PAPER account, reset to **$1,000 USD** baseline (Day 0).
- Endpoint: `https://paper-api.alpaca.markets/v2` — paper only, enforced by
  `scripts/alpaca.sh` (exits 2 on any non-paper endpoint).

## Operating principles

- The logs (TRADE-LOG, RESEARCH-LOG, DAILY-SUMMARY, WEEKLY-REVIEW) are the
  real product of this experiment. Every decision must be auditable.
- Capital preservation beats activity. HOLD is the default decision.
- The PDT rule (3 day trades / 5 business days under $25k) shapes the whole
  design: 1 trade per day max, high conviction only.
- The weekly review must also measure **what would have happened with the
  trades PDT blocked**, to know whether the restriction is costing
  performance.

## Success criteria for the 4-week evaluation

- Full audit trail: every trade has catalyst, entry, stop, target, R:R and
  realized P&L logged the same day.
- Zero overnight positions across the whole period.
- Zero PDT violations.
- Weekly grade trend and P&L consistency, not any single week's return.
