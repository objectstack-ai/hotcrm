---
---

No user-visible change: one source comment — the file header of
`src/sharing/campaign.sharing.ts` — is corrected, nothing else. The diff's
non-comment content is empty, proved two ways (every changed diff line is a
comment line; the comment-stripped emit of the file is byte-identical before and
after).

Same defect class as #744 / PR #773, but the stale premise here never had a
valid era: the header argued from an OWD the object has never declared. It said
`crm_campaign` "is a private-OWD object and the only set with org-wide campaign
access is `marketing_user` — so a marketing manager or director could not open a
campaign a specialist owned", while `src/objects/campaign.object.ts` declares
`sharingModel: 'public_read'`. Neither line ever changed: `git log -L 18,18` on
the object and `git log -L 7,9` on the sharing file each return exactly one
commit, the file's own creation (#570). `src/profiles/marketing-user.profile.ts`
records the same OWD correctly, so the repo held two contradictory accounts of
one object.

The argument was a READ argument, and under `public_read` no part of it stands:
the OWD baseline already opens reads, so both leadership rungs could open any
campaign with or without these rules. What the rules actually buy is the **edit**
the baseline withholds — `@objectstack/plugin-sharing` 17.0.0-rc.2 states it in
`buildWriteFilter`'s own comment, that the editable set applies to both `private`
and `read` models because "public_read is read-open but write-owned". The header
is rewritten onto that, and the ADR-0090 D3 flat-positions paragraph is kept
verbatim because it still holds.

The rewritten header's behavioural claims are measured on the pinned
17.0.0-rc.2, over this app's own metadata, rather than reasoned from the engine's
prose. For a user holding the `marketing_user` permission set plus position
`marketing_manager` and owning no campaign: reads return every campaign at every
point in the run; before the rules materialise, `buildWriteFilter` is
`{ owner_id: specialist }` and updating a specialist-owned campaign is FORBIDDEN;
after, the filter gains `{ id: { $in: [live campaign] } }` and the same update
succeeds, while the completed campaign stays FORBIDDEN. That also settles the
redundancy question the wrong premise invited: the `marketing_user` set's
`marketing_campaign_updates` RLS policy (`id != null`) widens the RLS layer only,
and the sharing layer's write-owned baseline refuses the update regardless — so
deleting these two rules would cost the two rungs their only edit path while
changing nothing they can read.

The rules themselves are untouched: same names, same object, same criteria, same
`accessLevel`, same recipients.

Fixes #724.
