---
'hotcrm': patch
---

Scope the `field-group-shadowed` failure message to the pages it can actually
speak about, after measuring which those are.

`test/field-groups-coverage.test.ts` pushes a message when a declared group is
entirely hoisted into the highlight strip, and it said the group "renders on
forms and never on detail pages" — unscoped, while the hoist it describes is
the page **synthesizer's** behaviour. The docblock 47 lines above it and
`src/objects/opportunity_line_item.object.ts` both scope the same sentence to a
*synthesized* detail page, so the message was the odd one out. #1674 left the
string alone rather than inserting "synthesized", because the correct wording
turns on a question nobody had measured: can this shadowing apply at all to an
object that authors its own `record:details`?

It cannot, and that is now measured rather than argued. Headless Chromium
against a real `objectstack start` on a wiped database, `@objectstack/console`
17.3.0, four cold boots, each one gated on `GET /api/v1/meta/object/<name>`
serving the metadata the leg intended to test before any DOM was read:

- **Baseline.** `crm_lead` (authors six sections) renders 6 sections / 17 field
  rows; `crm_contact` (authors no record page, so its page is synthesized)
  renders its three `fieldGroups`-derived sections.
- **Authored page, shadowed group.** With `crm_lead.highlightFields` set so that
  `company_info` (`company`, `title`, `industry`) is entirely title-or-strip —
  the assertion fires naming exactly that group — the detail page is
  **unchanged**: all three fields still render. 6 sections / 17 rows.
- **Synthesized page, shadowed group.** With `crm_contact.highlightFields` set
  so that `contact_info` (`email`, `phone`, `mobile`) is entirely
  title-or-strip, the **whole section disappears** — 3 sections become 2. In the
  same run `crm_account`, dropped from `highlightFields` by that edit,
  *reappeared* as a rendered row, so the empty reading above is the page's and
  not a dead instrument.
- **Restore.** Baseline reproduced exactly.

The baseline run also shows *why*, as a double dissociation on one page:
`crm_lead`'s authored body drops precisely the six fields its own
`record:highlights` node lists (`status`, `rating`, `lead_source`, `owner_id`,
`email`, `phone`), while `company` — in the object's `highlightFields` but not
in that strip — renders. An authored page opts out of the synthesizer and reads
its own strip; the object's `highlightFields`, which this check computes from,
has no authority there. That confirms live at 17.3.0 the mechanism
`test/detail-section-dedup.test.ts` recorded statically at 17.1.0.

So the message now says it means a **synthesized** detail page, and says
plainly that an object authoring its own `record:details` is outside the
check's reach and why — carrying the console version it was measured on, so it
does not become another undated reading. Only the message text changed; the
assertion, what it receives and what it expects are untouched.
