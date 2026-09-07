---
'hotcrm': patch
---

Name the opportunity detail layout's three structural components — the tab strip,
the *Details* body and the *Related* accordion — in all three locales.

The main region of `src/pages/opportunity_detail.page.ts` declares a `page:tabs`
(`opp_main_tabs`, three tabs), a `record:details` (`opp_details`, three sections)
and a `page:accordion` (`opp_related_accordion`, three panels, the first open on
arrival). The detail-layout list introduced none of them. It described the things
that live *inside* those components — the Quote related list, the Line Items list,
the Activity timeline — flat, as if they sat side by side on the page, and its own
later bullets then referred to "the *Details* tab" and "**Open Tasks** on the
*Related* tab" as though the reader had already met a tab strip. A reader was told
what is in the tabs before being told there are tabs.

The list now carries the shape `content/docs/service/cases.mdx` already uses: after
the Header / Key Information / Sales Path bullets, a single **Three tabs:** bullet
with one sub-bullet per tab. *Details* points at the section table rather than
repeating it, *Related* names the accordion and its three panels — **Quotes**,
**Products**, **Open Tasks** — and *Activity* keeps the timeline description it
already had, which was accurate and is unchanged apart from taking the tab's own
label.

That completes the standard #1709 set for the header region across the whole
layout section: each bullet describes exactly one component, and each of the
eleven components the page declares is named exactly once. **Competitors & Notes**
stays where it is — it names no component, it records that there is no such panel.

Documentation only. `src/pages/opportunity_detail.page.ts` is correct as authored,
and no gate or test was added.
