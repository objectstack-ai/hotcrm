---
'hotcrm': patch
---

Re-publishing an archived knowledge article no longer moves its original publish
date, so a 2024 article put back on the shelf this year stops jumping to the top
of the article list as if it were newly written.

`knowledge_article_publish_timestamps` decided "is this the first publish?" by
looking at the status the write arrived from — `previous.status === 'published'`
— which recognises only the published → published edit as a re-publish. The
documented article lifecycle is `draft → in_review → published → archived`, so
the ordinary re-shelving move `archived → published` arrives with
`previous.status === 'archived'`, fell into the first-publish branch, and
overwrote `published_at` with the current time. The `all_articles` view sorts
`published_at desc` and `published_articles` reads the same field, so the
re-shelved article surfaced everywhere as the newest thing in the knowledge base.
Archiving and re-shelving is routine content operations, not an exotic path.

The criterion is now the existence of the date rather than the previous status: a
write that leaves the article `published` stamps `published_at` only when the
record does not already carry one. The date is read as
`input.published_at ?? previous?.published_at` — the value the record would end
up with if the handler stamped nothing — because both halves of a write can
legitimately carry it. `previous` is the full stored row (the engine's
`sys_fetch_previous_update` builtin fetches it unprojected), and `input` carries
the date whenever the write supplies one — on an insert that supplied value is
what gets stored, so an import or migration publishing records with their
historical dates was having that history rewritten by the same branch.

`last_reviewed_at` is unchanged and still refreshes on every write that leaves
the article published, including a re-publish — re-shelving an article is itself
a review, and the admin "stale article" reports depend on that stamp.

The behaviour was already asserted, and already named correctly: the existing
test carried `'republishing must not move the original publish date'`. It fed
`previous: { status: 'published' }` — the one arrow the old implementation
handled — so it stayed green while the invariant it names was broken on the
other one. The suite now pins every arrow that ends on `published`, including
the archived article that never shipped (no original date to keep, so publishing
it really is a first publish).

This is the single-record path only; the bulk (`multi: true`) path, where the
engine hands hooks no `previous` at all, is tracked separately in #779. Two
adjacent engine behaviours found while measuring this are filed as #788 and
deliberately not papered over here: `readonly: true` is not enforced on the
insert path, and on the update path the read-only strip removes the
caller-supplied key along with anything a hook wrote there. Both behave
identically before and after this change.

Fixes #780.
