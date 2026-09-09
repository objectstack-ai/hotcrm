---
---

Label taxonomy only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label). The diff is one file, `.github/labels.yml`; no
object, dataset, widget, layout, filter or exported symbol changed.

hotcrm adopts the fleet's `priority:p0..p3` priority axis and retires its local
`prio:*` spelling of the same axis, per the ruling on #1792 (decision batch #97,
confirmed by the maintainer). `prio:p0`/`prio:p1`/`prio:p2` are removed from the
manifest **and deleted as label objects** — the one deliberate exception to the
manifest's standing `skip-delete: true` — after all 172 carrying cards (open and
closed) were relabelled and read back.

The card that produced this ruling asked whether `priority:p0` was a third
concept: its description read as a dispatch queue-jump control rather than a
release-priority tier, and `priority:p1`/`priority:p2` did not exist, so the axis
had exactly one tier. The ruling read it the other way — the queue-jump wording
IS the fleet's p0 as the dispatch loop means it — so the concept and the spelling
become one vocabulary that the PM card-ordering already reads.

⚠️ One ruled detail could not be executed as written, and the manifest records
why at the entry. #1792 ruled `priority:p0`'s description verbatim as the fleet
wording with the queue-jump sentence appended. That string is 133 characters and
GitHub caps a label description at 100, so the API rejects it (422, "description
is too long") and `label-sync` would fail on it. The entry declares the ruling's
main clause — the fleet description, verbatim — and carries the full ruled string
unabridged in a comment above it. Which storable form is wanted is back with the
seat on #1792; no wording was invented here.
