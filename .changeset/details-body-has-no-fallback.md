---
'hotcrm': patch
---

Correct `lead_detail.page.ts` on what an authored `record:details` does when
`sections` is omitted. It renders an **empty body** — not the object's
`highlightFields`, not its `fieldGroups`, not a bare auto-detected header chip.

The comment claimed the `highlightFields` fallback. A `crm_forecast` reading
recorded on #1452 claimed the `fieldGroups` one. Both read as authoritative,
they contradicted each other, and neither had been run against the pinned
version — so #806's ruling was written on a mechanism that does not exist, and
that cost a full round before anybody measured it. This corrects the prose only;
`properties.sections` is untouched, because whether this page keeps authoring
sections is #806's subject and a maintainer decision.

Measured on #806 by R28, and now recorded in the file so the next reader need
not rediscover the method: headless Chromium driving a real `objectstack start`
against a wiped DB, `@objectstack/console` 17.2.0, two runs over the same
records. Unmutated, 6 sections and 20 field rows; with `properties.sections`
deleted, 0 and 0 — the whole body between the tab strip and the "Created by"
footer absent. Negative control in both runs: `crm_contact`, which authors no
record page, kept rendering its five `fieldGroups`-derived headings in A and B
alike, so run B's nothing is the page's and not a dead instrument.

Why both wrong answers looked right: `fieldGroups` derivation is real, but it
lives in the console's page **synthesizer** — the path that fabricates a record
page for an object that has none authored, which is exactly why the
`crm_contact` control shows it. The `record:details` **renderer** that draws an
authored page reads neither `fieldGroups` nor `highlightFields`; it forwards
`sections`/`fields` and the detail view guards each with `.length > 0` and no
else branch. Authoring a page opts out of the synthesizer, and out of the
derivation with it.

⚠️ The browser numbers are 17.2.0 and this repo now pins 17.3.0; the browser run
was **not** repeated for this change. The installed 17.3.0 bundle was read
statically instead, and the mechanism is unchanged: both guards are still
`.length > 0` with no else, the renderer still reads neither fallback source,
and the synthesizer still passes the derived `highlightFields` to the details
node as `hideFields` — highlight fields are subtracted from that body, never
substituted into it, the opposite of the old sentence. Re-measure in a browser
before quoting the 0/0 for any later version.

No behaviour changes: comments only.
