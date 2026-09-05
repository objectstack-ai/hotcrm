---
'hotcrm': patch
---

Correct `AGENTS.md` item 3 of §🔒 Schema Validation Requirements: flows are authored as
typed object literals, not with a `FlowSchema.parse()` call.

The line told authors to build flows with `FlowSchema.parse()` from
`@objectstack/spec/automation`, noting that `defineFlow()` is that call. Both halves of
that are true about the *platform* and wrong about *this repo*, which is the combination
that makes it costly: an agent reading it writes a call with no in-repo precedent to
pattern-match against, then either invents an import or silently diverges from every
existing flow file.

Measured on the installed tarball rather than the docs, because the card's three
possibilities (real-but-unused / renamed / invented) needed distinguishing.
`@objectstack/spec` 17.2.0 exports both, as functions:
`FlowSchema` (with `.parse`) and `defineFlow`, where
`function defineFlow(config) { return FlowSchema.parse(config); }`. So the API is real and
the parenthetical was accurate — "invented prose, delete it" was the wrong fix.

What the repo does instead: every `src/flows/*.flow.ts` file takes a **type-only** import
(`import type * as Automation from '@objectstack/spec/automation'`) and annotates a plain
object literal. That is a first-class form, not a lag: the spec publishes `Flow` as
`z.input<typeof FlowSchema>` precisely so a literal can be annotated with it, and
`defineFlow()` returns `FlowParsed` (`z.infer`, the output type), so the two are not
interchangeable drop-ins. `AGENTS.md` already described this form correctly one section
earlier, in the File Suffix Protocol — the two sections disagreed with each other.

Nothing in `src/` is left unvalidated by the wording change, which was confirmed by
ablation rather than assumed: with a flow's `type` mutated to a bogus value on disk,
`pnpm validate` exits 1 with
`✗ flows.17.type: Invalid value 'os_probe_bogus_type'. Expected one of: autolaunched,
record_change, schedule, screen, api.` — and passes on the restored tree. Validation is
real; it just happens at `objectstack validate` and again when the platform parses at
`AutomationEngine.registerFlow` on boot, not in the metadata file.

Item 3 only. The same list's other six items have a related but distinct problem, filed
separately — a seven-item rewrite of a governed instruction surface is its own change.
