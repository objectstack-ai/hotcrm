---
'hotcrm': patch
---

The duplicate banner on a lead now appears for a **confirmed** duplicate too,
not only a suspected one — and its wording no longer calls every flagged lead
"suspected".

The banner shipped gated on `duplicate_status == "suspected"`. A lead a reviewer
had already **confirmed** as a duplicate — a person's verdict, stronger evidence
than the machine's guess — showed no banner at all. The record page was not
silent about it (the **Duplicate Management** section on the Details tab renders
for any duplicate state), but the alarm was, which is the opposite of the way
the two states rank.

That gap matters more than it used to. A confirmed duplicate can no longer be
converted: **Convert** opens a refusal instead of the conversion form. So the
one state the record page stayed quiet about was also the one state that stops
the rep's next click — they pressed Convert and met a refusal with no warning on
the record behind it. The banner now shows on any lead carrying a duplicate
verdict, so the refusal is never the first the rep hears of it.

**The wording changed with it.** One banner covers two states that mean
different things, and it has one title and one body — so it now names the fact
both states share ("this lead is marked as repeating a record this app already
has") and sends the reader to **Duplicate Status** for the verdict and to
**Duplicate Management** for the record it repeats, instead of asserting a
verdict of its own. Describing a reviewer's finished finding as a machine's
suspicion was the one thing the widened banner must not do. All four locales.

A clean lead still gets nothing, on every driver. "Any verdict the record
carries" is not the same predicate as "the column exists": a lead that has never
been flagged comes back from some drivers with the column simply absent and from
others with it present and null, and only the first of those is what a bare
existence check answers "no" to. Both shapes are pinned, shape by shape, against
the real expression engine in `test/lead-duplicate-visibility.test.ts`, together
with the guard that keeps the predicate answering a verdict instead of faulting
— on this surface a predicate that cannot answer shows the banner, so an
unguarded one would warn on every clean lead in the system.
