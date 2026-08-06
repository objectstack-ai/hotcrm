---
'hotcrm': patch
---

Rewrite the *Manual termination* and *Sharing* passages on the Contracts page
against the profiles, the status machine and the engine, in all three languages.
#832 (PR #874) settled four other passages on the same page and, while measuring
the state machine for one of them, established the result that contradicts these
three sentences outright — the page currently answers the same question two
different ways in two adjacent sections.

**"The owner can change status to Terminated" is false for the most common
owner.** Edit on `crm_contract` is an object-level right and ownership does not
extend it: `src/profiles/sales-rep.profile.ts` grants the object
`allowEdit: false` (read-only, own records), while `sales-manager.profile.ts` and
`system-admin.profile.ts` are the two profiles that hold edit. The gap lands on
the common case rather than an edge one, because the contract a rep ends up
owning is the one `quote_on_accepted` drafts for them — `src/objects/quote.hook.ts`
copies the quote's `owner_id` onto the new contract — so the rep whose deal it
was owns a record they can read and cannot touch. The section now says who may
terminate a contract, and that owning it is not what qualifies you.

**"Terminated contracts can't be reactivated" is a gate nobody built.**
`contract_status_progression` does declare `terminated` a dead end
(`src/objects/contract.object.ts`), but the whole rule is `severity: 'warning'`,
and a non-`error` verdict is logged and the save proceeds — the behaviour PR #874
measured in `@objectstack/objectql` and wrote into this page's *Built-in rules*
section. Moving a terminated contract back to Activated therefore writes a line
to the server log and saves. The advice is kept, because one-way is what the
status means and how everything downstream reads it, but the page now says
plainly that nothing enforces it and that enforcing it is something an admin has
to author. The two sections now give one answer instead of two.

**"The contract owner reads and edits their own contracts" conflated the two
access layers.** Record-level sharing decides which records you reach; whether
you hold edit at all is decided a layer earlier by the profile's object-level
CRUD, so widening the record side never gets a Sales Rep past the object gate.
The bullet now separates the layers and states the direction of that
relationship. It describes only the behaviour measured today and takes no
position on #549, which is still open on the read side.

Documentation only — no metadata, profile, permission or validation-rule changes,
and nothing in `src/` was touched. Whether Contract's status machine should be
raised to `error` severity, and whether a Sales Rep should be able to edit a
contract they own, are both product decisions and stay open. Fixes #872.
