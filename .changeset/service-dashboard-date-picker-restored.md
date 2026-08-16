---
'hotcrm': patch
---

The Customer Service dashboard has a date picker again, defaulting to the last
90 days of case creation.

It shipped without one from the 16.1.0 line onwards: windowing
`crm_case.created_date` — a datetime field — produced a dashboard of zeros,
because the driver compared an epoch-millisecond bound against ISO text
storage, so the lower bound matched every row and the upper bound matched none.
Both platform defects behind that are fixed and released in 17.0.0, and the
window is now measured rather than assumed — every widget is compared against a
ground truth computed in the same run, on a real SQLite database:

```
  widget                    unwindowed   last_90_days   truth
  open_cases                        43             30      30  ✓
  cases_by_origin                   51             38      38  ✓
  widgets that go blank once the window is applied: 0 of 7
```

"Daily Case Volume" deliberately keeps its own fixed 30-day window and does not
follow the picker: its title says "last 30 days", and that floor now really is
enforced. Selecting a shorter range narrows the rest of the dashboard around it.
