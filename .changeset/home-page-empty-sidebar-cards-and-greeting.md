---
'hotcrm': patch
---

Fix the three pieces of scaffolding a sales rep sees on the Sales Home landing
page: a greeting with no name in it, and two bordered boxes with nothing inside.

The page header read `Welcome back,` with the name missing. It was authored as
`Welcome back, {current_user.first_name}`, which mixes three vocabularies that
do not compose. `subtitle` is an `I18nLabel` — a display string or an inline
locale map — with no token pass and no expression pass of its own; the braces
that *do* resolve in a page header address the bound record's fields, and a home
page has no record; and `current_user.first_name` is a CEL path, which is
written bare, never inside braces. A greeting that names the user is not
expressible on a translatable label, so the header now reads "Welcome back" and
the four locale bundles carry the translation.

The left sidebar's `Recent Items` card and the right sidebar's `Today's
Schedule` card each declared a title and no body, so the renderer had nothing to
draw and each rendered as a heading over blank space. `Today's Schedule` is now
bound to `crm_event`'s saved `upcoming_events` view — planned events, soonest
first, read off the view rather than retyped — and is named `Upcoming Events`,
which is what the panel actually shows. `Recent Items` is removed: "recent"
means per-user access history across objects, the platform publishes no source
for it, and binding the card to one object's list view would have made its title
lie.

`test/metadata-references.test.ts` now applies the empty-container rule to every
region on every page, not only to tab panels, so the next card authored without
a body fails in CI instead of in a demo. Two known-empty containers elsewhere in
the app are exempted by name, each pointing at its own issue, and the rule fails
if an exemption's container is no longer empty — so a fixed defect cannot leave
its exemption behind as cover for the next one.

Part of #734: the four placeholder component types on these pages
(`nav:menu`, `global:search`, `global:notifications`, `app:launcher`) are
untouched. They are members of the spec's `PageComponentType` enum with
deliberate no-props rows, so the app is spelling them correctly and a console
that renders them as `Component Placeholder` is an upstream renderer gap — that
half stays open.
