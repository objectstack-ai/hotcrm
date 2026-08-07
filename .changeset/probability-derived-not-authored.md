---
'hotcrm': patch
---

Stop the new-opportunity form collecting a win probability the save always
throws away.

**Probability** was an editable percent field on the opportunity form, but
`opportunity_lifecycle` sets it from the stage on every single write. A rep who
slid it to 40 % while creating a prospecting deal got a record with
`probability: 10` and `expected_revenue = amount × 10 %`, with no message
anywhere:

```
form input           → 40
GET /api/v1/data/crm_opportunity/<id> → "probability": 10
```

Measured on 17.0.0-rc.4, there is no write on which a supplied value survives —
insert, a stage move, an update that touches probability alone, an update that
touches something else entirely (the stage is then read off the stored record),
and seed/system writes all re-derive it. The field is stage-driven by design,
so the fix is to stop offering it as an input rather than to weaken the
derivation:

- `crm_opportunity.probability` is now **read-only**, with a description
  ("Set automatically from the Stage … move the stage to change it") shown as
  field help in all four locales. It stays visible on the form, next to the
  stage that decides it — the same treatment `expected_revenue` and
  `crm_account.billing_country` already get.
- Its `defaultValue: 10` is gone. It was a second copy of the hook's
  `prospecting` percentage, and on the create form it displayed "10 %" to a rep
  who had already chosen another stage. The column is filled by the save, like
  expected revenue.
- The sales-rep profile no longer grants `editable` on the field, so both the
  data contract and the permission say the same thing.

Nothing about the stage → probability mapping, the recalculation of expected
revenue, or the stored values of existing deals changes; the numbers were
already the stage's.

Docs corrected with it: **Pipeline Management**, **Opportunities** and
**Administration › Setup** each told users they could override the probability
by hand and that the override would be reset at the next stage change. Neither
half was true — there was no override, and the reset happened on the very same
save.
