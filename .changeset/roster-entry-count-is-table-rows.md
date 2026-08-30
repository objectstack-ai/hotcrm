---
---

Test-guard only — this PR releases nothing to HotCRM users, so the frontmatter
above is deliberately empty (the sanctioned "releases nothing" declaration that
`.github/workflows/changeset-check.yml` documents, on par with the
`skip-changeset` label). No `src/` metadata and no `content/docs/` prose
changed: the whole diff is `test/docs-view-rosters.test.ts`.

Two leftovers from #1326 / PR #1347, in the one file that carries both.

**`entryCount()` counted a prose bullet as a roster entry.** The structural rule
holds each translated face to the same number of roster entries as its English
page, and `entryCount` counted bolded top-level bullets alongside table rows. No
such bullet is a roster entry: `sales/accounts` explains that Health Score is
hand-maintained, `sales/opportunities` lists the three filters behind *Closing
This Quarter*, `sales/quotes` opens two whole-sentence bolds, and
`service/cases` names its six retired non-views — the same bullets this file's
own docstring already records as false positives for the widest phantom rule.

So the rule was holding the three faces to WORDING while claiming to hold them
to STRUCTURE, and it was green only because all three faces happen to word those
sentences in parallel. Reverse-verified rather than asserted: rewording the
`accounts.mdx` English bullet so it no longer opens with a bold turns the rule
red on `main` today —

    content/docs/sales/accounts.zh-Hans.mdx: 7 roster entr(y|ies), but
    content/docs/sales/accounts.mdx has 6

— blaming roster drift for a prose edit, on a page whose roster did not move.
That is the failure mode worth removing: a guard that goes red for a reason it
does not name sends the next person hunting a roster problem that does not
exist. Under this change the same mutation leaves the suite green, 5/5.

**Route taken: count table body rows only**, reusing the `tableBodyRows` the
name-column rule already defines, so both rules now share one notion of a roster
row. The other route on offer — bound the count to the text above the first
`###` — was measured and is not enough: `sales/quotes` and `service/cases` carry
their prose bullets with **no `###`** between the table and them, so six of the
twelve faces would keep the defect, including the `service/cases` bullets this
file calls "the page that was RIGHT".

The hazard route 2 is warned about is real but does not land here. No roster
section in the repo is written as a bullet list — all thirty carry exactly one
table, and the two candidate row definitions agree on all thirty.
`service/knowledge-base` genuinely is a bullet-list roster (four bullets naming
the four views `crm_knowledge_article` ships), and it sits outside this rule for
an unrelated reason: it heads that section *Finding articles*, so `rosterOf`
returns null and it never entered the rule before this change either. Should a
mapped page ever switch to that shape, vacuity guard #1 fails when an English
page grows an unmapped roster section, and vacuity guard #3 fails when a mapped
page yields no name cells — saying in as many words to teach `tableBodyRows`
that shape. The shape is caught loudly, not tolerated silently.

**The `:48` tolerance list still presented the #1318 defect as a shape to step
over.** It listed "TAB labels in the first column where the view name is in a
later one" among the bolds a roster section legitimately carries. It is not one:
it was the #1318 defect on the single page cited as carrying it, #1322 took that
invented column off fifteen pages across three faces, and PR #1347's name-column
rule now rejects the shape outright. #1347 recorded that in a qualifying section
beneath the list rather than in it, because its card allowed additions only — so
the file has been saying two different things about one shape, and a reader who
stopped at the original list was still being told to accommodate the defect.

The entry is reworded in place and the #1347 addendum folded into it. The list
itself is untouched otherwise — its other three classes are real, and all three
were re-measured as still present on the pages. The entry is kept rather than
deleted because the "thirteen false positives" figure was counted with it in, so
that figure includes cases the widest rule was right about; the case against the
widest rule rests on the three classes that remain.
