---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**An order can only carry a contract of its own account (#2728).**

The order form already offered only the account's contracts under **Contract**, and the import only resolved the account's contracts. A write through the API, or by an automation, could still save an order with another account's contract; the plan steps, invoices and payments on that order were then refused against the contract, and the contract page and the order page disagreed.

FROM → TO:

- FROM any contract accepted on save TO a contract of another account refused, on create, on a contract change and on an account change, with the message on **Contract**: "This contract belongs to another account. An order can only carry a contract of its own Account: choose one of this account's contracts, or clear Contract." The message is translated in Simplified Chinese, Spanish and Japanese.
- An order with no contract, and an order under its own account's contract, save as before. The demo data holds no order that breaks the rule, in English or Chinese.
- An order saved with another account's contract before this release is refused on its next edit until its contract or its account is corrected.

The Orders manual and the Orders page of the documentation site, in English, Simplified and Traditional Chinese, say so.
