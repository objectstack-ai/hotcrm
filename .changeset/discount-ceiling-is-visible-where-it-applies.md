---
'hotcrm': patch
---

Tell a rep the discount ceiling at the box they type it into, instead of only
after the quote is refused.

*Generate Quote* asks for a **Discount %** and accepts anything the percent
field's arithmetic domain allows, but a quote over **60%** is refused outright:
`discount_within_ceiling` is a hard block with no approval path, on the quote
and on each line item. The screen said nothing about it, so the only way to
learn the number was to enter one, submit, and read the rejection. That field
now reads **`Discount % (≤ 60)`**, with `0-60` in the box as a placeholder while
it is empty, so the rule is legible before the first attempt rather than after
the first failure.

Both strings interpolate `QUOTE_DISCOUNT_CEILING` — the same constant the two
validation rules interpolate, imported rather than retyped — so the hint cannot
drift from the rule it describes. Raising or lowering the ceiling stays a
one-line edit in `src/objects/_thresholds.ts`, and the screen now follows it.

**The ceiling itself is unchanged**, and so is the fact that it blocks: this is
the rule becoming visible, not the rule becoming softer. Anything above 60 is
still refused at write time by the same validation, whether it arrives from this
screen, the quote form, or the API.

One thing the card asked for could not ship. A **client-side `max`** on the
input is not authorable at 17.3.0: a screen field's shape is closed to
`name` / `label` / `type` / `required` / `options` / `defaultValue` /
`placeholder` / `visibleWhen`, and `max` is rejected by name rather than
ignored, so it fails validation instead of quietly doing nothing. `helpText` is
closed the same way. The browser therefore still lets a rep type 70; the
difference is that the field now told them it would not be accepted. The comment
beside the field records the measurement so the next author does not re-chase it.
