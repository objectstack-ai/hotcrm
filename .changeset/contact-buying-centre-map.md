---
'hotcrm': minor
---

A contact now records the **buying centre**: who this person is in the purchase
decision, where they stand on us, and how well we actually know them. Three new
optional fields on `crm_contact`, in their own **Buying Function** / **Attitude
to Us** / **Relationship Strength** trio under a new **Buying Centre** section
(REQ-0004, the `crm_contact` half of REQ-0002's step 2).

Until now the app leaned on the buying centre and could not express it. `Job
Title` is the employer's job title, which is a fact about the person's employer
rather than about this deal — the same manager can be the decision maker on one
purchase and the blocker on the next. `Primary Contact` is a one-bit answer to
"who do we call", and it leaves every other person at the account undescribed.
Nothing anywhere said whether a named individual was a champion or hostile, and
`Last Contacted` measures recency, which is not the strength of a relationship.

What a rep sees:

- **Buying Function** — Decision Maker · Economic Buyer · Technical Evaluator ·
  User · Influencer · Gatekeeper. The generic buying-centre slots, not one
  company's role model.
- **Attitude to Us** — Champion · Supportive · Neutral · Skeptical · Blocker,
  ordered best to worst.
- **Relationship Strength** — Distant · Acquaintance · Working Relationship ·
  Strong · Trusted Advisor, ordered weakest to strongest.

All three are also columns on **All Contacts**, which already groups by account
with the groups collapsed — so expanding an account reads as a map of who
decides and who is on our side, rather than as a directory.

Nothing is refused and nothing is derived: no hook, no flow and no validation is
authored against the three, none is required, and none carries a default. A
contact with all three blank saves exactly as it did before. They are sales
intelligence for people and for later reporting, never a gate.

Shipped in all four languages (en · zh-CN · es-ES · ja-JP), with a new
user-facing page — *The Buying Centre* under Sales — explaining the concept in
all three doc locales.

⚠️ The field is `buying_function`, labelled **Buying Function**, and not
`buying_role` / *Buying Role*: `role` is reserved platform security vocabulary
and the author-time `security-role-word` rule (ADR-0090 D3) refuses it on both
the name and the label. The three non-English packs keep the natural term in
their own language.
