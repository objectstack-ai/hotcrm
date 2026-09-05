---
'hotcrm': minor
---

Give the triage claim gesture a **Claim Case** button.

Claiming an unowned case already worked, and had done since the claim seam
shipped: an agent moves a case out of **Unassigned — triage** by setting its
status to *In Progress*, *Waiting on Customer* or *Waiting on Support*, and the
`case_self_claim` hook stamps them as the owner. The gesture was real, and
completely invisible — nothing on the record page or the triage row said "this
is how you take a case", so the only people who used it were the people who had
been told. Documenting it (the first half of this card) closed the gap for a
reader; it did not close it for the agent looking at the record.

There is now a **Claim Case** action on the case record header and in the triage
list's row menu. It opens a one-field screen asking which working status you are
claiming into, defaulted to *In Progress*, and moves the case there. The case
leaves the triage tab and appears in **My Open Cases**, owned by you.

**The button does not write ownership, and that is the point.** Ownership on a
case has exactly one writer — the claim hook, which stamps the *caller* and can
stamp nobody else. The action's flow performs the status move and stops; the
seam does the rest. Anything else would be a second writer of ownership: the
transfer gate refuses a payload carrying `owner_id` before any hook runs, and
for the one caller who could get past it, supplying the column takes the claim
seam out of the path entirely. A guard ships with the button asserting the flow
never carries `owner_id`, so that is enforced rather than merely intended.

The button appears on exactly the cases the `Unassigned Cases — Triage` sharing
rule grants you edit on — unowned, and neither *Resolved* nor *Closed*. Those
two are deliberately the same sentence: a button offered outside the grant is a
button that answers "insufficient privileges", and one offered on a narrower set
hides a case you may legitimately claim. Note this is *not* "any unclosed case":
a resolved unowned case is history rather than backlog, and reopening one is an
admin move.

The action's label and its success message are translated in all four bundles (en, zh-CN,
es-ES, ja-JP), and the new flow has its row in the built-in flow table on the
automation page in all three doc locales.
