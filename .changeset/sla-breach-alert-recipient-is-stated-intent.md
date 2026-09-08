---
---

Docs and comments only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). No metadata value moved: the one `src/` file it
touches, `src/flows/case-sla-monitor.flow.ts`, changes comments only — no node,
edge, condition, recipient, template or schedule.

**The SLA breach alert's recipient is now stated intent, not an accident.** On a
breached case that already has an owner, `case_sla_monitor` escalates it,
`case_escalation_reassign` hands it to the least-loaded service manager in that
same write, and the alert still reaches the agent the case was taken *from* —
because the recipient is read before the hand-off. That is the same etiquette
`case_escalation` has always declared on the SLA & escalation page, and the page
now says so for the sweep too, in all three locales. The `notify_team` node
carries the ruling beside the code so the next reader does not "fix" it, and
`test/flow-sla-ownerless-assignment.test.ts` pins the pair — the hand-off happens
*and* the pre-hand-off owner is the one alerted — together with the ruling's
declared gap, measured: the hand-off issues no notice of its own, so the
receiving manager is told nothing by the sweep.

**The service pages now point at the cause of an ownerless case.** Both places
where `service/cases` describes a case arriving with no owner, and step 1 of the
`service/index` walk-through, carry one clause and a link to Setup's *Case
routing* section. The mechanism itself is stated once, in the Setup checklist,
and is deliberately not repeated on the service pages.
