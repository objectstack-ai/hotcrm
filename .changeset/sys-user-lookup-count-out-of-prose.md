---
---

Comment prose only — this PR releases nothing to HotCRM users, so the
frontmatter above is deliberately empty (the sanctioned "releases nothing"
declaration that `.github/workflows/changeset-check.yml` documents, on par with
the `skip-changeset` label).

Two comments justifying `deleteBehavior: 'cascade'` on
`crm_event_attendee.sys_user` each stated a hand-counted figure — "HotCRM holds
15 lookups on `sys_user`; the other 14 ... are `set_null`" — in
`src/objects/event_attendee.object.ts` and `test/event-attendee-cascade.test.ts`.
Nothing produced either integer and nothing checked them. They had already
drifted to 16 once, when `article_feedback` gained an `owner_id`, with nothing
reporting it; they read correctly today only because removing
`crm_account.renewal_owner` happened to bring the real count back to 15.

Both sentences now make the **universal** claim instead: *every other `sys_user`
lookup in HotCRM — every `owner_id`, plus `crm_product.product_manager` — is
`set_null`*. That is what the cascade argument actually rests on, it is stronger
than "the other 14" because it cannot be falsified by the next field someone
adds, and it needs no producer to stay true.

Pinning the integers was the alternative and was rejected: it would have added a
second hand-maintained number plus a guard whose only effect is to turn "silent
drift" into "red on every new `sys_user` lookup", changing nothing a user sees.

No code, no assertion and no other line of either comment's argument changed.
