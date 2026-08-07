---
"hotcrm": patch
---

Lead conversion now works for sales reps, and asks for the opportunity amount up front.

Converting a lead failed for every sales rep. The conversion copies the lead's
annual revenue onto the new account, and a rep is not permitted to edit that
field, so the run stopped at "Create Account" with a field-permission error and
created nothing at all — no account, no contact, no opportunity — leaving the
lead untouched. It worked for administrators, who can write every field, which
is why it went unnoticed. A lead with no annual revenue failed the same way.

Conversion now runs as a trusted system process, the same way "Close Case"
already does. It is a grant to the conversion itself, not to the person running
it: a rep still cannot edit an account's annual revenue by hand. Two things
follow from that, and both are improvements rather than side effects. The
duplicate checks that look for an existing account or contact now search the
whole organisation instead of only the records the converter happens to own, so
a rep converting a lead for a company a colleague already owns reuses that
account instead of colliding with it half-way through. And whoever converts a
given lead, the resulting account, contact and opportunity are now identical.

Converting a lead that has already been converted is refused outright, rather
than quietly creating a second opportunity.

On the conversion screen, **Opportunity Amount** is now marked required
whenever **Create Opportunity?** is ticked. Amount was always mandatory on an
opportunity, but the screen did not say so, so the conversion was accepted and
then failed on the server — and with no error shown, the whole conversion was
lost silently. The prompt now appears while you are still on the screen. Leaving
**Create Opportunity?** unticked is unaffected: the field is hidden and nothing
is asked for.
