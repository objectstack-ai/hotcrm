---
"hotcrm": patch
---

Clause-②: no
Metadata-protocol: none

**Order to Cash: Billing Milestone is now called Payment Plan (回款计划 in Chinese) (#2805).** Each billing milestone record is one period of a payment plan, and the Sales app's group was already called 回款计划 while the menu item inside it still said 回款节点. The Chinese interface now says 回款计划 everywhere the object shows: the menu items in the Sales and Order to Cash apps, the object's name, the All list view, the tabs on orders, contracts and accounts, the field on invoices and payments, and the message shown when an invoice picks another account's milestone. The Chinese in-app manuals and the Chinese documentation site (Simplified and Traditional) use the new name too. Display names only: the API name `crm_billing_milestone`, existing records and integrations are unchanged. In English the object, its All list view, the menu items, the tabs, the invoice and payment fields and the cross-account message now say Payment Plan; Spanish says Plan de cobro and Japanese 入金計画. The English documentation and in-app manuals follow. The CSV import column keeps its heading Billing Milestone, so existing import files keep working. No setup is needed.
