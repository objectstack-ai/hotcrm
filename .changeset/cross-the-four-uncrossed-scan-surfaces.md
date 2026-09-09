---
---

Test-farm hardening only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents in its own comment, on par with the
`skip-changeset` label; #1778 used exactly this form for the same kind of work). No
object, dataset, widget, layout, filter, translation or exported symbol changed: the
whole diff is five files under `test/`.

Four guards walked a root and filtered by suffix while a **second** mechanism in the same
file named a specific carrier by **literal path**, with nothing tying the two together. A
walk that stops reaching that carrier leaves both readings healthy — the count is made up
of the hundred other files, and the literal read still opens the file — so the rule goes
on reporting clean over a real, non-empty tree that no longer holds what it judges. #1778
crossed exactly this pair for `PACK_FILES`; these four were left uncrossed, and #1834
measured and reported them rather than repairing them.

Each repair is one assertion placed inside an **existing** self-test block. No new `it`,
no new gate, no new file, no widened surface: the suite stays at 3455 tests.

- `docs-object-term-consistency` — `TEST_FILES` must contain the ROW_LABEL ledger that
  the two blocks below it read by literal path. The literal is now single-sourced, so
  the cross and those reads cannot come to name different files.
- `hook-query-predicate` — the surface must still hold a `where:` predicate, which is the
  class the rule discriminates within. The `toContain('_line-item-price-fill.ts')` beside
  it pins a **filename**, and a filename is not a content pin when nothing pins that
  file's content: measured, the old assertion passes with every hook body relocated out
  of the surface and a shim left at that path.
- `collaboration-capabilities` — the `feeds: true` sweep asserted nothing whatever about
  its surface. The class here is *any* `.object.ts`, so a count **is** the content proof.
- `docs-drift` and `docs-conversion-rate-spelling` — the carrier lists proved by
  `existsSync` / `readFileSync` must also be **reached by the walk**. Their content is
  already pinned by the neighbouring block, which is what makes a path in the walk's
  output a content pin here rather than a name.

Every one of the five was proved blind before it was repaired, on three legs against the
same mutation at the same commit: the defect detected by the shipped guard, missed by the
old assertion once the surface was mutated, and caught by the new one.
