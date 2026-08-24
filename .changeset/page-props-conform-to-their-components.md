---
'hotcrm': patch
---

**Sales Home's tab strip renders in the card style it was always asked for, and
seven other pieces of page configuration stopped pretending to do something.**

Across the eight app pages, 24 authored component settings named keys the
component does not accept. A rejected key is *dropped, not refused* — the page
builds, the artifact writes, the component renders, minus whatever the key was
meant to configure — so none of them ever announced itself. They were only
visible as advisory build warnings, and the build prints at most 50 of those with
no "and N more", so nobody could see how many there were.

One is visible on screen. **Sales Home's tabs** asked for the framed *card* style
and rendered as the default underline; they now render as cards. The **record
page tabs** (case, opportunity) also become properly linkable: their tabs were
addressable only as `tab-0`, `tab-1`, `tab-2` — positions that point at a
different tab as soon as a tab is added or reordered — and now carry the stable
names `details`, `related` and `activity`, so a link to a tab keeps working.

The rest were settings that had never had any effect, removed so the source stops
claiming otherwise:

- the **header icon** on six pages — no header has ever drawn one; the icons you
  see beside header buttons come from the buttons themselves;
- the **ACCOUNT kicker** on the account header — a label with nowhere to render;
- three **discussion toggles** on the account page (comments, reactions,
  mentions) — all three behaviours are already on by default, which is why the
  panel looked right despite the settings doing nothing;
- an **activity filter list** on the opportunity page naming filters that do not
  exist — the timeline's filter dropdown is already there and already opens
  unfiltered;
- a **detail-body layout** switch on the lead page whose two settings both did
  the same thing;
- **panel identifiers** on the related-record accordions, which the component
  assigns itself.

Nothing about your data changes, and no page loses a capability: every removed
setting was already being discarded before it reached the screen.

A guard in `test/metadata-references.test.ts` now parses **every** page
component's settings against that component's own contract, so the next setting
that would be silently dropped fails in CI instead of shipping. Three known
exceptions are named, dated and owned by their own issues rather than hidden, and
the guard fails if one of them is ever fixed and its exemption left behind.
