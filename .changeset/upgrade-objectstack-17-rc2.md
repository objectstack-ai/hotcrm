---
'hotcrm': minor
---

Upgrade HotCRM to ObjectStack 17.0.0-rc.2, and migrate the six places where the
rc.1 → rc.2 window changed what the platform does with metadata this app already
had. Four of them were live defects, not tidy-ups — each is verified against a
booted server and a real browser session, not only against the unit harness.

**`demo_bootstrap` could no longer find its user.** The sweep opened with
`get_record(sys_user)` and an empty filter, which `findOne` used to answer with
an arbitrary row. 17.0.0-rc.2 refuses a `findOne` that names no record (#4419),
so the flow failed on its second node and every seeded record stayed ownerless —
"My Leads", "My Deals" and "My Cases" empty for everyone, and every owner-addressed
`notify` reaching nobody. The read is now an explicit `find` whose first row is
bound by an `assignment` node, which states the arbitrary pick instead of
smuggling it through a call that claimed to name one. FROM `filter: {}` TO
`limit: 2` + `firstUser = {userList.0}`, with `has(vars.firstUser)` guards on the
branch so a zero-user org still completes.

**`lead_conversion` could no longer convert a lead.** rc.2 holds a screen resume
to the screen's declared field contract (#4477), and `createOpportunity` — a
checkbox with `defaultValue: false` — was marked `required`. A runner that posts
only what the user touched left it out, and the resume was refused outright with
`INVALID_SCREEN_INPUT`. A checkbox has no unanswered state, so the flag is gone;
the default and the `init_defaults` assignment supply the answer, as they always
actually did.

**Nine `decision` nodes carried an inert copy of their branch predicate.** rc.2
flags it (`flow-inert-node-condition`, #4414): the engine reads the out-edges, so
a second copy on the node restates the gate without being the gate, and a copy
that drifts is a lie about what the flow does. The copies are deleted and the
totality rationale moved to the edges that decide. Behaviour is unchanged — the
edges always were the live sites.

**`translation.validationMessages` is removed** from all four locale bundles.
rc.2 retires the key (#4667); the three messages under it matched no rule in this
app and had never been read.

Two pinned "platform gap" assertions flip because the platform closed the gap,
which is what they were written to detect: a filtered measure that selects nothing
now reports `0` rather than nothing at all, so a lead source that only ever lost
reads **0%** instead of blank (#4708); and a bare-string condition inside a `loop`
body is now CEL-parsed like its envelope twin (#4336). The explicit envelopes stay
— they say which dialect a predicate is in, and they keep these flows correct on a
runtime that still carries the old path.

Finally, validation predicates now fail **closed** (#4649) — the upstream question
`test/object-validation-predicates.test.ts` filed, answered. An unevaluable
predicate used to be skipped silently; it now rejects the write. HotCRM's
predicates are already total, so nothing changes at runtime, but the house rule in
AGENTS.md and that file now describe the outcome an author actually gets.
