---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

Contracts can be printed to a PDF filed on the contract, and a signed copy is what activates a contract and accepts a quote

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

- **Activated requires it.** A save that moves a contract to *Activated* — or creates one already
  *Activated* — is refused on **Signed Copy** until a file is there, and an activated contract's
  signed copy cannot be removed. Uploading it fills **Signed Date** with today's date when Signed
  Date is empty; a date already set is kept.
- **Accepted requires it.** A save that moves a quote to *Accepted*, the **Accept** button's
  included, is refused on **Signed Copy** until a file is there; no contract is drafted and the
  deal keeps its stage.
- **Existing records are not touched on the server.** Both are transition gates: a contract
  already *Activated* and a quote already *Accepted* without a signed copy keep saving their other
  edits through an import, an integration or the API, and a contract still expires or is terminated
  as before. The console's Edit form is stricter on such a contract: it asks for the Signed Copy
  before it saves any change, so the copy is uploaded first. An import or integration that writes
  contracts straight in as *Activated*, or quotes as *Accepted*, must now carry the file.
- **The Edit forms offer the upload.** The contract form's Signing & Documents tab and the quote
  form's first tab list Signed Copy.
- **Demo data.** The seeded activated contract and accepted quote carry a labelled sample PDF
  (`assets/seed-files/`), stored at boot by the platform's seed-file loader.
