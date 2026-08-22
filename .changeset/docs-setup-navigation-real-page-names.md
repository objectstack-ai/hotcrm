---
'hotcrm': patch
---

Point the automation docs at the console pages that actually exist, and gate the
page names so the next wrong one cannot land.

Six pages across three locales sent readers to **Setup → Process Monitor** and
**Setup → Scheduled Jobs** to watch automation run. Neither page exists, and
neither name exists: a literal search of the installed `@objectstack/*` tree
returns zero hits for `Process Monitor`, and the only `Scheduled Jobs` in it is
prose inside a schema description, not a navigation label. The sentence
"the name you see in Setup → Process Monitor" is a factual claim about the
product's UI, and it was false in every locale.

Flow runs are real; they are somewhere else. What changed for readers:

- Automation runs are read at **Studio → Developer → Flow Runs** — pick a flow,
  then read its recent runs and each run's status. The pages say that now,
  instead of promising a 24-hour cross-flow feed the page does not offer.
- The built-in flow table is introduced as the roster shown in **Studio →
  Automation → Flows**, which is where those labels really come from.
- Scheduled automation no longer points at a "Scheduled Jobs → History" page.
  Scheduled flows are flows, so their runs are in the same Flow Runs list — the
  same thing the page's own *Scheduled automation* section already said.
- The zh-Hans pages gloss the path with the zh-CN labels the console really
  shows (开发者 → 流程运行记录). The zh-Hant pages do not, and say why: the
  platform ships en / zh-CN / ja-JP / es-ES and no Traditional-Chinese pack, so
  those entries appear in English.

This finding was still growing when it was fixed — a billing hand-off page added
a fresh reference months after it was first reported, through a review that
checked the flows and the three-locale docs but never asked whether the Setup
page names inside them existed. `test/docs-setup-navigation-names.test.ts` now
resolves cited navigation names live against the Setup and Studio navigation
that `@objectstack/platform-objects` ships, in every shipped locale, and fails
at PR time on a name that resolves to nothing — including bare prose with no
`Setup → …` path, which is the shape that regression took.
