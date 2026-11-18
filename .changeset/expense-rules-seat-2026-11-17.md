---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Expenses: three corrections from testing.** (1) An expense report's **Expenses** list no longer offers **New**, on any report. An expense reaches a report only through **Submit for Reimbursement**: the report field is read-only, so an expense created from that list was saved on no report at all. The Expenses list on a project's page keeps **New**. (2) **A travel request can be deleted only while it is a Draft.** A request that has been sent stays on record, with its approval and its expense reports; deleting one is refused with a message that points to **Cancel Trip** (or, for a rejected request, back to Draft). Before, a Closed request with a paid report could be deleted, leaving the report pointing at nothing. An administrator may still delete one, to repair. (3) In Chinese, the travel request's **Reported Amount** reads 「已申报金额」 (was 「已报销金额」) and the report's copy reads 「出差已申报」 (was 「出差已报销」), because they count submitted reports as well as approved and paid ones. No data changes on upgrade.
