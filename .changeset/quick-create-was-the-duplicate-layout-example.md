---
'hotcrm': patch
---

Retire `crm_lead.formViews.quick_create` (#1707).

**It goes because it was the duplicate exhibit, not because it was unreachable.**
`src/views/lead.view.ts` declares itself a UI showcase and its `formViews` block
demonstrates one example per FormView layout type. `quick_create`'s own numbered
comment said what it demonstrated: the SIMPLE layout, "already shown as default
form above". In a one-example-per-layout set, that is the entry whose removal
costs the set nothing — every other named form is still the only example of its
own layout, and the showcase still covers all six.

Unreachability is why the removal is free, not why it happens. No console path
resolves a named form view: both surfaces that open a lead create form take
`view.form ?? view.formViews.default`, and `crm_lead` declares `form`. So no
user-visible surface changes at all — no form, no field, no label, no route.
That is the whole difference between this and a retirement that costs a
capability, which is a maintainer's call rather than a cleanup.

The eight fields it declared are not lost: the default `form` carries them and
more, and is what the app has always rendered. Its four-locale section heading
(`crm_lead._sections.lead_details`) goes with it — that key had no other source,
so keeping it would have left the dead-key shape this change exists to remove.
