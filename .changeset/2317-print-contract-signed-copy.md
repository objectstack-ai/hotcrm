---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

Contracts can be printed to a PDF filed on the contract, and both contracts and quotes record the customer's signed copy

**Print Contract (#2317, REQ-0008 phase 2).** A contract's record page, and the row menu of the
contract list, carry **Print Contract**. It prints the contract as a document — the parties, the
term and dates, the value and billing, the renewal terms and a signature block for each side, with a
page number on every sheet — and files the PDF in the contract's attachments, in the name of the
person who printed it. Printing changes nothing else on the contract. It is offered to whoever may
edit the contract and attach files to it (a Sales Manager or a System Administrator).

- **The printed page is its own page.** The contract's record page is unchanged: the document is a
  separate print page, `contract_print_page`, and the contract now declares its default record
  page, `contract_detail_page`, which overrides nothing.
- **One print service for both documents.** `PrintServicePlugin`, which Print Quote brought in, is
  now composed by the app package rather than the revenue module, so Print Contract and Print Quote
  share one `POST /api/v1/print/records`. The deployment still provides the browser
  (`OS_PRINT_CHROMIUM_PATH` or `OS_PRINT_BROWSER_ENDPOINT`, and `OS_PRINT_CONSOLE_URL`).
- **Contract dates print with the year.** Start Date and End Date use the short date style
  ("Sep 14, '26") instead of words such as "Yesterday", on screen as on paper.

**The signed copy (REQ-0008 phase 3).** Contracts and quotes gain a **Signed Copy** file field.

- **Recorded, not yet required.** A contract still activates, and a quote is still accepted (the
  **Accept** button's included), without a signed copy, and every record keeps saving as before.
  The rule that would make the copy a condition of *Activated* and *Accepted* is held until
  objectstack-ai/objectstack#30184 ships: on this platform the console's Edit form would check it
  on every save, so a contract activated without a copy could save no edit at all from the
  console.
- **Uploading it dates the signature.** Filing the copy on a contract fills **Signed Date** with
  today's date when Signed Date is empty; a date already set, or typed in the same save, is kept.
- **The Edit forms offer the upload.** The contract form's Signing & Documents tab and the quote
  form's first tab list Signed Copy.
