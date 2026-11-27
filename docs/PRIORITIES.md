# HotCRM priorities — areas, grades and first touch

> Maintainer rulings, verbatim (2026-11-18): 「hotcrm 是典型的元数据项目，需要通盘考虑元数据项目的需求」 ·
> 「分诊原则可以简化」 · 「hotcrm 早期是样板，实际已经是产品。」
> Rollout epic: #2656. Same method as the platform's North Star (objectstack `docs/NORTH-STAR.md`, *Product areas*).

**HotCRM is a product.** A card is judged by what it does for the people who use the six apps, not by which platform
capability it shows. Platform gaps are still fixed in objectstack, never worked around here (`AGENTS.md`, Scope).

## Areas — exactly one `area:*` per card

An area is split by what the user feels, not by which package the code is in. The six apps are not areas: the
packages under `src/` already draw those borders, and translation or docs cards cut across all of them. A business
chain that needs its own order (Order to Cash, Project Delivery) is a sub-epic: a `pm:epic` card the maintainer opens.

| Area | What it covers | Core features (what "core" means when grading) |
|:--|:--|:--|
| `area:business` Business | objects, fields, flows, approvals, permissions and sharing, business data | ① the main chain runs end to end: lead → opportunity → quote → order → contract or project → invoice and payment ② cases with SLA and escalation ③ expenses and their approval ④ who can see and change what is right |
| `area:ux` Experience | how pages, lists, forms, reports and dashboards look and behave; translation; mobile; printing | ① the main chain's pages work in all four UI languages and on a phone ② every action gives feedback ③ a Chinese UI shows no stray English |
| `area:ai` AI and asking for data | skills, dataset synonyms and descriptions, AI-callable actions | ① a question in business words finds the governed metric for the main chain ② the AI acts on the main chain within the user's own permissions |
| `area:release` Release and docs | marketplace listing, install and upgrade, release notes, demo data, the docs site, repository upkeep, Tasks a user never sees | ① installed from the marketplace, it works ② the demo data runs ③ an upgrade loses no data ④ release notes and docs say what is true |

Boundaries: cannot be done or gives a wrong result ⇒ the area of that feature; can be done but looks wrong, is hard
to use, cannot be understood or gives no feedback ⇒ `area:ux`; translation and mobile always ⇒ `area:ux`.

## First touch — one comment, five answers

```text
Triage: repo <repo> · req REQ-NNNN · area:<area> · <type> · p<grade>; why: <one sentence>
```

`req` only for a Feature. No `reach:` line, no `Path:` line, no `domain:*` label in this repository.

1. **Which repository.** A defect: where does the broken code live? A new capability: could someone who has only
   the metadata, and knows nothing about this company, write it? Platform ⇒ the card is filed in objectstack; this
   card waits with `pm:blocked` and a `Blocked-by:` line and keeps its grade. The platform card names
   `blocks hotcrm#N` and is graded by objectstack's rules (blocking a hotcrm p1 makes it p1).
2. **Should the standard product do it.** A Feature cites a requirement record with disposition B
   (`docs/requirements/`); without one it goes to `needs-user-decision`. A Bug needs none.
3. **Which area** — the table above.
4. **Which type.** Bug = something shipped is broken (a wrong sentence in shipped docs or release notes too);
   Feature = a new capability or an extension; Task = follow-up, clean-up, a docs rewrite, a tightened test.
   Every open card carries one, set through the relay's `issue_patch` `type`. When unsure (maintainer,
   2026-11-19 02:52Z 「同意」, the same five as objectstack):
   - **Experience problem**: a Bug when the fix needs no new interface or capability; otherwise file a separate
     Feature (a platform capability goes to objectstack, rule 1).
   - **Epics take no type**: `pm:epic` and tracking cards, like record and anchor cards; a type goes only on a card
     that is real work.
   - **Operations and verification** (a staging reading, a one-off data backfill, a maintainer-action card) = Task.
   - **Slow**: a shipped feature slow enough to get in the way = Bug; a refactor or tech-debt clean-up = Task.
   - **A bug found during development** is typed on its own card, never by its epic. Unmerged code of the feature
     being built: no card, fix it in that card's PR. Merged but unreleased: a Bug under that epic, graded by the
     table (usually p2/p3; raised if it blocks a release). Another shipped feature: an ordinary Bug in that
     feature's area; under this epic with a `Blocked-by:` line only when it blocks the epic.
5. **Which grade.**
   - **p1** — a core feature is broken or data is wrong, and people who use it daily hit it; install, upgrade or
     the marketplace listing is broken; an experience problem on a core path that everyone hits every time; it
     blocks another repository's p1.
   - **p2** — every other Bug and experience problem; every Feature. Inside p2: the sub-epic's own order first,
     then Bugs before Features, then the oldest card.
   - **p3** — Tasks; a Bug only a rare configuration or a developer reaches. An experience problem is never p3.

Unchanged: p0 is only a red `main` or a release blocker. Security goes only to private advisories, never a public
card. A card in flight (assignee or open PR) is raised, never lowered. A card waiting on the platform resumes when
the fix is **released into this repository's pin**, not when it merges upstream; after every `@objectstack/*` bump,
the waiting cards are swept.

## Which document at which stage

| Stage | Write | Where | When |
|:--|:--|:--|:--|
| Requirement | the customer's words, the A/B/C/D disposition and why, the revisit trigger for D | `docs/requirements/NNNN-*.md` | every new Feature |
| Design | objects and relations, flows and approvals, permissions, translations, datasets for asking, demo data, doc pages, the effect on installed customers' data, and that the community edition still runs; record pages and forms follow `AGENTS.md`, *Record pages and forms are consistent* | `docs/architecture/<module>-plan.md` | spans two packages or adds an object; otherwise the card body. Frozen at ship — the feature list is the truth after |
| Feature | one row: id, one sentence, source file, area, core or not | `docs/feature-inventory.md` | every new feature point |
| Card | which metadata changes, an acceptance sentence ("a user can …") citing the feature id, `Blocked-by:` | the GitHub issue | every card |
| Build | comments say why, not what; all four UI languages; one changeset written for customers | `src/<package>/`, `.changeset/` | every PR |
| Acceptance | business-fact tests through `@objectstack/verify`; in the PR body, which chain was walked, in which language, and whether on a phone | `test/`, `e2e/`, the PR | every PR that changes behaviour |
| User docs | the manual and the in-product notes | `content/docs/` (three locales), `src/docs/` | in the same PR as the change users can see |
| Release | release notes come from the changesets, never hand-written; marketplace listing text | `CHANGELOG.md`, `objectstack.manifest.json` | every release; no `v*` tag while unconsumed changesets remain (`release.yml` refuses the tag otherwise) |
| Upgrade | from what to what, the platform version required, what the customer does (data backfill steps included) | the changeset's breaking-change section | every breaking change |
