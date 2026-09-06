---
'hotcrm': patch
---

Split the lead detail page's duplicate banner into **one `record:alert` per
verdict**, so each one states the next step its verdict actually has.

### One banner could not state either next step

#1207 gated a single banner on `duplicate_status == "suspected"`; #1289 widened
it to every verdict the field carries. Widening was right, but a `record:alert`
carries one `visible` and one title/body pair, and `pickLocalized` picks by
LANGUAGE, not by row — so one component covering both verdicts had to choose
copy that named **neither**, or it would have mislabelled every lead in the
other state.

Since #1288 the two verdicts have opposite next steps:

| verdict | at conversion | what the rep should do |
|:--|:--|:--|
| `suspected` | warns, conversion **proceeds** | compare against the linked record, then convert or disqualify |
| `confirmed` | **refused** (`refuse_confirmed_duplicate`) | cannot convert — disqualify, naming the survivor |

So the neutral banner announced that something was wrong without saying what to
do, and the rep had to scroll to the Duplicate Status chip to find out which
situation they were in. The `confirmed` case was worse than that: nothing on the
record said the Convert button would refuse them, so they learned it by pressing
it.

### What ships

Two components, two predicates, two next steps, in all four locales. The
`confirmed` banner is the only place a rep is warned about the refusal before
they press Convert, and it ships at `error` severity — which the renderer maps
to `role="alert"` / `aria-live="assertive"` rather than the polite `role=
"status"` every other level gets. `suspected` stays `warning`, because
conversion still goes through.

A lead carrying a value neither option declares now raises **no** banner, where
the widened predicate raised the neutral one. That matches what the conversion
flow already does with such a row — its `e22` Clean edge converts it — so the
page and the flow now agree about the same lead.

⛔ Nothing here changes what the app refuses. That was ruled by #1288 and
shipped by PR #1555; this card changes only what the record page tells the rep.
