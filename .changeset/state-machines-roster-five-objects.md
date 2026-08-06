---
'hotcrm': patch
---

The State Machines admin page now lists all five objects that have one, and says
what a state machine actually does when you leave the declared route.

`content/docs/administration/state-machines` opened with a roster of two —
Leads and Opportunities — and then named case, contract, campaign and quote as
objects that "have status fields but use simpler status handling rather than
full state machines". Three of those four were wrong. `crm_case`,
`crm_contract` and `crm_quote` each carry a named `state_machine` validation
rule with a complete transition table (`case_status_progression`,
`contract_status_progression`, `quote_status_progression` — added by #575 B4);
the roster simply never moved when they landed. An admin read the page as
licence to change those three lifecycles without maintaining a transition map.
Campaign was the one the sentence got right.

All three pages now list five objects with their real routes, and state the
mechanism once: every machine is a named `state_machine` validation rule on the
object, over its lifecycle field — cases, contracts and quotes use the *same*
mechanism as leads and opportunities, not a lighter one.

**Measured before writing, and it changed the wording.** All five rules are
declared at `severity: 'warning'`, and the engine only throws on `error` — so
an illegal transition is written to the server log and **the save still goes
through**. Driven end to end on a real ObjectQL over the in-memory driver, one
object at a time:

| rule | illegal move probed | engine verdict | stored value after |
| --- | --- | --- | --- |
| `lead_status_progression` | Qualified → Contacted | logged, not blocked | `contacted` |
| `opportunity_stage_progression` | Prospecting → Negotiation | logged, not blocked | `negotiation` |
| `case_status_progression` | Resolved → Waiting on Customer | logged, not blocked | `waiting_customer` |
| `contract_status_progression` | Draft → Activated | logged, not blocked | `activated` |
| `quote_status_progression` | Draft → Accepted | logged, not blocked | `accepted` |

The page therefore says the route is **advice, not a gate** — the same reading
the contracts page already landed for `contract_status_progression` — rather
than the issue's "the validation rule stops you". It also records that no
machine declares `initialStates`, so a record *created* directly in a late
state is never checked: the rules compare a new value against a previous one
and only run on update.

`test/status-state-machines.test.ts` gains the missing direction. It already
derived which objects must be governed from the compiled stack; it now also
reads the bullet roster off all three pages and fails when a governed object is
absent from it, or when an object whose status is deliberately descriptive
(campaign, task) appears in it. The roster is checked, not the prose around it,
so the paragraph that explains *why* campaigns have no machine is free to name
them. A sixth state machine now turns the page red instead of joining the three
that were missing.

Documentation and one test only; nothing under `src/` changed.

Fixes #896.
