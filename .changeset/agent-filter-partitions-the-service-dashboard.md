---
"hotcrm": patch
---

Pin that the Customer Service dashboard's **Agent** filter really filters.

The control was proved to work by a browser measurement, but nothing in the
repository asserted it. Had a dataset change or a platform bump made it inert,
every widget would have gone on rendering plausible numbers with no error —
the same failure class that once shipped an all-zero dashboard, found by eye
rather than by CI.

A new suite executes the shipped Service dashboard against a real SQLite
database over cases staged across two agents, and asserts that the two
per-agent shards **partition** the unfiltered totals — on a metric tile, on a
grouped chart, and across every filter-bound widget the dashboard declares,
with and without the date picker applied. The expected figures are computed
from the fixture in the same run rather than written down, so the suite pins
the behaviour without freezing one database's numbers.
