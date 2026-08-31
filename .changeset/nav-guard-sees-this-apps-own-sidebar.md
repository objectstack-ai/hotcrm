---
'hotcrm': patch
---

The navigation-name guard now checks citations into HotCRM's own sidebar, and
the FAQ stops sending readers to a Stripe action that does not exist.

The guard added by #853 built its citation matcher from `APP_WORDS` — the
Setup/Studio vocabulary — so a bold `**X → …**` path was extracted only when its
first segment was Setup or Studio. Re-measured on `main` at `4c6add4`: 307 bold
arrow runs across 201 pages, of which the guard saw 144 (Setup 87, Studio 42,
设置 15, 設定 0). Everything else was invisible: not quarantined, not counted,
not failed.

The largest coherent thing in that blind spot was **this app's own navigation**.
`Sales`, `My Work`, `Service` and `Activity` are groups declared in
`src/apps/crm.app.ts` and relabelled per locale in `src/translations/*` — the
sidebar a reader of these pages is actually looking at. A third rule now
resolves those pairs live, in all four shipped locales, and it is stricter than
the Setup/Studio rule in one respect: its matcher is generated from the shipped
group labels, so the group half is checked too rather than taken on trust. It
found 30 citations and 8 unresolved ones on its first run.

**What readers see change.** Three zh-Hans pages sent readers to
**服务 → 知识**; the zh-CN console labels that entry **知识库**, so
`administration/setup`, `ai-copilot/knowledge-bases` and `service/knowledge-base`
now name the entry that is on screen.

And the FAQ's Stripe answer told anyone whose Stripe customer had not linked to
"use the **Stripe Sync → Re-link** action". There is no such action and no such
surface — zero occurrences of Stripe in `src/`, no connector among the installed
platform packages, and `guides/integrations.mdx` already says in its own words
that no packaged vendor connector ships and that the closest thing to Stripe
today is "Nothing". All three locales now say that instead, and point at the
integrations page. `Stripe Sync` is banned by name from first-party text going
forward, with the same both-directions check the other retired names carry: if a
Stripe connector ever ships, the ban retires itself loudly instead of outliving
its reason.

`AI Copilot → Revenue Forecasting` on the forecasting pages was checked in the
same pass and is **correct** — `Revenue Forecasting` is a real skill, and *AI
Copilot* is this product's name for the platform assistant panel, not a sidebar
entry. It is left exactly as written.
