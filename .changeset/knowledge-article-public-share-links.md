---
"hotcrm": patch
---

Publish public knowledge articles as share links.

`crm_knowledge_article` now declares `publicSharing`, so publishing an article
produces a link an unauthenticated visitor can open — no sign-in, no customer
portal, and no widening of the guest profile.

The link is gated at the moment it is minted. Only a **published** article whose
**audience is public** can produce one: a draft, an in-review, an archived, or
any internal-audience article is refused outright with `RECORD_NOT_ELIGIBLE`,
and no link row is written. Links are view-only and may be issued for the
`public` and `link_only` audiences only. What the link serves is stripped of the
fields that exist for staff — the article owner, the case it was written from,
and the last editorial review date.

This ships only now because the platform could not enforce the eligibility gate
before `@objectstack/plugin-sharing@17.1.0`. Declaring the block earlier would
have opened anonymous access to internal and draft articles rather than
restricting links to public ones, so it was deliberately withheld. Enforcement
is re-verified end to end in `test/knowledge-article-share-links.test.ts`, in
both directions.
