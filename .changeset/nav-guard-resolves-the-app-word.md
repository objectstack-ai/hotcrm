---
---

Guard-only — this PR releases nothing to HotCRM users, so the frontmatter above
is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata changed, no gate script is touched,
and no page under `content/docs/` is reworded. Precedent measured over the last
120 commits on `main`: of the PRs whose diff is confined to `test/` plus its
changeset, 15 declare empty frontmatter and 6 declare `'hotcrm': patch`; the
closest sibling of all — the previous change to this same guard — is empty.

`test/docs-setup-navigation-names.test.ts` resolved the LEAF of every bold
`**App → Entry**` citation live and took the APP word on trust: `APP_WORDS` was
a hand-written map of four spellings, so `设置 → 用户` was proved by proving the
platform ships a navigation label 用户, while 设置 itself was checked against
nothing. The Setup app's shipped zh-CN label is 系统设置. Rule 3, added for this
app's own sidebar, already generates its group half from the shipped labels —
this closes the same gap on rule 2.

The map is now generated from the app shells plus every shipped locale bundle
(`Setup` / `系统设置` / `セットアップ` / `Configuración`, and `Studio` in all
four). Generating it alone would have made the 19 设置 citations invisible —
fewer findings, no red, nothing to notice — so `KNOWN_UNRESOLVED_APP_WORDS`
quarantines the word instead: those citations are still extracted and their
leaves still resolved live, and the ledger is checked in both directions, like
every other ledger in the file. ⛔ Whether 设置 is acceptable prose for an app
labelled 系统设置 is a docs-register question and is deliberately NOT answered
here; no citation was rewritten.

A generated alternation cannot see a word it does not ship, so a swapped app
word would stop matching rather than fail. `appWordDrift()` is the counterweight
and the half that goes red: it reads every bold run and reports one whose LEAF
is a live navigation label sitting behind a first segment that names nothing the
product ships. It is anchored on the leaf, so `**Status → Held**` and
`**Queued → Sent**` stay invisible and this file's ban on widening rule 2 to
every bold arrow stands.

⚠️ A legitimately mixed register stays green, and that is a pass criterion, not
a footnote: `automation.zh-Hans.mdx` names Studio paths in English and the
console's zh-CN group labels in the same list, and three more pages open some
paths with 设置 and others with `Setup` / `Studio`. Both halves are correct
because Studio is labelled `Studio` in every shipped locale, so nothing here
compares the locale of one half against the other, and a test pins those four
pages with an anti-vacuity check that the mixing is still present.

Its first run found one thing no rule in this file could see before:
`guides/email-and-calendar.mdx` sketches "reusable templates saved in
**Settings → Email Templates**" under a heading that says the feature is not
shipped. There is no Settings app. It is quarantined with its reason rather than
reworded — pointing the sketch at the real Studio page would make it claim a
screen that does not do what the sentence promises — and filed as #1730.
