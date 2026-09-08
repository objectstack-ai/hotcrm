---
'hotcrm': patch
---

Drop `navigation.view: 'detail_form'` from the default lead list. The key was
never resolved as a form-view name, and the inline comment beside it — `// Use
named form view` — stated the one thing it does not do.

### The severity question this card existed to answer

#1716 was filed with half a measurement and was honest about which half. The
bundle read was exhaustive: on `@objectstack/console` 17.3.0 every `.view`
property read and every `formViews` read was enumerated, and none of them
resolves a form view by authored name. What that could not say is which
`onNavigate` consumer the lead grid mounts at runtime, and the two answers were
two orders of magnitude apart — an inert dead key, or **the most-used list in
the app cannot open a record**.

The navigation hook passes the key into the *second argument* of `onNavigate`,
the slot that otherwise carries the literal mode string:

```
framework-BfSv4Kb0.js   let l = t?.mode ?? `page`, d = t?.view, …
                        if (l === `page`) { … r(t, d ?? `view`); return }
```

and one consumer in the same bundle compares that argument against `edit` /
`view` and nothing else — so if *that* consumer were the one mounted,
`'detail_form'` would match neither branch and the click would do nothing.

### Measured in a browser: it is the inert answer

Booted the app, signed in, opened the lead list and clicked a row. The record
opens: `/crm_lead/record/oL_m9wEVBa2qa0Oh` renders the full lead page for Mira
Costa — highlights strip, duplicate banners, `Details / Related / Activity /
History`. Clicking the row body (a plain, non-anchor cell) and clicking the
name link both land on the same record.

Control, on the same boot: the account list, which declares no `navigation`
block at all and therefore takes the same default `mode: 'page'` without a
`view`, behaves identically — row body and name link both open the account
record. A list that declares the key and a list that never has are
indistinguishable, which is what inert means.

So the row click was never broken, and this is a `Task`, not a `Bug`.

### The key named nothing, in a stronger sense than "unresolved"

The record the click opens is not rendered by any form view. It is rendered by
`lead_detail_page` (`src/pages/lead_detail.page.ts`), a `type: 'record'` page —
its tab strip is `Details / Related / Activity / History`, which belongs to
neither the default `simple` form (`Contact Information`, `Lead
Classification`, …) nor to `detail_form`'s `tabbed` sections (`General`,
`Qualification`, `Address`, `Details`). `detail_form` was not merely losing a
lookup; nothing on that route consults `formViews` at all.

`detail_form` itself **stays**. It is this file's one TABBED layout example in a
one-example-per-layout showcase, and deleting the navigation key does not change
its reachability — on the measurement above it was already reachable by no path.

### Blast radius

`navigation.view` occurred exactly once in the whole tree, on this list.
`crm_opportunity`, `crm_task` and `crm_case` declare `navigation` with `mode:
'drawer'` and a `width`, never a `view`; `crm_account` and `crm_contact` declare
no `navigation` block. There was nothing to sweep.

Nothing users see changes: the same click opened the same page before and after,
verified on the same running server with the served metadata confirming the key
had left the artifact (`/api/v1/meta/view?object=crm_lead` returns
`"navigation":{"mode":"page","preventNavigation":false,"openNewTab":false,"size":"auto"}`).

The upstream half — that `@objectstack/spec` 17.3.0 declares
`navigation.view?: string` as an unconstrained string next to `mode` / `size` /
`width` / `preventNavigation` / `openNewTab`, so this authored clean and
validated clean while selecting nothing — is filed on the platform, not
compensated for here.
