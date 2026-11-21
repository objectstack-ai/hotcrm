---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**A quote's and a deal's line items are now placed by the object itself, right after its basic information, and a deal or quote can be saved together with its lines in one request (#2720).**

- **Where the lines sit.** The quote's lines stay under **Quote Information** and before **Pricing**. The deal's product lines stay under **Basic Information** and before **Financials**. On this release the screen looks the same as before. The difference is that the quote and the opportunity now declare this position themselves, so it no longer depends on where the platform's default puts a line table, which changes between releases.
- **Saving a record with its lines.** The quote and the opportunity now allow batch saves through the API (`bulk`), and their line items already did. Saving a parent together with its lines goes out as one request. Before, that request was refused with "API operation 'bulk' is not allowed". Permissions do not change: every row in the batch is still checked against the user's own access, exactly as a single save is. On this release the Edit form of a deal or quote does not yet show the line items, so on screen lines are still added and changed one at a time.

The record pages of leads, cases, quotes, contracts and projects, and the Account Workbench, are unchanged. Each is kept for a ruled or recorded reason, listed in the pull request.
