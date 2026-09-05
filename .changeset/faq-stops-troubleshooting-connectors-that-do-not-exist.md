---
'hotcrm': patch
---

The FAQ's Integrations section stops troubleshooting two connectors that do not
exist.

`reference/faq` told a reader whose email was not logging to check that "the
**Gmail / Outlook connector** is connected (Settings → Email)", and a reader
whose contract had not updated to "check the **DocuSign integration log**
(Setup → Integrations → DocuSign → Activity)". Neither connector ships, so
neither screen exists — and there is no `Settings` app at all. `Setup →
Integrations` is real, but as this app ships it holds exactly the two entries
the platform contributes, *Connect an Agent* and *Datasources*; no vendor
mounts anything under it.

Both answers now say what actually ships and point the reader at the
Integrations guide (`/docs/guides/integrations`), the same shape #1401 gave the
neighbouring Stripe answer on this page:

- **Email.** Nothing logs an inbound message, by address match or otherwise,
  and there is no exclusion list. What exists is the outbound half — **Send
  Email** on a contact, which writes the message as a record and leaves an
  entry on that contact's Activity timeline, is hidden on a contact with *Email
  Opt Out* ticked, and delivers only through the mail transport a deployment
  configures. Also linked: the Email & Calendar guide
  (`/docs/guides/email-and-calendar`).
- **DocuSign.** There is no integration log to open and no webhook delivery to
  retry. Until a connector ships, a quote's or a contract's status is a field
  someone sets by hand and the signed document is a file someone attaches.

All three locales. This is #756's residue on the page that *troubleshoots*
connectors: #756 corrected the pages that *list* them and never opened this
one, and no guard could see either line — neither is a bold `**App → …**`
citation, so #853's navigation rule does not parse them and #1117's widening
does not reach them.
