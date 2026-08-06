---
'hotcrm': patch
---

Two teaching-surface corrections. No runtime metadata changes — one test-file
comment and one developer-doc example.

**The action-sandbox rationale comment no longer asserts a fixed bug in the
present tense.** The file header of `test/case-first-response.test.ts` explains
why these tests run the shipped body under the real QuickJS sandbox instead of
the handler-as-JS shortcut, and cited `mass_update_stage` as "the action in this
repo that got that wrong and silently never wrote". Both halves had expired:
`src/actions/opportunity.actions.ts` now calls
`update({ id, stage }, { where: { id } })`, and the action path was never the
silent one — a wrong option spelling comes back as a 400 with a red toast in the
console. Only the hook-side writes failed silently, because those hooks carry
`onError: 'log'`. The example is now written in the past tense with the two
failure modes told apart; the technical point it exists to make — the engine
facade's `update` takes a document rather than an id, so only a real sandbox
catches this class of bug — is unchanged.

**The "Add An Action" doc example now declares a lookup param that renders a
record picker.** The Campaign param in `docs/developers/code_examples.md` was a
bare `{ name: 'campaign', type: 'lookup' }` with no picker target. That parses
and submits fine, so nothing warns — but with no target object to resolve, the
console degrades the control to a text box asking the user to paste a record id
by hand. The example now uses the field-backed form the repo actually ships in
`src/actions/lead.actions.ts`:

```ts
{ field: 'crm_campaign', objectOverride: 'crm_campaign_member',
  label: 'Campaign', required: true }
```

which resolves the widget from `crm_campaign_member.crm_campaign` and renders a
real picker, with a comment beside it stating why a bare lookup does not. Since
a field-backed param defaults its request-body key to the field name, the
example body's one read moves with it, `input.campaign` → `input.crm_campaign`
— otherwise the copied example would collect a campaign and then fail its own
"Campaign is required" check. The `_selectedIds` teaching added to this example
earlier is untouched. Fixes #778, #821.
