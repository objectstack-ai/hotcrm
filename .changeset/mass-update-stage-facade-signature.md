---
'hotcrm': patch
---

Fix the "Update Stage" action on an Opportunity: choosing a new stage now
actually moves the deal. Until this release the dialog accepted a stage, the
request left the browser, and the server refused it with
`update('crm_opportunity') does not recognise option 'stage'` — the deal stayed
where it was and a red toast was all the rep got.

The cause was the same one that hit the hook-side derived writes (#616): the
action body called `ctx.api.object('crm_opportunity').update(id, { stage })`,
but `ctx.api` is the engine repo facade, whose update takes
`(document, options)` — the second positional argument is the OPTIONS bag, so
the id landed in the `data` slot and the stage arrived as an unrecognised
option. The body now writes `update({ id, stage }, { where: { id } })`, the
spelling the rest of this app already uses and the only one live on both
surfaces the runtime can hand a body (`updateById(id, data)` exists on
`ObjectRepository` but not on the facade built when there is no scoped context).

`test/action-sandbox.test.ts` used to pin this defect as a known break — it
asserted the action was *rejected* by the engine. That pin is now inverted into
a contract: the shipped body is executed under the real QuickJS sandbox against
a real ObjectQL kernel on the in-memory driver, and the assertion is that the
STORED record's stage moved, read back from the driver rather than taken from
the body's return value. Reverting the call to the old spelling turns four tests
red, one of them reproducing the production error string verbatim.

This is only the single-record half of #508. A multi-row selection still cannot
reach any action in the console — the client rejects it before a request is
sent, a top-level `selectedIds` is not delivered to the body, and
`params.selectedIds` is refused as undeclared — so the "Update Stage" bulk
button stays off the Opportunity list view until that ships upstream
(objectstack-ai/objectstack#5568). The body's selection loop is covered by tests
so nothing else stands in the way when it does. Refs #508.
