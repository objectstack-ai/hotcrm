---
'hotcrm': patch
---

A lead flagged as a suspected duplicate now says so — on its record page, and
again at the moment someone converts it.

The detection already worked: `lead_duplicate_check` matches a re-captured email
at intake, writes `duplicate_status: 'suspected'` and links the record the lead
repeats. Nothing carried that anywhere a seller would see it. The record page
never read the flag, and **Convert Lead** asked one question ("create an
opportunity?") without consulting it, so a known duplicate converted into a
second account, a second contact and a second opportunity — two reps working the
same buyer, and the same deal counted twice in the pipeline. The
**Suspected Duplicates** queue caught these eventually, but that is the
reviewer's list; the rep with the record open never saw a thing.

**On the lead record page.** A warning banner now sits under the header on any
lead flagged `suspected`, and the Details tab carries a **Duplicate Management**
section with the duplicate status, which kind of record it repeats, and the link
to that record — a lead link or a contact link, whichever the flag names. Both
are silent on a lead that carries no duplicate claim: the banner's predicate
answers "no" and a details section holding only empty fields renders nothing at
all. The banner's copy ships in all four locales.

**At conversion.** The conversion screen now opens with a line naming what is
about to happen — that intake flagged this lead as repeating an existing record
with this email address, and that converting creates a second account, contact
and opportunity for the same buyer. It appears only on a flagged lead; a clean
lead sees the same screen it always did. The line names the record by the email
the two share, never by an internal id, and the conversion is **not** blocked:
whether a duplicate may be converted at all is a product decision and is left
open deliberately.

Both surfaces read the flag through predicates that answer for every record
shape, including the drivers that omit a column the record never set. That is
not a detail: the banner's predicate fails soft, so an unguarded one would show
a duplicate warning on every clean lead, and the conversion flow's condition
fails the whole run, so an unguarded one would leave ordinary leads unconvertible.
`test/lead-duplicate-visibility.test.ts` pins both directions on the real
engines.
