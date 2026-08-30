---
---

Docs only — this PR releases nothing to HotCRM users, so the frontmatter above is
deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed: no object, field, view,
label, page or hook. The two most recent docs-only changes on `main`
(`integrations-page-names-the-mcp-surface`, `residual-tab-names-name-the-view`)
declared themselves the same way.

`service/cases` inverted the repo's bold/italic typography convention in both
directions, in all three locales. The convention reserves **bold** for names the
app really has and *italics* for a name a reader arrives with that the product
does not carry, and a phantom must still be named — say where the thing really
lives, never delete it silently. A reader using the typography to tell one from
the other was told the opposite of the truth about both names on this page:

- **`Breached SLA` is a phantom** — zero occurrences anywhere in `src/`,
  measured against `SLA Violations`, `Critical Cases` and `Escalated Cases` as
  positive controls so the zero is a reading rather than a broken grep. It was
  bolded at both of its sites, and the second one bolded it inside a sentence
  that says in so many words that it does not exist. It is now italicised at
  both, still named, and the reader is pointed at what does count breaches: the
  **SLA Violations** tile for the number, the **Escalated Cases** view for a list
  that can be worked through.
- **`Critical Cases` is real** — the title of a widget on `service_dashboard`
  (`src/dashboards/service.dashboard.ts`), carried in the locale pack as
  `critical_cases`. It was correctly bolded at the head of the sentence and then
  italicised a few words later in the same sentence, as though the page had
  changed its mind. Both occurrences now read as bold.

The first bullet was also rewritten rather than re-marked. Its opening sentence
claimed both names were metric tiles, which is false of `Breached SLA`, and
swapping the markers alone would have left a sentence that was typographically
correct and self-contradictory — italicising a name while asserting the product
carries it. It now makes one statement per name.

The guard question this page raises — the bold/italic rules run over one block of
the analytics landing page and one block of the quick tour, and read no service
page at all — is deliberately not answered here; it is tracked separately.
