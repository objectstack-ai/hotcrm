---
---

Metadata-internal — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). It edits `src/` metadata, which usually does ship, so
the claim is measured rather than asserted: the flow's behaviour is byte-for-byte
unchanged, and the identifier that changed is referenced nowhere outside the file
that declares it.

`src/flows/lead-conversion.flow.ts` used the edge id `e20` **twice** — once on
`get_lead → decision_duplicate` and once on the terminal
`send_notification → end`. Nothing at runtime could confuse the two: flow
traversal selects out-edges by `source` and never by `id`, so the duplicate was
inert. It was still wrong on the file's own terms. The comment governing that
edge list states that retired ids are left vacant so **every surviving edge keeps
the id it has always had** — a convention that only means something if the ids
are unique — and anything keyed on edge ids rather than on `source` (a BPMN
export, a flow designer, a flow diff) would have silently dropped one of the two.

It was also a live trap for the next editor. Picking a "free" id out of a
sequence that already contains a collision is how a second collision gets made,
and this file had an edge added to it as recently as `e25`.

**Which of the two moved, and why.** The convention decides it, not file order:
the terminal `send_notification → end` edge has carried `e20` since the original
graph, while the `get_lead → decision_duplicate` edge acquired it later, when the
head of the graph was reordered — its sibling edges from that same change are
numbered `e21`–`e24`, which is only consistent with `e20` having been taken at
the time. So the terminal edge keeps the id it has always had, and the newer edge
takes a fresh `e27`, the next id above the highest in use. `e1` and `e3` remain
vacant, as retired ids do.

The graph is unchanged: every edge's `{source, target, condition, label, type}`
tuple is identical before and after, across all 28 edges. A sweep of all 22
`src/flows/*.flow.ts` files (26 flows, 168 edges), reading edge ids as runtime
values rather than by their source spelling, finds no other duplicate in any
flow.
