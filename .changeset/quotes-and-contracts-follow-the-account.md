---
'hotcrm': minor
---

**Quotes and contracts now follow the account** (#549). Both `crm_quote` and
`crm_contract` move from `sharingModel: 'private'` to `controlled_by_parent`
under `crm_account`, with the account lookup promoted to master-detail — the
same derivation contacts already use. A rep who receives an account through a
territory or team sharing rule now sees that account's *Quotes* and *Contracts*
related lists complete, renewals included, instead of the own-only keyhole this
issue reported. Access is computed per account, at every level: a quote under
an account you cannot see stays invisible, and so do its line items (measured
on `@objectstack/*` 17.4.0, which carries the two-level chain fix for
objectstack-ai/objectstack#11082 — the reason this change waited).

FROM → TO, per persona:

- **Sales Rep** — reads the quotes and contracts of every account they can see
  (own, territory-shared, team-shared, manually shared); edits the quotes of
  accounts they hold edit on (a territory share carries edit); still never
  edits a contract (the object-level right is unchanged). The inert
  `readScope: 'own'` on both objects is gone.
- **Sales Manager** — edits every contract, on every edition: the write gate
  now asks for edit on the account, which the manager holds org-wide. The #880
  hierarchy write depth (`own_and_reports`, Enterprise-only) is no longer
  declared because it is inert on a parent-derived object; the
  `hierarchy-security` capability declaration stays.
- **Tasks, events, cases and opportunities** stay own-only, as ruled.

An account delete would now cascade its quotes and contracts (master-detail),
so `account_protection` refuses to delete a customer account while an
*Activated* contract still references it — `Cannot delete customer account: 1
activated contract still references it. Terminate or reassign it first.` —
alongside the existing open-opportunity refusal. An account carrying only
drafts or ended contracts is still refused by the platform's own referential
pass (the contact cascade stops on the contract's required Primary Contact), so
in practice an account with contracts cannot be deleted until they are gone.
