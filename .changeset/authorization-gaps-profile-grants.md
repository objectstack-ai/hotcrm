---
'hotcrm': minor
---

Grant the six objects that shipped with no permissions at all, so Knowledge,
Forecasts, Competitors, line items and campaign members are usable.

Permission sets are explicit-allow only: an object that appears in no set is
refused for **every** user, administrators included, because the object-level
CRUD gate runs before OWD, sharing rules or *View All Data* are consulted.
`crm_forecast`, `crm_knowledge_article`, `crm_competitor`,
`crm_opportunity_line_item`, `crm_quote_line_item` and `crm_campaign_member`
were never granted, so "Knowledge", "Forecasts" and "Competitors" were nav items
that failed for everyone, the "Products" related list on an opportunity was
denied to every profile, quotes could not be given line items, and
`marketing_user` — the only persona meant to run "Add to Campaign" — could not
write the campaign members that action inserts.

What changed:

- **Object grants** for all six, on every profile that has business reason to
  hold them. `system_admin` now covers all 16 business objects. Service agents
  author knowledge articles, sales managers own the forecast number, reps build
  line items on their own deals and quotes, marketing enrols campaign members.
  The guest set stays insert-only and reads nothing.
- **`crm_opportunity_line_item`, `crm_quote_line_item` and
  `crm_campaign_member` are now `controlled_by_parent`** instead of `private`.
  None of them has an owner field, so `private` silently meant "visible to
  whoever inserted the row" — a rep could not see line items the
  quote-generation flow or their manager added to their own deal. Access now
  derives from the opportunity / quote / campaign: you read the rows whose
  parent you can read, and writing one requires edit access to that parent.
- **`crm_opportunity.is_private` is enforced.** The checkbox was settable in the
  opportunity form and read by nothing. A row-level rule on the two sets holding
  org-wide opportunity read (`sales_manager`, `marketing_user`) now keeps a
  private deal with its owner.
- **Field-level security** authored for the sensitive fields that had none:
  `crm_account.health_score` (read-only below sales manager),
  `crm_case.internal_notes` (service-only, masked for sales reps),
  `crm_quote.internal_notes` and `crm_opportunity.amount`.
- **Leadership sharing rules** for the four positions no rule referenced —
  `executive` on large open deals, `service_director` on escalated cases, and
  `marketing_manager` / `marketing_director` on live campaigns. Positions are
  flat (nothing rolls up from the manager rung), so each needs its own rule.
- **`readScope: 'own'` removed from `sales_rep`'s `crm_contact` grant.** Contacts
  are `controlled_by_parent`; owner scope is never applied to a parent-derived
  object, so that scope described a restriction the engine did not apply while
  access actually followed the account.
- **`test/authorization-coverage.test.ts`** pins the whole surface: every object
  granted somewhere, admin coverage complete, no nav item or related list denied
  to its own audience, scopes and field masks that resolve, and row-level
  predicates the engine can actually compile (an uncompilable one denies rather
  than warns).
