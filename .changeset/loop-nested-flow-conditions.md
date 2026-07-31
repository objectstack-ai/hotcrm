---
'hotcrm': patch
---

Fix `contract_renewal`'s notice-window gate, which throws instead of
evaluating, and rewrite the two tests that #565 left red on main.

**The live regression.** #565 correctly wrapped flow conditions as CEL
envelopes so they finally evaluate. That exposed a second defect underneath, in
`contract_renewal`:

```
timestamp(currentContract.end_date) <= daysFromNow(int(currentContract.renewal_notice_days))
```

`end_date` is a DATE field and arrives as `YYYY-MM-DD`, but CEL's `timestamp()`
accepts only a full ISO 8601 datetime — it throws `timestamp() requires a
string in ISO 8601 format`. While the condition was a bare string it was never
evaluated at all, so this sat latent; making the envelope real makes it throw
mid-sweep. The sweep therefore still books nothing, having traded a silent
no-op for an exception. Appending `T00:00:00Z` fixes it. Verified load-bearing:
reverting just that change fails four `contract_renewal` tests.

**The two red tests on main**, both introduced by #563 and both firing exactly
as designed when #565 fixed the behaviour they pinned:

- `flow-scheduled.test.ts` asserted the stagnation gate stays shut and failed
  with the message written for this moment — "gate now opens — rewrite this
  test". Rewritten to assert real behaviour: the nudge task and notification
  are created, repeated sweeps stay idempotent, and the sweep re-arms once the
  previous stall task completes. `contract_renewal` gets the same treatment
  (task, notification, `auto_renewal` opportunity, per-contract notice window,
  no duplicate renewal deal).
- `flow-record-change.test.ts` asserted `typeof startCondition === 'string'`
  for `opportunity_approval`. #565 converted it to an envelope. That assertion
  was pinning the *notation* rather than what matters, so it now accepts either
  form and checks a non-empty expression exists.

**Guards added** so the class stays fixed: one pins the engine asymmetry that
makes envelopes necessary (a bare string still evaluates `false` where an
envelope evaluates `true`), and one walks every registered flow — including
nested loops — failing if any loop body reintroduces a bare string condition.
It also asserts the walk found something, so it cannot pass vacuously.

`campaign_enrollment` gains a runtime suite (eligibility, opt-out, cross-campaign
dedupe, closed-campaign refusal) and leaves `PENDING_FLOWS`, which is now down
to `case_csat_followup` and `demo_bootstrap`.
