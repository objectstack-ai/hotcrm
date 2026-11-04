---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

Quotes can be printed to a PDF that is filed on the quote, and printing a quote presents it

**Print Quote (#2312, REQ-0008 phase 1).** A quote's record page, and the row menu of the quote list,
carry **Print Quote**. It prints the quote as a document — the account and contact, the line items,
the pricing and the terms, with a page number on every sheet — and files the PDF in the quote's
attachments, in the name of the rep who printed it. The rep downloads it from there and sends it.

- **Printing is presenting.** When the PDF is filed, a *Draft* or *In Review* quote moves to
  *Presented*; a quote in any other status keeps it, and a file attached by hand changes nothing.
  *Draft → Presented* is now a legal move on the quote's status path. The contact rule still holds:
  a quote with no **Contact** is printed and filed, and stays where it was.
- **The printed page is its own page.** The quote's record page is unchanged; the document is a
  separate print page, `quote_print_page`. The quote now declares its default record page,
  `quote_detail_page`, which overrides nothing: without it the console would open every quote on
  the print page, the first record page the quote has.
- **The deployment provides the browser.** Printing runs on the server in headless Chromium, through
  `@objectstack/service-print`, now a dependency: set `OS_PRINT_CHROMIUM_PATH` or
  `OS_PRINT_BROWSER_ENDPOINT`, and `OS_PRINT_CONSOLE_URL`. Without them **Print Quote** answers an
  error and nothing is filed.

It needs ObjectStack 18.3.0 or later: earlier releases print only an object's default record page
(objectstack#26583), and the print page is deliberately not the quote's default.
