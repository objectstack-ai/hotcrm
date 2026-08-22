---
'hotcrm': patch
---

Closing an opportunity now REQUIRES a win or loss reason, and the Sales dashboard finally shows what those reasons say.

`crm_opportunity.win_reason` / `loss_reason` / `loss_details` have existed since
the object was written, and `loss_reason` even carried the comment *"required
when stage moves to closed_\*"* — but nothing required anything. Both columns
were empty on every record, including every seeded one, and no report or
dashboard widget read them. Declared, unenforced, unused.

**Capture.** Both fields carry a `requiredWhen` predicate — `loss_reason` on
`closed_lost`, `win_reason` on `closed_won` — which the engine evaluates inside
`evaluateValidationRules` on insert AND update, and reports against the field so
the form marks the empty picklist. This is server-side: an API call, a data
import or a bulk update that closes a deal without the applicable reason is
rejected exactly like a rep's form is, and the record stays in its previous
stage. Capturing at close time is not a style choice — a closed opportunity is
frozen to its narrative fields, so a reason not recorded in the closing write can
never be added afterwards.

`win_reason` gains one option, **Quote Accepted**. An accepted quote closes its
opportunity automatically (`quote_on_accepted`), and there is no human in that
write to attribute the win; naming the automated path keeps the rule
exception-free and keeps a CPQ close distinguishable from a rep's answer, rather
than stamping a fabricated "Better Product" on it.

**Analytics.** `opportunity_metrics` gains `won_count`, `lost_count`,
`decided_count`, `won_amount`, `lost_amount` (each scoped by its own measure
filter) and `win_rate = won_count / decided_count` as a derived ratio, plus
`win_reason` / `loss_reason` dimensions. The Sales dashboard gains a **Win Rate
(12M)** tile flanked by **Deals Won** and **Deals Lost**, **Win / Loss by Rep**
and **Win / Loss by Lead Source** tables, and a **Why We Lose** loss-reason
breakdown.

The ratio's two halves come from the *measures*, never from a widget filter: a
widget-level `stage` filter narrows numerator and denominator together, which is
how a ratio quietly becomes a division by itself. Every breakdown is a table
showing won, lost and settled counts beside the percentage, so the arithmetic
behind the number is always on screen — the check the quota table shipped
without in #614. Tests perturb one deal at a time (win a lost deal, lose a won
one, add open pipeline) and assert the rate moves, moves the other way, and does
not move, respectively.

**Seeds.** Every settled seeded deal now carries its reason, and three more lost
deals were added so the loss-reason breakdown has five distinct reasons and three
lead sources carry both a win and a loss. Out of the box the demo shows a 62%
win rate over 8 won and 5 lost deals.

**i18n.** `win_reason` and `loss_reason` are now translated in all four locales;
they had been missing from `ja-JP` and `es-ES`, which would have put raw stored
values (`no_budget`, `quote_accepted`) into a picklist a rep is forced to choose
from and into a chart legend.

Fixes #593.
