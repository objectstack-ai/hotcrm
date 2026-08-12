---
'hotcrm': patch
---

Stop the Automation page from claiming HotCRM ships built-in email templates, in
all three languages. The "Email templates" section closed with *"Built-in
templates cover lead-routing, opportunity wins, case acknowledgments, contract
activations, renewal reminders"* — and this app authors no email template at all.
Nothing under `src/` writes one, and the compiled artifact carries no
email-template metadata (`dist/objectstack.json` has no such collection among its
top-level keys).

An admin who read that sentence went looking for a *Renewal Reminder* template to
reword, and the wording they were after was never there: the notifications behind
those business events are sent by the **`notify` nodes** inside the flows the same
page already tabulates, with the subject and body written inline in each flow.
The section now says so, which is also what the sentence under the flow table has
been saying all along — the page was contradicting itself across two sections.

Contract activation is called out separately because it is not a flow at all: it
runs as an object hook (`src/objects/contract.hook.ts`) that sends no message
whatsoever (#805/#823), and the contract mail that does go out belongs to the
**Contract Auto-Expiration** and **Contract Renewal Reminder** flows.

The correction is scoped to what this repo can prove — that HotCRM ships no
templates of its own. It makes no claim about the platform's template surface:
**Studio → Integration → Email Templates** stays the place to author one when a
templated outbound email is what you need, and the rest of the section (merge fields,
conditional blocks, HTML + plain text, attachments) describes that platform
capability unchanged.

Documentation only — no metadata, behaviour or field changes. Fixes #834.
