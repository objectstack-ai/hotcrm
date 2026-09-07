---
'hotcrm': patch
---

Call `loss_details` by its declared label on the two pages `#1721` left out —
`sales/pipeline-management` and `ai-copilot/knowledge-bases`, in all three locales.

`loss_details` is `Field.textarea({ label: 'Loss/Win Details' })` on `crm_opportunity`
and both language packs agree: `src/translations/en/objects.pipeline.ts` carries the
same English label, `src/translations/zh-CN/objects.pipeline.ts` carries 「赢/丢单详情」.
Six doc faces still wrote the coined short form — **Loss Details** / 「丢单详情」 /
「丟單詳情」 — which drops the win half of a field that holds the context behind
*either* outcome. `#1721` corrected exactly this wording on `sales/opportunities`;
its scope was that one page, so these six are the same defect on the pages it excluded.

The correction is not only the noun. On *Tips for sales managers*,
`sales/pipeline-management` told managers to coach reps to fill the field in "on every
closed-lost deal" — a sentence that stays wrong after a pure rename, because it still
describes a loss-only box. The app says otherwise in three places: the pack's help text
is "Free-text context behind the win or loss reason", the *Win / Loss* form section
(`src/views/opportunity.view.ts`) offers `loss_details` beside **both** `win_reason` and
`loss_reason`, and `win_reason` is `requiredWhen` the stage is `closed_won` exactly as
`loss_reason` is `requiredWhen` it is `closed_lost`. That line now names all three
fields and which close each belongs to, matching the *Tips for sales reps* line
`#1721` already corrected on `sales/opportunities`. The `ai-copilot/knowledge-bases`
Competitive Intel row needed only the label, its claim being about competitor data
rather than about which close writes the field.

The Chinese faces take the zh-CN pack wording under the `AGENTS.md` documentation-discipline
rule — a UI noun never gets a freshly coined translation — so 「丢单详情」 → 「赢/丢单详情」
and 「丟單詳情」 → 「贏/丟單詳情」.

Documentation only. No `src/` metadata changed: the object, the packs and the form agree
with each other and only the prose disagreed.
