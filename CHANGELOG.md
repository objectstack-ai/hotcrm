# Changelog

## 3.0.0

### Major Changes

- 9f748ab: **Owner is now one field, and changing it really does transfer the record.**

  Every business object used to carry two owners: the **Owner** you saw on forms,
  views, highlight strips and reports, and a separate hidden column the platform
  used for every access decision. Nothing kept them in step. Reassigning Owner
  moved the record in every list and report and moved **no access at all** — the
  previous owner kept it, the new owner never got it. Records created on someone
  else's behalf were scoped to whoever created them, and sharing rules,
  `own`/`own_and_reports` read scopes and the _Private deal_ row filter all
  resolved against a column the UI never showed.

  HotCRM now has exactly one Owner: the platform's ownership column. One field on
  the form, one column in the "My …" views, one answer to _"who owns this?"_.

  **Changing Owner is now a permission.** Because reassigning really does move
  access, it is gated separately from ordinary edit rights:

  | Persona                   | May reassign                                                                 |
  | ------------------------- | ---------------------------------------------------------------------------- |
  | System Administrator      | every object                                                                 |
  | Sales Manager             | leads, accounts, contacts, opportunities, quotes, tasks, meetings, forecasts |
  | Service Agent             | tasks only — so escalation can hand work to the account owner                |
  | Sales Rep, Marketing User | nothing; records are assigned _to_ them                                      |

  A user without the grant who tries to reassign now gets a clear refusal instead
  of a change that appeared to work and did nothing. Three everyday actions are
  deliberately **not** transfers and need no grant: creating a record (it is
  stamped to its creator automatically), saving a form without touching Owner, and
  automation acting on your behalf — lead round-robin, the nightly renewal /
  follow-up / forecast sweeps.

  **Import files that name an owner now need the transfer grant.** `Account Owner
Email` / `Contact Owner Email` / `Lead Owner Email` target the real ownership
  column, so a file that assigns rows to other people is a bulk transfer and is
  refused unless the importing user may perform one. Leaving the column blank is
  unchanged: the row lands with the importer.

  **Ownership changes still appear on the record timeline**, and every transfer is
  recorded in the audit log.

  ## Migration — run the backfill BEFORE upgrading

  FROM: two columns, `owner` (displayed) and `owner_id` (enforced).
  TO: one column, `owner_id`, labelled **Owner** everywhere.

  On any org where somebody reassigned Owner, the two columns disagree today: the
  record shows one person and is accessible to another. The upgrade keeps the
  **enforced** value, so those records keep their current access and their
  displayed owner changes to match it.

  If you want the _displayed_ owner to win instead, run the one-time backfill
  **while the org is still on the previous release** — after the upgrade the old
  column is gone and its values cannot be read back:

  ```
  pnpm backfill:owner --url https://<your-org> --email <admin> --password <pw>
  pnpm backfill:owner --url https://<your-org> --email <admin> --password <pw> --apply
  ```

  The first command reports; only `--apply` writes. It copies the displayed owner
  onto the enforced one wherever they diverge, skips rows whose Owner names no
  real user (the old field had no referential integrity, so it could hold any
  string), never blanks an existing owner, and is safe to re-run. It needs an
  administrator account, because a backfill is a bulk transfer.

  Nothing to do if nobody ever reassigned an Owner: the two columns already agree
  and the backfill reports zero divergences.

### Minor Changes

- d038b95: Remove the dead account-level renewal model — renewals are a contract-level
  process with one home.

  `crm_account` declared **Renewal Owner (CSM)** (`renewal_owner`) and **Next
  Renewal Date** (`next_renewal_date`), and nothing in the product ever wrote or
  read either one. No hook stamped the date, no flow consulted the owner, and no
  dataset exposed them — so an admin who named a CSM as renewal owner was told a
  renewal would reach that person, and it never did. The date, meanwhile, showed
  whatever had last been typed in by hand: a second, hand-maintained copy of a
  fact the contract already carries, free to drift from it.

  The renewal process that actually runs is unchanged and untouched: the daily
  sweep in `contract_renewal` reads `crm_contract.end_date` against each
  contract's own **Renewal Notice (Days)**, books the renewal task, notifies the
  **contract owner**, and opens the renewal opportunity when auto-renewal is on.

  **Migration — what changes for users:**

  - The account list's **🔄 Upcoming Renewals** view and its **Renewals** tab are
    gone. Both its filter and its sort key were `next_renewal_date`, so the view
    could not outlive the field. The equivalent queue already ships on the
    contract object: **Contracts → Renewals** (`renewal_calendar`, over
    `end_date`), or sort **All Contracts** by **End Date**. That list is driven by
    the same dates the reminder acts on, so it is the accurate one.
  - **⚠️ At-Risk Accounts** loses its _Renewal Owner_ column; its **Health Score**
    filter and everything else about it are unchanged.
  - The account form's **Customer Success** section keeps Tier, Segment and Health
    Score, and no longer offers Renewal Owner or Next Renewal Date.
  - Any value previously stored in `crm_account.renewal_owner` or
    `crm_account.next_renewal_date` is dropped with the columns. Nothing consumed
    them, so no behaviour changes — but if your org was maintaining the date by
    hand as a private convention, record it on the contract's **End Date** before
    upgrading.

  Authorized by the maintainer ruling of 2026-08-17, 「逐个 enforce-or-remove
  （推荐）」: a declared-but-unenforced field ends the card either genuinely
  enforced or genuinely gone.

- d39d69f: Make territory a first-class field on Account instead of matching free-text
  country strings. `crm_account` gains a read-only **Territory** picklist
  (`na` / `emea` / `other`) that `account_protection` derives from the billing
  address, and the two territory sharing rules now compare `record.territory`
  instead of matching `billing_country` against a list of country codes inside a
  CEL string.

  The defect this closes is silent by construction. `billing_country` is free
  text, so an account whose address read `United States` rather than `US` belonged
  to **no territory at all** — the metadata said territory sharing worked, and for
  that account it did nothing, with no error anywhere. A declared `select` makes
  the domain knowable instead: three values, every one of them reachable, and an
  account outside the staffed territories now says `other` rather than nothing, so
  "belongs to no territory" and "nobody filled this in" stop looking alike.
  `Germany`, `DE` and `de ` all land in `emea`.

  The country-to-territory mapping is authored once, in
  `src/objects/_territory.ts`, and everything else is derived from it: the
  picklist, both sharing-rule conditions (interpolated, so a renamed value cannot
  be half-applied), and the localised country tables that were previously kept in
  sync by hand across three documentation languages. `account.hook.ts` is the one
  consumer that still carries a copy — a hook body is lowered to metadata and
  evaluated with no module scope, so it cannot import one — and
  `test/territory-single-source.test.ts` parses that copy back out of the
  **lowered** body and asserts it equals the module's map, then drives every
  declared spelling through the real QuickJS sandbox. A country added to either
  side alone is red at PR time.

  `UK` is kept as an accepted spelling of the now-canonical `GB`, which is what
  let the ISO correction happen with no data migration: both land in `emea`, and
  no existing account was evicted from its territory. The stock London account
  still says `UK` on purpose — it is the fixture proving the alias path works on
  real data. Nothing needed backfilling: both derived columns are `readonly` and
  hook-owned, never authored in seeds, so they are computed on the seed insert.

  Fixes #639. Refs #621, #637, #638.

- 8e52003: Demo data for the activity model: the Sales Activity dashboard now has numbers behind it

  The activity model shipped with its objects, actions, cube and dashboard but no
  records, so a freshly seeded demo showed a complete Sales Activity dashboard
  reading zero on every widget, an empty calendar, empty interaction histories,
  and three "Quiet 30 / 60 / 90+ Days" tiles with nothing to count.

  The demo database now ships 27 interactions and their attendee rows, spread
  across leads, contacts, accounts, opportunities and cases, over roughly nine
  weeks and across calls, meetings, demos, webinars and an onsite visit. Both
  sides of the `held` / `planned` split are represented: interactions that
  happened, meetings that are merely booked, and a cancelled and a no-show row.
  Every timestamp is relative to the boot date, so the demo reads the same on any
  day it is installed.

  `crm_account.last_activity_date` is now laid out across the churn bands rather
  than clustered inside a fortnight: three accounts sit at 41, 72 and 104 days of
  silence, one per tile, and each has a re-engagement meeting on the calendar
  without its clock moving — which is what the `held` / `planned` distinction is
  for. The at-risk account's health score and its activity clock finally agree.

  Seeded interactions reach the database owned by nobody, as every seeded record
  does, so the demo bootstrap sweep now claims `crm_event` alongside the other
  owner-scoped objects. Without that, every interaction would be invisible to
  every rep, absent from the "Activity by Rep" breakdown and editable by no one.
  The attendee junction takes its access from the event it hangs off and is
  deliberately not claimed.

- 5a78f88: Make the CRM able to answer "what happened with this customer, and when?".

  **A meeting is now a record.** The new `crm_event` object holds one row per
  interaction that occupies a slot on someone's calendar — subject, start and end,
  duration, location, type (meeting / call / demo / webinar / onsite visit),
  status, owner, and the same five polymorphic `related_to_*` lookups `crm_task`
  carries. It ships with a calendar view, a team-schedule timeline, a personal
  calendar, an upcoming queue and an interaction-history list, all reachable from
  a new **Activity** section in the navigation.

  **Attendees are records, not a sentence.** `log_meeting` used to write the
  attendee list into a JSON string inside `sys_activity.metadata`, where no view
  could filter it, no dataset could group by it and no report could count it. The
  new `crm_event_attendee` junction stores one row per person — contact, lead,
  colleague or named external guest — each with its own response
  (accepted / declined / tentative) and organiser flag. "Meetings this rep
  attended" and "contacts who declined twice this quarter" are now ordinary
  queries.

  **A rep can log a call on anything they sell to.** `log_call`, `log_meeting`
  and the new `schedule_meeting` are registered on **lead, contact, account,
  opportunity and case** instead of on cases alone, and each one writes a real
  `crm_event` plus its attendee rows. The `sys_activity` row survives as the
  unified-timeline pointer, now with an ADR-0052 `source_object`/`source_id` drill
  to the event itself. `schedule_meeting` books a `planned` event; only a `held`
  one counts as contact.

  **Interaction recency finally has a writer — it had none.** `at_risk_accounts`
  and `customer_churn_signals` are built entirely on
  `crm_account.last_activity_date`, and that column was permanently null, for two
  independent reasons that both had to be fixed:

  - The only writer bubbled to the record the task _named_. A rep names the
    opportunity or the contact, never the account, so the account's clock never
    moved. Both bubbles now walk **up** from a contact, opportunity or case to the
    account above it.
  - Even a direct write was silently discarded. `last_activity_date` and
    `crm_lead.last_contacted_date` were `readonly`, and the engine strips a
    readonly key from every non-system write whose caller supplied it (#2948) — a
    hook runs as the acting user, so every bubble the app ever performed was
    dropped with a warning nobody read. **Migration:** both fields are now
    writable metadata rather than readonly; they remain absent from every form
    section, so nothing about the editing surface changes.

  `crm_contact` gains `last_contacted_date` for the same reason — the record a rep
  actually calls had no recency of its own — and `send_email` now stamps it, along
  with the account above the recipient.

  **Activity has numbers for the first time.** A new `event_metrics` dataset
  (activities, minutes, average duration, by rep / type / week / related record)
  powers a new **Sales Activity** dashboard: interactions logged, meetings booked,
  customer minutes, activity by rep, weekly volume, activity mix, interactions on
  deals, and accounts quiet for 30 / 60 / 90 days. The dashboard is also the first
  consumer of the `task_metrics` dataset, which had shipped with no widget using
  it at all.

  **The activity actions are on the record header, not just the row menu.** The
  lead, opportunity and account detail pages are custom pages, and a custom page
  replaces the synthesized record header — so an object-scoped action it does not
  name is unreachable from the record itself. All three now list **Log a Call**,
  **Log a Meeting** and **Schedule a Meeting** in their header. (The case page's
  action set is a deliberate curation and is unchanged.)

  **Booking a meeting collects a date and a time, not a single "Starts At".**
  `schedule_meeting` asks for **Start Date (UTC)** and **Start Time (UTC)** and
  joins them into the stored instant. This is a workaround for a platform defect
  (objectstack-ai/objectstack#5061): an action param declared `datetime` is
  rendered by the Console as a zone-less `datetime-local` input and posted raw,
  which the runtime's param validator rejects — so _no_ value a user could type
  was submittable, and the action failed with a 400 every time. `date` and `time`
  are the two param types whose native pickers emit exactly what the validator
  accepts. The wall clock is read as UTC, which is why both labels say so; when
  the platform fix lands this collapses back to one `datetime` param interpreted
  in the user's own timezone.

- 0f5e9e2: Accounts, contacts, opportunities, quotes, contracts and cases now accept file
  attachments. Each of those records grows an **Attachments** panel — upload a
  signed MSA onto the account, the proposal onto the deal, a screenshot onto the
  case — with per-row download and delete. Leads are deliberately left out:
  unqualified leads arrive in volume and an attachment surface on them mostly
  collects junk; everything a lead converts into does accept files.

  Attachments carry no permissions of their own — they inherit the record's, and
  the platform enforces that on every path: uploading requires edit access to the
  parent record, the file list is intersected with the records the caller can
  actually read, deleting is limited to the uploader or someone who can edit the
  parent, and the download URL is refused (403) to anyone without record access
  and (401) to anonymous visitors. Sharing a record therefore carries its files
  along, and no profile needed a new grant.

  Record comments needed no change: the platform's `enable.feeds` capability is
  opt-out and already on, and the Discussion feed on accounts, opportunities and
  cases was verified in a live console to render, accept a post and persist it.
  New guide: **Files & comments** (`/docs/guides/files-and-comments`), in all
  three doc locales. Refs #602.

- bdad2b2: Grant the six objects that shipped with no permissions at all, so Knowledge,
  Forecasts, Competitors, line items and campaign members are usable.

  Permission sets are explicit-allow only: an object that appears in no set is
  refused for **every** user, administrators included, because the object-level
  CRUD gate runs before OWD, sharing rules or _View All Data_ are consulted.
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
  - **Campaign write policies for marketing.** The platform's `member_default`
    set owner-gates all updates (`created_by == current_user.id`), and RLS
    policies are OR-combined — so marketing's declared campaign edit only reached
    campaigns the user personally created, and "Add to Campaign" (a write derived
    from the campaign) was still denied. The `marketing_user` set now carries
    update policies for `crm_campaign` and `crm_campaign_member` that make the
    declared grants real. Verified end-to-end against a running server: enrolment
    succeeds as a marketing user and stays denied for sales reps.
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

- 3e0e4e6: Hand the billing system a real event when a deal is won and when a contract is
  activated, and write down where HotCRM's revenue scope ends.

  Quote-to-cash used to dead-end silently. `crm_contract` carried
  `billing_frequency` and `payment_terms` that nothing consumed, and there was no
  integration point at which an external billing or ERP system learned that a deal
  had closed. Two new record-change flows close that gap:

  - **`billing_handoff_closed_won`** — on the transition **into** `closed_won`,
    POST `crm.opportunity.closed_won` with the deal, its account and its line
    items.
  - **`billing_handoff_contract_activated`** — on the transition **into**
    `activated`, POST `crm.contract.activated` with the contract (including the
    two previously consumer-less billing fields), its account, and the originating
    deal's line items.

  Both go out through the platform's durable outbound-HTTP outbox — the builtin
  `http` node with `durable: true`, which enqueues on `sys_http_delivery` and
  inherits retry with backoff, dead-lettering, HMAC-SHA256 signing and the
  per-delivery `X-Objectstack-Delivery` id receivers dedupe on. Delivery is
  at-least-once; the _event_ fires exactly once per crossing.

  The transition wording is the whole design, not a detail. A won deal keeps being
  saved afterwards — a PO number, an owner change, a tidied description — so a
  hand-off conditioned on "is currently won" tells billing to bill the same deal
  again on every edit. Both start conditions test `record.x == v && previous.x != v`
  with the `previous` term guarded fail-closed, the idiom
  `opportunity_won_alert` already uses on this object, and
  `test/flow-billing-handoff.test.ts` pins the difference by removing that term
  and watching a second delivery appear.

  No Order, Invoice or Payment object was added, and none is planned: HotCRM owns
  lead → contract, and billing, collections and revenue recognition stay outside
  it. `content/docs/revenue/billing-handoff.mdx` (with its `zh-Hans` / `zh-Hant`
  siblings) states that boundary, the payload contract, the delivery guarantees,
  and — plainly — that the endpoint and signing secret live in flow metadata read
  from `src/flows/_billing-endpoint.ts`, so repointing them is a build-time change
  (`HOTCRM_BILLING_ENDPOINT` / `HOTCRM_BILLING_SIGNING_SECRET`) and not an edit in
  Setup.

  The card originally asked for declared stack `webhooks`. That surface cannot
  carry either event: `WebhookSchema` is `.strict` and rejects `condition`,
  `filter`, `body`, `payloadFields` and `retryPolicy`; its `triggers` vocabulary is
  `create / update / delete / bulk_*` with no transition form; the auto-enqueuer
  matches on object plus trigger alone and ships a fixed change envelope with no
  account and no line items; and its dispatch is gated on the `realtime`
  capability, which this app does not require — so a `sys_webhook` row would be
  visible in Setup and never fire. A webhook named for closed-won that fires on
  every opportunity edit is a declaration that lies about itself, in the app other
  people copy.

  Fixes #600.

- b027ec0: Campaign members can now be **contacts**, campaign metrics recompute **live**, and the engagement-tracker fields nothing could ever write are **removed**.

  `crm_campaign_member` was the app's clearest case of metadata promising a
  capability the product does not have. It declared a seven-value engagement
  lifecycle — `sent → opened → clicked → responded → converted`, with `bounced`
  beside it — plus `first_opened_date` and `first_clicked_date` stamps. Exactly one
  of those values had a writer: the enrollment flow stamps `sent`. Nothing on the
  platform can produce the rest. `@objectstack/plugin-email` is transport-pluggable
  **outbound** delivery (`sys_email.status` is `queued | sent | failed`); there is
  no open/click webhook, no bounce ingestion and no tracking pixel anywhere in the
  installed runtime, so a marketing team reading this object was being shown
  engagement tracking that could never populate.

  Three things changed together, because they are one contract.

  **The trim.** `first_opened_date`, `first_clicked_date` and the
  `opened`/`clicked`/`bounced` statuses are gone, along with their entries in all
  four locale packs — ADR-0049's enforce-or-remove spirit rather than wiring a
  tracker the platform has no engine for. They come back the day a real tracking
  integration exists to write them.

  **The writers.** Every value that survived now has one that actually runs:

  | field / value                    | writer                                                                               |
  | -------------------------------- | ------------------------------------------------------------------------------------ |
  | `status: sent`                   | the enrollment flow, `create_campaign` (leads), `add_contact_to_campaign` (contacts) |
  | `status: responded`              | the new **Mark Responded** action on a campaign member                               |
  | `status: converted`              | `campaign_lead_conversion_refresh`, when the member's lead converts                  |
  | `status: unsubscribed`           | a rep on the member row — and it now round-trips                                     |
  | `response_date`, `has_responded` | the action, kept in lockstep by `campaign_member_lifecycle` on every write path      |

  Unsubscribing a member syncs `email_opt_out` back to that person's lead or
  contact. The app already honoured that flag in two places — the enrollment
  filter and the Send Email action — while nothing ever set it, so an unsubscribed
  person stayed enrollable by the very next campaign.

  **Contacts as members.** The enrollment flow gained a member-source choice
  (leads by qualification status, contacts by department) and the contact list
  gained an **Add to Campaign** selection action, mirroring the lead path. Until
  now `crm_campaign_member.crm_contact` was a lookup no writer populated, so
  campaigns could only ever reach leads — never the existing customer base.

  **Live metrics.** The completion-time snapshot is gone. Four triggers — a
  membership change, an opportunity's campaign attribution changing, a lead
  converting, and the campaign's own status moving — each recompute the whole
  metric block. Previously the only writer fired on the transition into
  `completed`, so every metric on every running campaign read 0 and
  `response_rate` rendered 0%, becoming accurate on the day the campaign ended and
  nobody was looking. `budgeted_cost` / `actual_cost` also moved into a form
  section of their own beside `roi`, which divides by `actual_cost`: they are
  manual-entry by design, and a manual field buried at the end of a seven-field
  row is a field nobody fills in.

  Fixes #597.

- d8f5eee: Give every case an SLA clock, from a priority × account-tier matrix, and move
  the first-response stamp to a single writer that every touchpoint passes through
  (#595).

  **The SLA matrix.** The app's entire SLA logic was one line — `critical` ⇒
  `sla_due_date = now + 4h` — so High, Medium and Low cases got no due date at
  all. That was not a cosmetic gap: `case_sla_monitor`, the hourly breach sweep,
  selects cases whose `sla_due_date` is in the past, and a blank date never is.
  Three of the four priorities could therefore not breach, not because the sweep
  excluded them but because they had no deadline to miss. `crm_account.tier` — the
  obvious driver, with four options declared on the account object — was read by
  nothing outside `src/views/account.view.ts`.

  `case_sla_defaults` now stamps `sla_due_date` on every case with a recognised
  priority, from a sixteen-cell table of hours:

  |              | Strategic | Enterprise | Mid-Market | SMB |
  | ------------ | --------- | ---------- | ---------- | --- |
  | **Critical** | 4         | 4          | 4          | 4   |
  | **High**     | 6         | 8          | 8          | 8   |
  | **Medium**   | 24        | 36         | 48         | 48  |
  | **Low**      | 96        | 120        | 168        | 168 |

  The **Critical row is flat at four hours deliberately**. Every critical case used
  to get four hours whatever the account, so letting tier stretch that row would
  have _removed_ a deadline from work that already had one; flat keeps the change
  a strict superset — nothing loses a clock, three priorities gain one. No cell is
  looser than the per-priority target the docs have always published (High 8h,
  Medium 2 days, Low 7 days): the lowest tier gets exactly that and the higher
  tiers get tighter. An unreadable or unclassified account falls back to the `smb`
  column (the tier field's own default), because inventing a _tighter_ deadline
  out of a permission error would manufacture breaches; anonymous web-to-case,
  which can create a case and read nothing else, is the ordinary example. A
  priority the table has no row for still gets no due date, rather than a guessed
  one.

  **These are calendar hours, and the code and docs now say so out loud.** This
  app has no business-hours calendar, no working-day definition and no holiday
  list, and the platform ships no such service — so a P1 raised at 5pm on a Friday
  is due at 9pm that same Friday, and a Low case raised on the 23rd of December
  runs its week down over the holidays. The assumption is stated in
  `src/objects/_case-sla.ts`, in the hook body beside the numbers, on the case
  object's `sla_due_date` field, and across the SLA, cases, setup, FAQ and
  glossary pages in all three doc locales. The offset is also added as elapsed
  milliseconds rather than `setHours(getHours() + n)`, which does _local_ calendar
  arithmetic — on a DST-observing host that silently turned "+4 hours" into 3 or 5,
  and a 168-hour clock crosses a transition twice a year by construction.

  The table is written twice on purpose — `src/objects/_case-sla.ts` for the seed
  generator, and a hand-copied mirror inside the hook body, because L2 hook bodies
  run body-only in the QuickJS sandbox and a module constant arrives there as
  `undefined`. `test/case-sla-matrix.test.ts` pins all sixteen cells by driving the
  shipped handler, so neither copy can move without the other.

  Seeded case due dates are now derived from the matrix and the seeded account's
  tier instead of being hand-typed, and `test/seed-consistency.test.ts` re-derives
  them. Demo cases older than their target are consequently past due — which is
  what a breach is, and what the hourly sweep exists to notice.

  **First response.** `crm_case.first_response_date` was stamped from the
  `log_call` / `log_meeting` action body, so it was written only when an
  interaction was recorded through those two buttons; an event created any other
  way left the metric null, under a comment asking every future author to remember
  to stamp it too. The stamp now lives in `event_activity_bubble`
  (`src/objects/event.hook.ts`), which already fires on exactly the right
  condition — a `crm_event` on its transition into `held` — and already resolves
  `related_to_case`. Both actions still stamp the case, because their body writes
  the event this hook watches; they simply no longer each carry a copy of the rule.
  Two writers racing on a "first" timestamp is how it becomes a "last" one.

  Two things are still deliberately not a first response: a **status change** (an
  agent can move a case to _In Progress_ and investigate for an hour while the
  customer hears nothing) and a meeting merely **booked**, which is `planned`
  rather than held.

  **Not included:** escalation still does not reassign. The flow-template
  dot-walk limitation that blocks it is unchanged, and routing a case to the
  `service_manager` pool needs a transfer grant and a re-entrancy story of its own;
  it is filed as follow-up work rather than bolted on here.

- 5365ac8: Service agents can now take a case out of the **Unassigned — triage** tab, completing the queue-pull story #1134 opened.

  Moving an unowned, open case into a worked status (**In Progress**, **Waiting on Customer**, **Waiting on Support**) now makes the person who moved it its owner. The case leaves the triage tab, the triage share that made it visible evaporates, and it appears in **My Cases** — no admin hand-off in between.

  The claim is deliberately narrow. It fires only on a case that currently has no owner and is not closed, and the owner written is always the caller: assigning a case to somebody else, or taking one that already has an owner, remains refused as before and needs the transfer grant that service agents do not hold. Escalation is unaffected — that transition still routes the case to the service-manager pool. Automated and system writes never claim, so an ownerless case stays in triage until a person picks it up.

- 540e488: Enforce-or-remove, decided per field: nine inert fields are gone, and the
  account hierarchy is now a real roll-up.

  A consumer scan found ten declared fields that nothing in the product read or
  wrote. Each got its own verdict rather than one verdict for the batch. The
  common thread in the nine removals is that none of them looked absent — they
  looked wired, which is the shape that misleads the next author into building on
  them.

  **Removed from `crm_product`:**

  - **Quantity on Hand** and **Reorder Point**, with the **Low Stock** list view
    and its **Low Stock** tab. Nothing ever decremented stock, and the view was
    not the report it looked like: its filter compared quantity against a
    hardcoded `10` rather than each product's own reorder point. HotCRM sells from
    a catalog; stock belongs to the fulfilment system that owns it.
  - **Taxable**. No quote or line item ever consulted it —
    `crm_quote_line_item.tax_rate` defaults to `0` and is typed per line — so
    clearing the flag on a zero-rated product changed no total anywhere.
  - **Billing Type** and **Unit of Measure**, and the seeded values on all 13
    demo products. The docs said billing type "drives how the quote calculates
    totals"; no quote total, revenue report or line-item behaviour ever read it.

  **Removed elsewhere:**

  - `crm_case.customer_signature` — a signature pad on the resolution form that
    no close-case step, SLA measure or export ever read back.
  - `crm_case.parent_case` — a case hierarchy nothing traversed: no rollup, no
    cascading close, no related-case handling.
  - `crm_task.estimated_hours` / `actual_hours` — no rollup summed them, no
    variance report compared them, nothing warned when actual overran estimate.
  - `crm_contact.reports_to` — the org chart the contact docs described as "a
    clickable tree on the account detail page" that the Copilot "uses when
    summarising the account". Neither existed: no page rendered it and no skill
    read it.
  - `crm_contact.birthdate` — importable, read by nothing. Personal data held for
    no stated purpose is a liability rather than a feature.
  - `crm_campaign.parent_campaign` — campaign hierarchy, mentioned in no doc and
    read by nothing. Its honest consumer would be a rolled-up ROI, which cannot
    be one declaration: `roi` is a formula over each campaign's own cost and
    revenue, so a hierarchy ROI would put two differently-scoped ROI numbers on
    one record.

  **Kept and enforced — `crm_account.parent_account`:**

  The hierarchy stays, and now does something. `crm_account` gains **Child Account
  Revenue** (`child_account_revenue`), a roll-up of the **Annual Revenue** of an
  account's **direct** children, maintained by the platform: it moves when a
  child's revenue is edited, when a child is re-parented, and when a child is
  deleted. This is the roll-up the accounts documentation already promised and
  never had. It is one level deep — a grandparent totals its own children, not the
  whole tree — and it is on the account form's **Financials** section.

  **Migration — what changes for users:**

  - **Product → Low Stock** view and tab are gone, as are the _Inventory
    tracking_, _Billing types_ and _Units of measure_ sections of the product
    documentation. Values previously stored in the five removed product fields are
    dropped with the columns; export them first if your org typed anything into
    them by hand.
  - The **contact import template** no longer accepts a `Birthdate` column. A file
    that still carries one will have that column ignored — re-cut your template
    from _Guides → Importing your data_. The **account** template is unchanged and
    still carries `Parent Account`.
  - The case form loses **Parent Case** (SLA tab) and **Customer Signature**
    (Resolution tab); the task form loses **Estimated Hours** and **Actual
    Hours**; the contact form loses **Reports To** and **Birthday**; the campaign
    form loses **Parent Campaign**. Any values held in those columns are dropped
    with them.
  - Accounts gain a read-only **Child Account Revenue** on the _Financials_
    section. It is computed, not typed, and is blank (zero) for an account with no
    children.
  - The account hierarchy still does **not** cascade sharing — it never did, and
    the accounts page said otherwise until now. Use the sharing rules under
    _Administration → Sharing_ for that.

  Authorized by the maintainer ruling of 2026-08-17, 「逐个 enforce-or-remove
  （推荐）」: a declared-but-unenforced field ends the card either genuinely
  enforced or genuinely gone.

- c83aa74: **Do Not Call is now enforced.** The `Do Not Call` checkbox on a lead or contact
  recorded a person's wishes and nothing acted on it — the app honoured its email
  twin, `Email Opt Out`, in three places while the phone flag was a marker only.

  HotCRM now refuses to **schedule** a phone touch against a flagged person: an
  open **Call** task and a **planned** _Call_ calendar event are both rejected on
  save. The refusal sits on the write rather than on a button, so it covers every
  way in — the Schedule Follow-up screen, a hand-created task, a data import and
  the API alike — instead of only the ones that go through the Console.

  **Recording a call that already happened is deliberately still allowed.** The
  **Log a Call** action, a _Call_ task saved as **Completed**, and a _Call_ event
  saved as **Held** are never blocked: refusing them would hide the evidence of a
  call rather than prevent one, and would penalise the rep who logs it honestly.

  The flag stays scoped to the phone. Meetings, demos and email are untouched —
  **Schedule a Meeting** still books a meeting with a flagged person, because
  someone who will not take calls may still meet in person or over video, and
  email is governed by its own `Email Opt Out` flag.

  Existing records are unaffected; nothing is migrated or rewritten. A team that
  has been using the checkbox as a private note will start seeing the new
  rejection when they schedule a call, and can clear the flag on the record to
  proceed.

- ff1ef78: Escalation now changes hands: an escalated case is routed to the least-loaded
  holder of the `service_manager` position.

  Until now an escalated case changed hands with nobody. `case_escalation`,
  `case_escalation_on_create`, `case_sla_monitor` and the `escalate_case` screen
  flow all write the same four fields — `is_escalated`, `escalation_reason`,
  `escalated_date`, `status` — and none of them touched `owner_id`, so the agent
  who could not get to the case in time was still the only person who could work
  it. Since every priority carries an SLA clock, considerably more work was
  landing in **Escalated Cases** still owned by whoever was already behind on it.

  - **The hand-off.** A new `case_escalation_reassign` hook (`beforeUpdate` on
    `crm_case`, composed from `src/objects/_case-assignment.ts` — the single home
    for "who should own this case") moves the case to the holder of the
    `service_manager` position with the fewest open (neither `resolved` nor
    `closed`) cases. Least-loaded is self-balancing, so consecutive escalations
    spread across the team with no rotation counter to keep. Positions are flat,
    so the target is a POOL and not "the owner's manager": there is no reporting
    line to walk, and a flow could not do this at all —
    `{caseRecord.owner_id.manager}` interpolates to the literal `undefined`.
  - **It costs no permission change.** The hand-off rides on the escalation
    update itself rather than issuing a second write, and that seam is invisible
    to the platform's `allowTransfer` guard — measured, with a negative control
    and the opposite reading for the `ctx.api` shape, in
    `test/case-assignment.test.ts`. `crm_case.allowTransfer` is NOT granted to
    any new profile; `service_agent` still holds transfer on `crm_task` alone.
  - **It cannot loop.** Because it performs no operation of its own there is no
    second `record-after-update` for `case_escalation` or
    `case_status_side_effects` to re-fire on, and its predicate is the escalation
    TRANSITION rather than the `is_escalated` state that wedged a first-boot seed
    on 2026-07-06.
  - **Three deliberate no-ops:** an unstaffed pool (the first-install norm — the
    case keeps its owner and the escalation completes), a case already owned by a
    pool member, and a write that names an owner itself. A denied pool read is
    swallowed for the same reason: reassignment must never reject an escalation.
  - **The docs and the notification no longer say the opposite.** The escalation
    notice said `It remains assigned to you.`; it now states the rule and points
    at the record, so it is true whether or not the pool is staffed. The
    "the case is not reassigned" paragraphs in `content/docs/service/cases.mdx`,
    `content/docs/service/index.mdx`, `content/docs/service/sla-and-escalation.mdx`
    (each in all three locales), `content/docs/administration/automation.mdx` and
    the in-app `src/docs/crm_service.md` / `src/docs/crm_admin.md` were rewritten
    against the new behaviour — including `crm_admin.md`'s claim that critical
    cases reassign to "the owner's manager", which was never true.

- 66fa27f: Forecasting now produces real data. HotCRM documented a nightly forecast job for
  several releases, but nothing anywhere actually created a forecast snapshot — the
  Forecast object, the attainment and coverage formulas, the Forecast Metrics
  dataset and the dashboard's "Quota Attainment by Rep" table all ran on three
  hand-seeded demo rows, so on a live org the whole forecasting story was empty.

  The new **Forecast Snapshot** scheduled flow runs nightly at 03:00 and writes one
  current-quarter snapshot per active opportunity owner: open pipeline, best case,
  commit and closed-won totals, aggregated from that owner's opportunities closing
  inside the quarter. Re-runs refresh the same row rather than adding another, so a
  snapshot tracks the pipeline down as well as up, and `quota` is never touched —
  it stays hand-maintained until a quota model exists.

  Two supporting changes make that possible and honest:

  - The Forecast object now derives `period_start` (alongside the `period_end` and
    `period_label` it already derived), so any writer can ask for "this quarter"
    and get a calendar-true window instead of hand-computing a boundary and
    drifting off it.
  - `best_case_amount` and `commit_amount` are documented as what they now
    measure: the deal's stored **Forecast Category**, the same boundary the
    "Closing This Quarter" list view and the pipeline-by-category chart use. The
    old field descriptions named probability thresholds that no writer applied and
    that disagreed with how deals are actually categorised.

- 557dd5f: Bring your own data: import mappings and starter spreadsheets for accounts,
  contacts and leads.

  HotCRM now ships three reusable import mappings — `crm_account_import`,
  `crm_contact_import` and `crm_lead_import` — plus a 50-row template CSV for each
  under `assets/import-templates/`. Name the mapping in the import request
  (`mappingName: 'crm_account_import'`) and the columns a normal spreadsheet export
  carries land without any per-column mapping: names, phone, website, revenue,
  headcount, industry, lead source, contact mailing address, and an owner-email
  column resolved to the matching user. Foreign vocabulary is translated on the way
  in (_SaaS_ → Software / SaaS, _Trade Show_ → Event / Trade Show, _Working_ →
  Contacted); anything still unrecognised fails its row instead of being silently
  dropped.

  All three write in `upsert` mode — accounts keyed on name, contacts and leads on
  email — so re-running a corrected file updates rather than duplicates. Leave the
  owner column blank and the importing user owns the records; an owner email that
  matches no user fails that row rather than guessing.

  The new guide **Guides → Import your own data** walks through a dry run
  (`dryRun: true`, plus `runAutomations: false` for the strict required-field
  report), the background job endpoint, and rolling a bad import back with
  `data.undoImportJob`. Addresses land for contacts only — accounts and leads store
  one structured address field that cannot be assembled from separate spreadsheet
  columns, which the guide states.

- 083e7d2: A case can now record **which article resolved it**, the Service dashboard measures **knowledge deflection** from that link, and the article's helpful / not-helpful counters finally have a writer. The counter that could never get one is removed.

  **The link that was missing.** The only case↔knowledge relationship pointed the wrong way: `crm_knowledge_article.related_to_case` records the case an article was _written from_. Nothing could record _"this article resolved this case"_, so the single question a knowledge base exists to answer — is it saving us work? — had no data behind it. `crm_case.resolved_by_article` is that direction. Both links stay: an article usually has one origin and many resolutions, and merging them would make each unanswerable. It is offered on the **Close Case** screen and editable on the record at any time.

  **The metric.** `case_metrics` gains `closed_count`, `kb_resolved_count` and a `kb_deflection_rate` ratio, and the Service dashboard shows the rate with **both of its halves printed beside it** plus a **Top Resolving Articles** ranking. A wrong denominator never errors — it returns a plausible number — so the two halves are declared once on the dataset rather than improvised per widget, and the numbers are pinned by running the shipped measures through the real analytics executor on both drivers, perturbing one case at a time.

  One trap is worth knowing because it is invisible: a close-case screen field left empty resumes as `''`, not as absent, and `count(column)` counts empty strings. Every case closed _without_ an article would have landed in the numerator and the rate would have read 100%, silently. `case_resolution_article_normalize` nulls the blank at write time, so the stored data is right for every reader rather than one measure being taught to discount it.

  **The counters.** `helpful_count` and `not_helpful_count` were `readonly` with no writer anywhere — structurally pinned at whatever the demo data said. Published articles now carry **Helpful** / **Not Helpful** buttons that record one `crm_article_feedback` row per reader, and the two counts are **recounted** from those rows on every change. Recount rather than increment: it is idempotent, it self-heals when a vote is withdrawn or edited, and concurrent votes converge instead of losing one. One vote per reader per article, so the numbers mean _how many people_ — change your mind and your own verdict moves rather than adding a second.

  **`view_count` is gone.** It had no writer either, and unlike the other two it can't honestly get one: the only read-side event available (`afterFind`) fires on record materialization for _every_ query — the article grid, global search, the lookup picker, AI grounding — so a "Views" number would grow fastest for articles nobody opens, at the cost of a database write on every read. A field that looks like a measurement and is not is worse than a missing one; it returns when a real article-view surface exists to write it.

  **What you'll notice:** the article's _Views_ column and field are gone from the grid, the review queue and the detail page. Seeded vote counts (38, 96, 5, 9) are gone too — they had no rows behind them, and the first real vote would have recounted 96 down to 1 in front of whoever pressed the button. A fresh `pnpm demo:reset` starts both counters at 0 and moves them for real; the deflection tiles do have seeded data, since a case naming its resolving article needs no user.

  **Public articles are unchanged.** Share-link publishing (scope item 3) is not in this release: `publicSharing.eligibility` — the key that would keep internal and draft articles unshareable — is read by no consumer on 17.0.0-rc.6, and this app has no reachable seam to enforce it, so declaring the block would have opened anonymous access to internal articles rather than public ones. Guest permissions are untouched, and _Public_ audience remains a statement of intent. Details in #601.

  Refs #601.

- 529248e: Large-deal governance now starts **at** $100,000, not above it

  A deal priced at exactly $100,000 used to be shared with the sales director and
  the executive as a large open deal, while requiring **no** manager approval and
  firing **no** large-deal-won alert: the two sharing rules cut at `>= $100,000`
  and the approval entry gate and won-deal alert cut at `> $100,000`. Leadership
  could see the deal; nobody had to sign it. A threshold set at a round number
  attracts deals priced at exactly that number, so this was not a rounding edge —
  "a hundred K" is how deals get quoted.

  All four large-deal sites now cut the same way, inclusively:

  - `opportunity_approval` entry gate, and its `opportunity_approval_on_create`
    insert twin — `amount >= $100,000`
  - `opportunity_won_alert` — `amount >= $100,000`
  - both opportunity sharing rules — unchanged, already `>= $100,000`

  **What changes for users:** an opportunity at exactly $100,000 now locks and
  routes for Sales Manager review, and fires the won-deal alert when it closes.
  Nothing that was previously visible to leadership stops being visible, and no
  deal that previously needed approval stops needing it — the change only widens
  governance by the boundary case. The $500,000 director tier is untouched, and
  so is the threshold value itself.

  The published tables in the Sales and Admin package docs now read
  "$100,000 or more" instead of "> $100,000".

- d4ddee0: Move the platform line to ObjectStack **17.0.0 GA** (from `17.0.0-rc.6`) and absorb
  the four behaviour changes that arrive with it. All 12 `@objectstack/*` entries move
  together, and `objectstack.manifest.json` `specVersion` / `objectstack.config.ts`
  `engines.protocol` follow the pin.

  Three of the four are invisible in the release's conventional-commit markers — the
  delta carries no `feat!` / `fix!` / `refactor!` at all — and each was measured on the
  two builds side by side rather than read off a changelog.

  **1. A `where` on a `formula` field now throws.** `assertFilterIsMaterializable` is new
  in `@objectstack/objectql@17.0.0` (absent at rc.6, with `assertListComparandShapes`,
  `lowerWhereFilterArray` and `INVALID_FILTER` as unchanged positive controls). Every
  call site that reaches it — `find`, `findOne`, `count`, `aggregate`, `update`,
  `delete` — can newly raise `400 INVALID_FIELD` for input it used to accept with a
  `200` and a wrong answer. **HotCRM is unaffected**: all 19 `Field.formula` fields
  across 12 objects were checked against every predicate surface in the app
  (`where:` on `ctx.api`, `filter:` in flow node config, saved-view and page-component
  `filter:`, in all four spellings the engine lowers) and **no predicate names a formula
  field**. No query changed; nothing needed denormalising.

  **2. `exportOptions` is now the object form `{ formats: [...] }`** (spec #8010,
  maintainer ruling 2026-08-12). The bare array HotCRM authored is the legacy spelling
  and still parses, but it _lifts_ at parse — so `z.input` accepts both while `z.output`
  only ever yields the object. The five list views now author the canonical form. This
  one was quietly dangerous: the `allowExport` coverage guard tested the legacy array's
  `.length`, read `undefined` on every surface, and reported 23 bulk-egress grants as
  gratuitous — an inverted security verdict, not a silent one. Grants and surfaces are
  unchanged; only the reader was wrong.

  **3. `PERMISSION_DENIED` now carries a localized end-user message.** The sentence
  naming the operation and object moved to `developerMessage`, the machine-readable
  facts to `details`, and `message` became a four-locale user-facing string from the new
  `BUILTIN_OPERATION_MESSAGES` table. Refusal assertions now read the ADR-0112 envelope
  (`code` + `status` + `details`) instead of message text.

  **4. `update()` on an id that matches no row rejects instead of resolving `null`**
  (`RECORD_NOT_FOUND` / 404; measured both ways with a live-id control). This one is a
  real behaviour fix, not just a test update: `mass_update_stage` iterates a selection,
  and an uncaught rejection on the first stale id left **every selected row behind it
  unattempted** — and because re-running aborted at the same row, the selection could
  never be covered from the UI at all. The body now records a miss per row and rejects
  once at the end, so live rows are written whatever their position in the selection and
  the error still names every id it could not update. The catch is deliberately
  cause-agnostic: a host rejection crosses the QuickJS boundary as `{ name, message }`
  only, so a body cannot test for `RECORD_NOT_FOUND` and must not sniff engine wording.

  Also verified clear on GA, by measurement rather than assumption: all 18 objects
  author `sharingModel` (the new `security-owd-unset` door publishes them all), and no
  `viewKind` / `defineViewItem` usage exists for the `views:`-container-only tighten to
  reject.

- 49f34e5: Enforce a hard ceiling on quote discounts, and give "large deal" one definition.

  **Discount ceiling.** `crm_quote` gains `discount_within_ceiling`, an
  error-severity script validation refusing any quote whose **Discount %** exceeds
  **60**. This narrows the accepted surface: a save that previously succeeded at
  70% now comes back `VALIDATION_FAILED` with _"Discount cannot exceed 60%"_, and
  nothing is written. The rule replaces `valid_discount`, which cut at `> 100` and
  could never fire — field bounds are evaluated before object validations, so the
  field's own `max: 100` already refused every input that could have reached it.

  It is an **invariant**, not a transition gate: it is evaluated against the merged
  record on every write, so a row stored above the ceiling is refused on any edit
  until its discount is brought back under the line (always allowed). That is the
  deliberate difference from `requiredWhen`, which #1069 measured as reaching only
  the write that enters the gated state. HotCRM's seeded data is unaffected — the
  deepest discount it ships is 20%.

  **One "large deal".** The threshold was written as four independent literals
  across three files (the approval entry gate, the won-deal alert, and both
  large-deal sharing rules), plus a second tier stated twice for the director step.
  All of them now interpolate `src/objects/_thresholds.ts`, and
  `test/deal-threshold-parity.test.ts` reads the shipped metadata back and fails if
  any site stops agreeing. No threshold value changes, so no routing, alerting or
  sharing behaviour changes with it.

  The discount-triggered approval routing proposed alongside this is deliberately
  not included; the quotes documentation, which described that routing as if it
  already existed, now states the shipped rule instead.

- 379b327: Remove two demo-only features that #532's squash merge carried in alongside
  the license fix: the contract status kanban board and the competitor
  management module (object, views, nav entry, seeds, translations, and the
  multi-value `crm_competitors` lookup on opportunities — the opportunity
  object returns to its previous hardcoded `competitors` select). Both were
  built as recording aids for a demo video series and were not meant to land
  upstream. The dashboard dateRange fix from the same squash (#499) stays.
- f0d3a05: Duplicate leads are now recorded instead of rejected. `crm_lead.email` no longer
  carries a `unique` constraint: a returning prospect who fills in the Web-to-Lead
  form a second time was previously refused by the DATABASE, which turned an
  ordinary follow-up enquiry into a save error on a public page. Real funnels
  re-capture the same address routinely, so a repeat is a fact to record, not an
  error to raise.

  What replaces it is a soft check plus an explicit verdict:

  - **At intake**, `lead_duplicate_check` normalizes the address (trim +
    lowercase, matching what `crm_contact` already does) and links a re-captured
    one to the record it repeats — an existing contact if the person already
    became one, otherwise the oldest open lead with that address — marking it
    `Duplicate Status: Suspected`. It only ever writes when no verdict is present,
    so a human decision is never overwritten, and it is best-effort: an anonymous
    submission that cannot read CRM data still lands, just unflagged.
  - **At disqualification**, closing a lead with reason `Duplicate` now requires
    naming the surviving record (`Duplicate Of` + the matching lookup) and setting
    `Duplicate Status: Confirmed`. That is declarative metadata — one validation
    rule and two `requiredWhen` predicates on `crm_lead` — so the requirement holds
    on every write path, not only in the UI. The `duplicate` reason previously led
    nowhere: nothing recorded what a lead was a duplicate OF.

  A **Suspected Duplicates** list view is the queue for reviewing the flags, and
  `crm_lead.email` keeps a plain (non-unique) index, since the field-level
  `unique: true` was what indexed the column and the intake lookup, the
  `crm_lead_import` upsert key and the conversion flow all read leads by email.

  **Upgrading an existing deployment.** Every HotCRM install today is a fresh one,
  where the database is built from current metadata and the old
  `uniq_crm_lead_organization_id_email` index is simply never created. If an
  installation with an existing populated database ever needs this version, drop
  the leftover unique index with one `os migrate apply --allow-destructive` run;
  until that runs, the database still rejects the second lead even though the
  metadata permits it. Note that this step is **one-way**: once duplicate
  addresses exist in the table, re-declaring `unique: true` cannot rebuild the
  index.

  Refs #598.

- 4a0e1de: Service agents can now see the unassigned cases they are supposed to triage
  (#1096).

  The **Unassigned — triage** tab shipped pinned in every Cases list, including
  the agent's — and returned nothing to the one persona it was built for. Service
  agents hold Cases with own-record scope, and a case that arrives with no owner
  is owned by nobody, so it matched no agent's scope. Administrators and sales
  managers could see the intake backlog; the service team could not. That is the
  normal state on a new org rather than an edge case: automatic round-robin
  assignment stands down whenever nobody yet holds the Service Agent position, and
  it stands down on the anonymous web-to-case path, so those submissions land
  ownerless by design.

  A new built-in sharing rule — **Unassigned Cases — Triage** — grants every
  holder of the Service Agent position edit access to open cases with no owner.
  The grant is self-limiting: it applies only while a case is unowned, so the
  moment the case has an owner it falls back to ordinary own-record scope and the
  share is withdrawn. No persona gains sight of a case that already belongs to
  someone else, and a closed case with no owner stays out of triage — that is
  history, not backlog.

  ⚠️ **Claiming a case from triage is not yet possible, and this release does not
  change that.** Case ownership is system-managed: reassigning it requires a
  transfer permission that the Service Agent profile deliberately does not carry,
  and the platform applies that rule even when an agent assigns an unowned case to
  themselves. Agents can now open, work, annotate and prioritise the backlog they
  could not previously see; moving a case into their own name still needs an
  administrator, or a manager who holds the transfer grant. The remaining half is
  tracked on #1096.

  Administrators: the new rule appears in **Setup → Sharing Rules** alongside the
  existing ones, and is documented in _Administration → Sharing & Security_.

- 5a11631: Upgrade HotCRM to ObjectStack 17.0.0-rc.2, and migrate the six places where the
  rc.1 → rc.2 window changed what the platform does with metadata this app already
  had. Four of them were live defects, not tidy-ups — each is verified against a
  booted server and a real browser session, not only against the unit harness.

  **`demo_bootstrap` could no longer find its user.** The sweep opened with
  `get_record(sys_user)` and an empty filter, which `findOne` used to answer with
  an arbitrary row. 17.0.0-rc.2 refuses a `findOne` that names no record (#4419),
  so the flow failed on its second node and every seeded record stayed ownerless —
  "My Leads", "My Deals" and "My Cases" empty for everyone, and every owner-addressed
  `notify` reaching nobody. The read is now an explicit `find` whose first row is
  bound by an `assignment` node, which states the arbitrary pick instead of
  smuggling it through a call that claimed to name one. FROM `filter: {}` TO
  `limit: 2` + `firstUser = {userList.0}`, with `has(vars.firstUser)` guards on the
  branch so a zero-user org still completes.

  **`lead_conversion` could no longer convert a lead.** rc.2 holds a screen resume
  to the screen's declared field contract (#4477), and `createOpportunity` — a
  checkbox with `defaultValue: false` — was marked `required`. A runner that posts
  only what the user touched left it out, and the resume was refused outright with
  `INVALID_SCREEN_INPUT`. A checkbox has no unanswered state, so the flag is gone;
  the default and the `init_defaults` assignment supply the answer, as they always
  actually did.

  **Nine `decision` nodes carried an inert copy of their branch predicate.** rc.2
  flags it (`flow-inert-node-condition`, #4414): the engine reads the out-edges, so
  a second copy on the node restates the gate without being the gate, and a copy
  that drifts is a lie about what the flow does. The copies are deleted and the
  totality rationale moved to the edges that decide. Behaviour is unchanged — the
  edges always were the live sites.

  **`translation.validationMessages` is removed** from all four locale bundles.
  rc.2 retires the key (#4667); the three messages under it matched no rule in this
  app and had never been read.

  Two pinned "platform gap" assertions flip because the platform closed the gap,
  which is what they were written to detect: a filtered measure that selects nothing
  now reports `0` rather than nothing at all, so a lead source that only ever lost
  reads **0%** instead of blank (#4708); and a bare-string condition inside a `loop`
  body is now CEL-parsed like its envelope twin (#4336). The explicit envelopes stay
  — they say which dialect a predicate is in, and they keep these flows correct on a
  runtime that still carries the old path.

  Finally, validation predicates now fail **closed** (#4649) — the upstream question
  `test/object-validation-predicates.test.ts` filed, answered. An unevaluable
  predicate used to be skipped silently; it now rejects the write. HotCRM's
  predicates are already total, so nothing changes at runtime, but the house rule in
  AGENTS.md and that file now describe the outcome an author actually gets.

- c2b2820: Upgrade HotCRM to ObjectStack 17.0.0-rc.1. The app now declares protocol 17
  compatibility, preserves existing required-field database constraints explicitly,
  uses the live metadata contracts for skills, flows, and APIs, and enables the
  date buckets that make CRM analytics aggregate by month, day, and quarter.

  Also completes the 17.0 permission migration that the version bump alone leaves
  half-done: `allowExport` became an opt-in bit whose absence DENIES, so every
  CSV/XLSX list export and every report export is authored explicitly on the
  profiles that need it. Approval nodes drop their hand-rolled org-owner backstop
  for the native `onEmptyApprovers` policy, media fields declare the `accept` and
  `maxSize` constraints 17.0 enforces server-side, and the platform-upgrade
  checklist now covers the `os migrate` data gates.

### Patch Changes

- 944de7b: Make the customer-account delete guard agree with itself when exactly one
  opportunity blocks. The refusal switched its noun on the count but left the verb
  and the closing pronoun plural, so a single open deal produced:

  ```
  DELETE /api/v1/data/crm_account/<id>
  → 400 "Cannot delete customer account: 1 open opportunity still reference it.
          Close or reassign them first."
  ```

  Both halves were wrong for one record — "still reference" for a singular subject,
  and "them" pointing at a single opportunity the reader then has to go and find.
  The plural case was already correct and reads the same as before. Now:

  ```
  1 blocker  → "Cannot delete customer account: 1 open opportunity still
                references it. Close or reassign it first."
  2 blockers → "Cannot delete customer account: 2 open opportunities still
                reference it. Close or reassign them first."
  ```

  Wording only — the guard refuses exactly the same deletes, counts the same open
  opportunities, and names the same account. The two sentences are now written out
  per branch in `src/objects/account.hook.ts` rather than stitched from a noun
  suffix, because agreement here runs across three words at once, and both are
  measured end-to-end against a real kernel in
  `test/cascade-guard-messages.test.ts`. Refs #721.

- 8b26082: Account names are now unique **per organization** instead of platform-wide, so two organizations can each have an "Acme Corp".

  `crm_account` was the last core object still spelling uniqueness as a table-level
  declared index — `indexes: [{ fields: ['name'], unique: true }]`. A declared
  index is materialized over exactly its `fields`, i.e. platform-wide, while
  field-level `unique: true` has been tenant-scoped since framework #3696. The
  physical constraint was therefore `UNIQUE (name)`, and the SECOND organization to
  create an account called "Acme Corp" was refused by the database. Account name is
  also the seed data's external-id / upsert key, so this bit on the very first
  multi-tenant install, before anyone had typed a record.

  The declaration moves onto the field, matching `crm_contact.email` and
  `crm_product.sku`, and the table-level entry is **removed** rather than kept
  alongside it: declaring both leaves the platform-wide index enforcing the old
  behaviour and the per-tenant composite unreachable (framework#3991
  `unique/double-declaration`) — the fix would have looked applied and done
  nothing. A freshly migrated database now carries
  `uniq_crm_account_organization_id_name (organization_id, name)`, which also
  indexes the column for `searchableFields` and the seed upsert.

  Uniqueness within one organization is unchanged: a second "Acme Corp" in the same
  org is still rejected.

  **Upgrading an existing deployment.** Every HotCRM install today is a fresh one,
  where the database is built from current metadata and the platform-wide
  `uniq_crm_account_name` index is simply never created. If an installation with an
  existing populated database ever needs this version, the old index must be
  dropped with one `os migrate apply --allow-destructive` run: it is strictly
  tighter than the new composite, so while it survives it keeps enforcing the
  platform-wide rule and **this fix silently does nothing**. The boot-time
  reconciler creates the new index (`create_index`, `safe`) but skips the drop
  (`drop_index`, `destructive`) — see `docs/MAINTENANCE.md` §3.1.

  Note that account names are matched exactly, so `Acme Corp` and `ACME  Corp` are
  two different accounts; the user documentation no longer claims otherwise.

  Fixes #625.

- 649b15a: Translate every action label in all four locales, and guard the class with a
  test. Three actions (`enroll_leads`, `schedule_followup`, `generate_quote`) had
  no label entry in any locale pack, so they rendered their English code label in
  zh-CN / ja-JP / es-ES; `log_meeting`'s zh-CN translation sat in a dead top-level
  `globalActions` block instead of under `crm_case._actions`, where the action's
  `objectName` puts it. Adds two assertions to
  `test/metadata-references.test.ts` — every action needs a label in every locale,
  and `confirmText` / `successMessage` must be translated wherever the action
  declares them — so this class fails in CI instead of in a demo. Refs #494.
- bdfa374: Point the Activities page at the dashboard that actually reports activity volume.

  `content/docs/sales/activities.mdx` (and its zh-Hans / zh-Hant siblings) promised
  an **"Activities per rep this week"** widget on the **Sales Dashboard**. All three
  parts of that sentence were wrong, so a reader following it found nothing:

  - The sales dashboard (`sales_dashboard`, labelled **Sales Performance**) has no
    activity widget of any kind — every one of its fifteen widgets is bound to
    `opportunity_metrics` or `forecast_metrics`.
  - Activity volume lives on a different dashboard entirely, **Sales Activity**
    (`sales_activity_dashboard`, shipped with #592), whose per-rep widget is called
    **Activity by Rep**.
  - **Activity by Rep** is not windowed to a week. Sales Activity deliberately ships
    no date-range picker at all, and the week-by-week read is a separate chart,
    **Activity Volume by Week**.

  The row now names the real dashboard and the real widget, and says what the widget
  actually counts: logged interactions per owner — events that reached **Held**, so
  the calls and meetings that really happened, _not_ tasks. Completed tasks are a
  separate number on the same dashboard, the **Tasks Completed** tile — a distinction
  the old row hid behind the word "activities" on a page about tasks.

- 3ac9f33: Reconcile the Activities documentation with the activity model that actually
  ships, and list every sales page in the Sales Cloud index.

  `content/docs/sales/activities.mdx` (and its zh-Hans / zh-Hant siblings) still
  described the pre-#592 world, where an activity was a `crm_task` record and
  nothing else:

  - **"An activity (stored as a Task record) … a meeting to attend"** — since #592
    an activity is two objects: `crm_task` (what you still owe somebody, anchored
    on a due date) and `crm_event` (a meeting or call that takes a calendar slot,
    anchored on a start and an end, with attendees as real records). The page now
    states the division of labour and links to **Meetings & Calls**, which carries
    the full comparison; the task types _Call_ and _Meeting_ are labelled as what
    they are — to-dos, not calendar entries — and the rep tip that told everyone to
    log every customer call as a _Call_ task now points at **Log a Call**.
  - **"Opportunity last activity date"** — `crm_opportunity` has no such field, and
    never had one (`quote-generation.flow.ts` still carries the incident note from
    the flow node that failed on the unknown column). Readers were being sent to
    look for a field that does not exist. The bullet is replaced by what really
    surfaces a quiet deal: **Days in Stage**, derived from the stage entry date,
    plus the daily Stalled Deal Alert.
  - **"Account last activity date — stamped whenever a task on the account is
    completed"** — a completed task is one of four writers (an event turning
    _Held_, a task completed, _Send Email_ on a contact, a case set to _Resolved_),
    and the stamp walks **up** the chain from the opportunity / contact / case to
    the account behind it. Stamping only the directly-named record is precisely the
    behaviour #592 fixed, because it left the account clock frozen through an
    entire sales cycle. The page now says so and links to the measured table.

  Also: the **What's included** table on `content/docs/sales/index.mdx` listed 7 of
  the section's 9 pages — `forecasting` (which ships and is registered in
  `meta.json`) and the new `meetings-and-calls` were missing, in all three locales.

  Fixes #739.

- 3ec9feb: docs(activities): 把「重复任务」用例里的续约提醒按机制写实（三语）

  `content/docs/sales/activities.mdx` 及其 zh-Hans / zh-Hant 双语在 **Recurring tasks / 重复任务**一节的用例列表里列着「合同结束前 60 天的续约提醒——由合同流程自动设置」。两处都与源码不符：

  - **不是 60 天。** 写死 60 天的激活期任务已从 `src/objects/contract.hook.ts` 删除（原因写在该文件 `:121-124` 的注释里）。今天排续约提醒的是 `contract_renewal` 定时流程（`src/flows/contract-renewal.flow.ts`），每天 08:00 只扫 `status: 'activated'` 的合同，窗口取每份合同自己的 `renewal_notice_days`（`src/objects/contract.object.ts`，`defaultValue: 30`，逐份可设）。
  - **不是重复任务。** 该流程的 `create_renewal_task` 节点写入的字段只有 subject / `type: 'follow_up'` / priority / status / due*date / owner_id / related_to*\*，没有任何重复字段。它每天重现靠的是「扫描 + 幂等闸门」——合同只要还挂着一条未完成的 `Renewal due` 任务，当天就算已处理——而不是 recurrence 机制。

  改法按实测：本仓的重复任务**机制**是真的（`crm_task` 的 `is_recurring` / `recurrence_type` / `recurrence_interval` / `recurrence_end_date` 四个字段、表单的「重复规则」分组、`recurrence_fields_required` 校验规则，以及 `src/objects/task.hook.ts` 的 `task_recurrence` 钩子在完成时生成下一实例），但**没有任何自动化会创建重复任务**——`is_recurring` 在 `src/flows/`、`src/actions/`、`src/data/` 下零命中。因此这一条假用例被移除，改为如实写明：重复任务只由人工勾选发起；续约提醒则按每日扫描 + 每份合同的**续约通知（天）**（默认 30）写清真实工作方式，并指向 `content/docs/revenue/contracts.mdx` 的*每日——续约提醒*一节。口径与 `content/docs/sales/quotes.mdx` 已落地的接受链路一致。

  仅文档改动；未触碰 `src/**`、元数据、钩子或流程。

- 52530d5: Give `log_call` / `log_meeting` a real `record_label`, and stop the two twins
  drifting apart. The activity writers stamped `record_label: ctx.record?.name`,
  but `name` is not the display field on almost anything in this app — 14 of the
  15 objects declare a different `nameField` (`display_title`, `full_name`,
  `subject`, `contract_number`, …) and most have no `name` column at all,
  `crm_case` — the object both actions are scoped to — included, so every logged
  call and meeting landed on the timeline with a null label. The bodies now
  resolve the object's declared `nameField` through a map derived from the object
  definitions, so it cannot drift and it keeps working if these actions are
  restored to the global design.

  The two actions were also near-verbatim copies that had quietly stopped
  agreeing on whether `duration` is required (yes for calls, no for meetings,
  undocumented either way). Everything they share — body, dispatch declarations,
  the subject/duration/notes param core — now comes from one builder, and
  `duration` is optional on both, which is what the shared body was already
  written for.

  Adds `test/global-actions.test.ts`, which EXECUTES the action bodies rather
  than regex-matching them: it asserts the label resolves for every object that
  declares a `nameField`, and that the twins emit the same activity row apart
  from the summary prefix and the per-kind metadata. Refs #514.

- 9f748ab: Activity timelines name the person again: `log_call`, `log_meeting` and
  `schedule_meeting` now write a human-readable `sys_activity.actor_name` instead
  of the acting user's raw id.

  Every activity row written from a record page carried an opaque id in the actor
  column — "grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2" where "Dev Admin" belongs — because
  the body stamped `ctx.user?.name`, and on the dispatch path the Console uses,
  that key is not a display name. `@objectstack/runtime` 17.0.0-rc.2 builds the
  REST action context's user as `{ id: ec.userId, name: ec.userId, … }`
  (`dist/index.js:5397`): the `name` key is present and carries the id, so it read
  as a plausible value and no `??` fallback could ever catch it. The MCP path
  (`dist/index.js:1776`) does prefer `ec.userName ?? ec.userDisplayName`, but
  nothing in the installed platform populates either field, so it lands on the id
  too.

  The shared activity body now resolves the name itself, from `sys_user.name` —
  the column the platform treats as the profile display name — with the id kept
  only as a last resort, because an unattributable activity is worse than an ugly
  one. A user object that already carries a name different from its id is believed
  as-is, so the lookup is one query on the affected path and none on a path that
  works; a denied or failing `sys_user` read never fails the log. This is a
  workaround for a platform contract gap, marked as such in the code: it deletes
  itself the day `ctx.user.name` is honoured for REST-dispatched action bodies.

- 28bc849: Meetings and calls are documented for the people who use them, and a CI rule now
  requires a docs page for every business object.

  **The activity model shipped undocumented.** #592 / PR #670 added `crm_event` and
  `crm_event_attendee` with a navigation group, six list views, a dashboard, a dataset
  and grants in four permission sets — and neither object was named anywhere under
  `content/docs/`. AGENTS.md has always required a user-facing page for every new
  object; nothing checked, so the requirement held right up until a busy PR.

  `content/docs/sales/meetings-and-calls.mdx` (plus `zh-Hans` / `zh-Hant`) now covers
  the model as it actually ships:

  - **Log a Call / Log a Meeting / Schedule a Meeting** on a lead, contact, account,
    opportunity or case — what each form collects, and the three things one click
    writes (the event, its attendee rows, the timeline entry that drills to the event).
    The UTC wall-clock entry on a scheduled meeting is stated up front, because a rep
    in UTC+8 who types `15:00` books the wrong slot.
  - **Planned vs Held**, and why only _Held_ refreshes the customer's contact clock:
    a meeting booked for next quarter is not an interaction that happened, and letting
    a booking reset the clock is how an at-risk report learns to lie. The page gives
    reps the habit that follows from it — go back and set the status.
  - **What actually refreshes `last_activity_date` / `last_contacted_date`**, read off
    the hooks rather than assumed: a held event, a completed task, `send_email` from a
    contact, and a case reaching _Resolved_ — with the walk-up from contact /
    opportunity / case to the account behind them, which is the part that makes the
    signal real. The account-owner / account-type edit that also stamps the date is
    called out as the non-interaction it is.
  - **Attendees are queryable records**, with the response and organiser fields a JSON
    string could never carry, and the shipped deletion behaviour: deleting a person
    takes their attendee rows and leaves the meeting standing (#711/#718), while
    deleting a meeting that still has attendees is refused until those rows are gone.
  - Where events live in the app, who can see them, and the attendee-row read scope
    that is org-wide today (#694) rather than derived from the meeting.

  The Sales Activity dashboard's tile list is **not** repeated here — it belongs to
  `content/docs/analytics/dashboards.mdx` (#610) and is linked instead.

  **The rule is now enforced.** A new `test/docs-object-coverage.test.ts` derives every
  `crm_*` object from the compiled stack and requires each to have a docs page: the
  page must exist in all three locales, be registered in its section's `meta.json` so
  the sidebar can reach it, name the object, and not be a developer page — the API
  reference tabulates nearly every object, so "mentioned under content/docs" would
  otherwise have been satisfied by a table row. Registering a new object without
  writing its page now fails at PR time. The ledger needs no known-gaps allowlist:
  after this page lands, every registered object is covered.

- ed6885e: Make `AGENTS.md`'s only ObjectQL example match the repo's real read path.

  The example under §"Tech Stack & Protocol" item 2 read
  `broker.find('opportunity', { filters: [['amount', '>', 50000]] })`, and every part of
  it was wrong for this codebase:

  - **`broker`** has zero occurrences in `src/`. The data surface an agent actually gets
    is `ctx.api`: 43 call sites in `*.hook.ts` (cast once as `HookApi`, then
    `api.object('crm_x')`) and 17 in action script bodies (`ctx.api.object('crm_x')`).
  - **`filters`** is not a key of the in-process query object at all. It is the
    _deprecated plural alias_ of the `filter` HTTP query-param, whose value is a JSON
    string. Used in process it fails silently, which is the failure mode this repo has
    already paid for once — `.changeset/hook-query-where-not-filter.md` records seventeen
    hook calls whose predicate vanished: `findOne` returned the object's first row and
    `count` counted the whole object, with no error and no `null`. `HookQuery` in
    `src/objects/_hook-api.ts` now omits the alias precisely so the compiler rejects it.
  - **`'opportunity'`** violated the `crm_` prefix rule stated five lines above it in the
    same file. The object is `crm_opportunity`.

  The predicate _value_ changed shape too: `[['amount', '>', 50000]]` is a legal filter
  AST at the platform level, but it is not assignable to `HookQuery['where']`, and no
  `ctx.api` call site uses it — every predicate on that surface is written as an object.
  So the example now does: `where: { amount: { $gt: 50000 } }`.

  The rule is stated _scoped to `ctx.api`_ on purpose, because two other surfaces spell
  their predicate differently and an unscoped rule would have invited the next agent to
  "fix" them:

  - A flow node's `config` is a schema-unvalidated bag (`config: z.record(z.string(),
z.unknown())`) and `*.flow.ts` query/update nodes use `filter:` — 44 occurrences across
    17 of the 21 flow files, `where:` in none.
  - A page component config uses `filter:` in the AST-array form, the one spelling of that
    form in `src/` (`src/pages/lead_detail.page.ts:217`).

  Documentation only — no runtime, metadata, or dependency change.

- b287e2e: Point `AGENTS.md`'s Schema Validation Requirements list at a schema that exists.
  Item 3 told every agent to validate "Workflows" with
  `WorkflowRuleSchema.parse()` from `@objectstack/spec/automation`. That export is
  not there: `WorkflowRule` matches **0 files** across all 52 installed
  `@objectstack/*` packages on 17.0.0-rc.2, while the same grep finds
  `FlowSchema` in 63, `JobSchema` in 46, `StateMachineSchema` in 40 and
  `ApprovalNode` in 30 — the probe works, the symbol is gone (ADR-0019/0020
  retired the `workflow` metadata type; `ObjectSchema` now rejects `workflows:`
  and `workflow:` by name). An agent following the instruction hits an import
  failure and then improvises: hand-rolls a schema, drops validation, or worse
  concludes it should author a `workflows[]` key the platform refuses.

  Item 3 is now **Flows** — `FlowSchema.parse()` from
  `@objectstack/spec/automation`, which is exactly what `defineFlow()` runs —
  because the list had no Flows entry at all despite `src/flows/` holding 21
  `*.flow.ts` files. A short note under the list routes the three things people
  call a "workflow" to their real carriers: field updates to `*.hook.ts`, status
  flips and notifications to a `record_change` / `schedule` flow, approvals to an
  `approval` node inside a flow. It also separates them from item 4, since a
  record lifecycle constraint is a `validations[]` entry with
  `type: 'state_machine'` on the object — validated by `ObjectSchema.parse()`,
  not by `StateMachineSchema`, whose shape (`initial` / `states` / `on`) is a
  different thing.

  Instruction-file wording only; no `src/**` or `content/**` change. Refs #852,
  #833.

- 6809624: All four locales are now complete on every translatable surface, and the exemption ledger that tracked the gap is retired rather than emptied.

  `objectstack lint` went from **723 warnings to 13**. Every one of the 710 removed was an i18n gap; the 13 that remain are unrelated (naming prefixes, a shadowed field group). `pnpm lint` runs with `--skip-i18n` and now reports the same 13 as a full run — the flag has nothing left to skip.

  **ja-JP and es-ES were each missing 355 keys.** The `pages` group was absent from both bundles outright, so every page in the app rendered its nav label, breadcrumb and header in English regardless of locale. On top of that: 34 navigation nodes, 10 object descriptions, the 12 Sales-dashboard win/loss widget strings, 13 view labels and empty states, and 169 picklist option labels each.

  **`en` was missing 133 keys and nothing could see them.** When a key is absent the resolver falls back to the English string in the metadata, so in the source locale a missing entry and a correct one are indistinguishable — invisible at runtime, invisible to the linter, invisible to a reviewer clicking through. It still mattered: every other bundle is authored by mirroring this one's shape, so a key with no slot here is a key the next translator has no place to put. That is precisely how three locales ended up with no `pages` group.

  ## Consistency is now structural rather than a copy discipline

  Shared picklists in ja-JP are declared once and spread into each use site, mirroring the `activityActions` pattern already in the file and `_picklists.ts` on the metadata side. es-ES asserts the same relationships programmatically against the loaded bundle. The discipline they replace had already failed: `crm_lead.industry` read 業界 against `crm_account.industry` 業種 for the same 15-value shared set.

  Drift the sweep exposed and fixed:

  - `crm_account.owner` in ja-JP was 取引先責任者 — the **object label for `crm_contact`**. The "Account Owner" field rendered as the word "Contact".
  - The `crm_account` lookup read アカウント on case/contract/quote/campaign-member screens while the object itself is 取引先; same field, different word depending on which page you opened. `crm_task.related_to_type` forces the fix anyway — its option values _are_ object names.
  - `crm_opportunity.stage` was フェーズ beside ステージ更新, ステージ開始日, 現ステージ滞在日数, and a dashboard showing ステージ × リードソース next to フェーズ別パイプライン.
  - `crm_account.type.former` is `'Former Customer'` in `account.object.ts`, but the `en` bundle had truncated it to `'Former'` — and es-ES, mirroring that bundle, rendered a bare `'Anterior'`: an adjective with no noun, beside three option labels that are all nouns.

  ## The guard

  `PENDING_SELECT_LABELS` is **deleted**, not emptied. It held 34 fields over 12 objects — 111 (locale, field) pairs, ~380 option labels — of debt that #631 could not fix without burying the field its PR was about. An empty ledger is an invitation to add a row; the two assertions that existed only to keep it honest (stale rows, ghost rows) go with it. What remains says unconditionally what the ledger was always converging on: every select field, every option value, every locale.

  The surface guard is widened from zh-CN-only to all four locales, deriving the list from `localePacks` rather than hard-coding it, so a fifth locale is held to the bar the day it appears. Widening it is what surfaced the 105 invisible `en` gaps in the first place.

  This suite is the only real gate: `objectstack lint` has rules that find these gaps and CI never runs them, because `pnpm lint` passes `--skip-i18n` and `objectstack lint` exits 0 on warnings regardless.

  ## Not addressed

  View **tab** labels (#661) remain untranslatable in every locale: `tabs[].label` has no key in `ObjectTranslationDataSchema` and no resolver in `i18n-resolver.ts`, so the gap is upstream.

  Several help strings in the object definitions read as developer shorthand and are now mirrored consistently into all four bundles — `crm_forecast.attainment_pct` ("Negative quota guarded"), `best_case_amount` / `commit_amount` (leaking raw `best_case` / `commit` option values where every neighbour uses display labels), `crm_opportunity_line_item.list_price` ("Auto-populated from product.list_price"). Fixing the English belongs in a change to the object definitions, not to a translation bundle.

- 75c9aba: Analytics repairs (#492): chart axes read real measure names instead of
  placeholders, report time windows roll at runtime instead of being frozen at
  authoring time, the sales quota widget reads real forecast data through a new
  `forecast` dataset, the service case table renders again, and the unreferenced
  cube layer is deleted. Guarded by a new analytics metadata test file.
- e4d7c43: Write the analytics landing page to source, and retire the "four built-in cubes"
  vocabulary from the eight pages that still carried it.

  `content/docs/analytics/index.mdx` is the first screen a reader of the analytics
  docs sees, and every count on it named something else. It advertised **4 cubes**
  (_Sales_, _Pipeline_, _Service_, _Marketing_ — four names that exist nowhere in
  the app; the semantic layer is the nine datasets in `src/datasets/`, which the
  analytics service compiles into cubes internally, ADR-0021), **4 dashboards**
  (there are five — _Sales Activity_ was missing), **10+ reports across leads,
  deals, cases, contracts** (there are exactly ten, and none of them is a contract
  report: no dataset reads `crm_contract`, so none can be built), a report called
  _Pipeline by Stage_ (a shared dashboard tile and a chart title — the report is
  **Opportunities by Stage**) and an **Analytics** navigation group (the group is
  called **Insights**, and it holds CRM Overview, Forecasts, Pipeline Coverage,
  Lead Inflow and SLA Performance — nothing in it is called _Dashboards_,
  _Reports_ or _Cubes_). The "AI Copilot reads directly from cubes" claim now says
  what this app declares — no skill names a dataset, cube or measure, and the one
  that answers data questions aggregates over records — and leaves the platform
  side undecided rather than asserting it in either direction.

  The same retired vocabulary is gone from eight further pages: `whats-new` now
  lists the nine datasets it actually shipped, `getting-started/for-developers`
  draws `datasets/` instead of the `src/cubes/` directory removed in #492, and
  `reference/performance-and-limits` plus `reference/faq` state the refresh cadence
  the app really declares — each dashboard's own `refreshInterval`, 60 s on
  Customer Service, 180 s on Sales Performance, 300 s on the other three — in place
  of an "every 5 min incremental / nightly full" figure nothing in `src/`
  configures, and of a manual refresh button no dashboard declares.
  `sales/pipeline-management`, `getting-started/introduction`,
  `marketplace/fork-hotcrm` and `administration/sandbox-and-releases` were renames
  only. The glossary's definition of the _cube_ concept is deliberately untouched:
  the concept is real, and only its misapplication to this app was not.

  Documentation only in all three locales; no metadata changed.
  `test/docs-analytics-vocabulary.test.ts` now derives every count and product name
  on these pages from `src/` and fails the build when the app and the page disagree.
  Refs #976 #977.

- 01da4a8: Write the analytics reports page's Sales / Revenue / Marketing sections and the
  whole cubes page to source, in all three locales.

  **Thirteen report names, none of them published (#962).** `src/reports/` ships ten
  reports and the page's remaining three sections named thirteen that exist nowhere,
  while the six real ones — `account.report.ts`'s **Accounts by Industry and Type**,
  `churn.report.ts`'s **Customer Churn Signals** and the four in
  `opportunity.report.ts` — had never appeared on the page at all. Two of the
  thirteen were real names attached to the wrong thing: **Pipeline by Stage** is the
  funnel tile shared by CRM Overview / Sales Performance / Executive Overview
  (`src/dashboards/shared-widgets.ts`) and the chart title of the real report
  **Opportunities by Stage**, and **Stale Opportunities** is the _Stale_ list view
  (`src/views/opportunity.view.ts`), which applies no 14-day cut — it ranks every
  open deal by **Stage Entry Date**, the 14 days belonging to the
  `opportunity_stagnation` flow. Each remaining name is now judged individually
  against the semantic layer: _Forecast vs Actual_, _Win/Loss Analysis_, _Big Deals
  Won_ and the renewal pipeline are a custom report away, while _Sales Cycle
  Length_, _Discount Approval Activity_ and the three contract reports cannot be
  built at all — no dataset reads `crm_contract` or either line-item object, and the
  one duration on the deal, **Days in Current Stage**, is a post-query formula that
  nothing can aggregate. The subscription example, the permissions bullet and the
  manager tips no longer name reports that do not exist.

  **The four built-in cubes do not exist (#965).** The page was built on _Sales_,
  _Pipeline_, _Service_ and _Marketing_ cubes; this app declares no cube at all —
  every semantic definition is a `defineDataset(...)` under `src/datasets/`, and the
  analytics service compiles each one into its cube internally (ADR-0021, and
  `objectstack.config.ts` registers no `analyticsCubes`). The page now lists the nine
  real datasets with their actual dimensions and measures, folds Sales and Pipeline
  into the single `opportunity_metrics` they both described, and names per item what
  is unreachable and why — weighted pipeline (the **Expected Revenue** field carries
  it per record, no measure aggregates it), average discount (a line-item percent no
  dataset reads), product/family, account tier and size, team and region (positions
  and **Billing Country**, i.e. access-control machinery), day/week/year grains, and
  snapshot dates (nothing snapshots the pipeline; `forecast_metrics` holds the only
  per-period rows). **Marketing has no data source**: `crm_campaign` and
  `crm_campaign_member` carry the spend, the counters and the **ROI %** / **Response
  Rate %** formulas on the record, and no dataset reads either, so nothing aggregates
  them and `crm_opportunity.crm_campaign` cannot attribute revenue either.

  The platform-side sections are left explicitly unclaimed rather than declared
  false: the drag-and-drop cube UI, the refresh cadence and the cube access log are
  runtime questions this repo cannot answer, so the page says so and points the
  reader at their deployment. What it does state is the app-side half — no skill
  under `src/skills/` names a dataset or a cube, and **Live Data Access** answers
  data questions through the platform's object tools (`describe_object`,
  `aggregate_data`, …), not off a compiled cube — and that a new cube here starts as
  a new dataset in source.

  Documentation only; nothing under `src/` changed.

- 9588c36: Bind the CRM app's ambient chat to the platform `ask` agent. `crm_enterprise`
  still declared `defaultAgent: 'sales_copilot'`, an app-authored agent retired in
  #512 — per ADR-0063 §1/§2 the key is a surface binding whose only resolvable
  values are the two platform agents (`ask` for data surfaces, `build` for
  authoring surfaces), so the runtime's `loadAgent()` refused the record and the
  floating chatbot resolved to nothing. Nothing caught it: `defaultAgent` accepts
  any well-formed snake_case name, and the platform's agent lint only walks
  authored agents. HotCRM's six shipped skills already attach to `ask` by
  `surface` affinity, so the assistant now answers with its full skill set.
  Adds a guard to `test/metadata-references.test.ts` that pins every app's
  `defaultAgent` against the platform agent set read straight off the spec's
  `AgentSchema`, so the next dangling binding fails locally instead of in a demo.
  Refs #586.
- ae80c1a: Point the **Approvals → Inbox** sidebar entry at the platform's approval centre,
  so following it lands somewhere an approver can actually approve.

  The entry was `type: 'object'` on `sys_approval_request` — the approvals
  plugin's raw request table. That table is read-only: the row-end menu is empty,
  the record detail's overflow menu offers only _Share_, and the status strip does
  not filter. An approver who followed a menu labelled **Inbox** (zh-CN
  「待我审批」, ja-JP「受信トレイ」, es-ES _Bandeja de Entrada_) reached a page with
  no approve or reject anywhere on it. The platform's approval centre — which does
  support both, with hover approve/reject on each row and `j`/`k` to move, `Enter`
  to open, `a` to approve, `r` to reject — was reachable only from a bell
  notification or by typing a URL.

  The entry is now:

  ```ts
  { id: 'nav_approval_requests', type: 'component', componentRef: 'approvals:inbox',
    label: 'Inbox', icon: 'inbox', requiresObject: 'sys_approval_request' }
  ```

  `component`, not `url`. The approval centre is a first-party console surface
  registered in the runtime's `ComponentRegistry`, which is exactly what the spec
  documents `component` for — "a first-party UI shipped with the platform,
  typically admin/setup surfaces that have no row in any data store" — while `url`
  is documented as the external-link type. Taking `url` would have meant writing a
  console-internal route plus this app's own name into metadata; a `componentRef`
  resolves against the current app base instead, so the entry keeps the user
  inside HotCRM's shell without naming either. It also fails loudly: an
  unregistered ref renders "Component not registered", where a stale URL bounces
  silently to the console home.

  No second "approval history" entry was added. The approval centre already
  subsumes the object list it replaces — **My Pending** / **Submitted by me** /
  **All** tabs plus a status filter over Pending, Approved, Rejected, Recalled and
  Returned for revision — so a second entry would only add a weaker view of the
  same rows. Labels are unchanged in all four locales, and `requiresObject` is
  retained, so the entry still hides itself where the approvals plugin is not
  installed.

  `test/docs-revenue-approvals-navigation.test.ts` pins the new shape and, because
  no metadata check can see a component ref resolve, also pins `approvals:inbox`
  against the installed console's own bundle — so a console release that renames
  or drops the surface turns that test red instead of leaving the sidebar quietly
  dead. Refs #1123.

- 23aee25: Give an external guest an honest `attendee_type`, and make the type agree with
  the column that is filled.

  `crm_event_attendee` declared four ways to name a person in its
  `attendee_resolves` rule — `crm_contact`, `crm_lead`, `sys_user`,
  `external_name` — and only three values in `attendee_type` (`contact`, `lead`,
  `user`, defaulting to `contact`). The two lists were authored separately and had
  drifted, so the guest `external_name` exists for (a prospect's lawyer, in no CRM
  object at all) had no honest type to be stored under. Measured on 17.0.0-rc.6
  before this change, on a real engine:

  ```
  insert { attendee_type: "contact", external_name: "the prospect's lawyer" }
    -> ACCEPTED
  insert { external_name: "no type given" }          // type left to its default
    -> ACCEPTED, stored as attendee_type: "contact"
  insert { attendee_type: "external", external_name: "Jane Roe" }
    -> ValidationError: Attendee Type must be one of: contact, lead, user
  ```

  The stored row then claimed to be a Contact while pointing at no contact, and
  every query that filters on the discriminator — "internal attendees only", named
  in the object's own note — counted it in the wrong bucket. The activity actions
  never write an external name, but the Console's attendee form writes all three
  shapes above, which is what made this a live defect rather than dead metadata.

  Now:

  - `attendee_type` ships a fourth option, **External**, labelled in all four
    locale packs.
  - `attendee_resolves` requires the column the type NAMES, and a new
    `attendee_type_exclusive` refuses any other party column on the same row. A
    row can no longer be filed under one type while naming another, in either
    direction.
  - Both rules and the picklist are generated from ONE declared correspondence in
    `src/objects/event_attendee.object.ts`, so a fifth resolution cannot be added
    without its type, or a type without the column it names — the drift that
    caused this is no longer expressible.

  Existing rows are unaffected in storage, and no seeded data changed: every
  seeded attendee row already paired its type with its column, which
  `test/attendee-type-resolution.test.ts` now sweeps and pins. That file also
  drives the whole acceptance surface on a real kernel in both directions — the
  newly legal external row is accepted, and each newly illegal shape is refused
  with a `ValidationError` (`code: VALIDATION_FAILED`) reaching the caller. A row
  naming two parties at once is now refused outright, which retires the one
  documented cost of the #711 cascade work.

  Refs #740.

- a501812: Complete the built-in flow table on the automation admin page, in all three
  locales, and pin it to the compiled stack.

  The table is the only route an admin has from a symptom ("something re-assigned
  this case", "a task appeared on my list") to the automation behind it, and it was
  listing fewer than half the flows: the header read `Built-in flows in HotCRM
(11)` on the English page and `(10 个)` / `(10 個)` on the Chinese ones, while the
  app ships 24 flows. Contract auto-expiration, the contact welcome prompt, quote
  and campaign expiry, the task reminders and the two insert-time approval twins
  were all absent — so a reader sent to this table by the contracts page found
  nothing and concluded the expiry sweep did not exist.

  One row was also wrong rather than missing. `campaign_enrollment` was rewritten
  from a Monday-9-AM schedule into a screen flow (a cron seeds no input variables,
  so every run enrolled nothing or died on validation), but all three pages still
  billed it as a scheduled sweep, and the prose below counted it among them.

  What changed for readers:

  - All 24 flows are listed, grouped by trigger surface, each row carrying the
    flow's own label — the name listed in Studio's Flows and Flow Runs pages, so a
    run can be looked up here verbatim.
  - Each row states the real trigger, including the `insert` / `update` half of a
    record-change flow, and the real cron for the nine scheduled ones.
  - The counted sentences follow: `(24)` in the header, and "the nine `Schedule`
    rows above" replacing "the five `Schedule` rows above (campaign enrollment,
    …)", whose hand-written roster was the part that expired.
  - Two short paragraphs explain the `(on create)` twins and why `Demo Bootstrap`
    is listed despite being scaffolding rather than business automation.

  `test/automation-docs-coverage.test.ts` now derives the table's row set, each
  row's trigger cell, and both numerals from the compiled stack, so a flow added,
  removed, renamed or re-triggered fails at PR time until all three pages agree.
  The Chinese row labels stay authored per locale — flows carry no entry in the
  locale packs, and no zh-Hant pack ships at all.

- a94709e: Spell the Automation page's merge-field example the way this app spells names, in
  all three languages. The "Email templates" section on
  `content/docs/administration/automation.mdx` (and its `.zh-Hans` / `.zh-Hant`
  siblings) opened its bullet list with `{{Opportunity.Name}}` and
  `{{Account.Owner.Email}}` — Salesforce-style PascalCase that names nothing here.
  HotCRM's objects are `crm_opportunity` and `crm_contact`; its fields are `name`,
  `owner_id`, `email`. AGENTS.md holds that parity as a hard rule — _the name in
  source = the name at runtime = the name in DB = the name in URL = the name in
  docs. No translation layer_ — and the rest of the same page already keeps it
  (`end_date`, `expiration_date`, `owner_id`). Only this bullet was borrowing
  another product's vocabulary, which an admin authoring a template under
  **Studio → Integration → Email Templates** would have copied into paths that
  resolve to nothing.

  The placeholder _syntax_ was never the problem and is unchanged.
  `EmailTemplateDefinitionSchema` in `@objectstack/spec` 17.0.0-rc.3 documents
  subject and body as carrying simple `{{path.to.value}}` placeholders rendered
  against a per-send `data` payload, and describes each declared variable's `name`
  as "snake_case or dotted path".

  What the bullet deliberately does _not_ do is invent a payload shape. Whether a
  template reads `{{name}}`, `{{record.name}}` or `{{crm_opportunity.name}}` depends
  on the `data` payload the caller passes to `sendTemplate()`, the caller decides
  that shape, and this repo has no caller to measure it from — `sendTemplate` and
  `email_template` have zero occurrences under `src/`, consistent with the compiled
  artifact carrying no email-template metadata (#834). So the bullet now gives the
  real spellings, says plainly that where the path is rooted is the sender's choice,
  and points template authors at the template's own `variables` list rather than at
  a shape nobody in this repo has exercised.

  Documentation only — one bullet per language file. No metadata, behaviour or field
  changes. Fixes #863.

- 9d2c787: Retire the "Workflow rules" section from the automation admin page in all three
  locales. The page taught workflow rules as one of five kinds of automation —
  their action types, three "built-in examples", their slot in the save order, and
  a **Setup → Workflow Queue** to monitor them. None of it exists.

  The type is gone platform-wide, not merely unused here. Measured on
  `@objectstack/*` 17.0.0-rc.2:

  - Zero `WorkflowRule` symbols across all 50 installed platform packages.
  - `spec` says so in five places: no `workflow` metadata type
    (`kernel/metadata-plugin.zod.ts`, ADR-0020), no top-level `workflows`
    collection (`stack.zod.ts`), the `workflow_rule` authoring paradigm retired
    (`automation/node-executor.zod.ts`, ADR-0019), the `/api/v1/workflow` mount and
    `WorkflowProtocol` removed in v17 (`api/protocol.zod.ts`), and the `workflow`
    core-service slot retired with them (`system/core-services.zod.ts`).
    `ObjectSchema` now _rejects_ `workflows:` / `workflow:` by name.
  - The Setup app's Automation nav ships exactly one entry — Flows — with an
    explicit "no Workflow Rules nav" note in `@objectstack/platform-objects`.
  - On a running server: `/api/v1` discovery lists no `workflow` route or service
    slot (unavailable slots such as `realtime` and `ai` _are_ listed, so the
    absence is the answer), `/api/v1/workflow` is 404, and the automation service's
    own root returns `{"flows": [...24...]}` and nothing else.

  The three "built-in examples" were flows all along — they are the _New Lead
  Routing & SLA_, _Large Deal Won Alert_ and _Case Escalation Process_ rows of the
  built-in flow table on the same page, so an admin was told the same three
  behaviours came from two different mechanisms, only one of which they could find
  in Setup. The examples also described behaviour the flows never had (a Slack
  `#wins` post, in particular, from a flow whose only node is a `notify`), so they
  are dropped rather than reworded — the table already states what each flow does.

  What replaces them: "The five kinds" is now four, and the Flows section opens
  with a short note for anyone arriving with "workflow rule" in their head,
  pointing at record-change flows. The save-order list loses its workflow step, and
  its cascade step — which promised re-evaluation "up to 5 times" — now states the
  engine's actual behaviour: writes by a flow re-enter the save order, and a
  re-entrancy guard skips a flow re-entered for the same record while its previous
  run is still in flight (a backstop, not a start condition — see #701). The
  **Setup → Workflow Queue** monitoring entry is dropped; no such page exists.

  Docs only. Refs #833, #839.

- d402253: Repair broken and conflicting automation across hooks and flows (#489):
  case/task automation no longer fights itself (escalation is guarded by
  `escalated_date == null` on top of the status guards, and an afterInsert twin
  covers cases born critical), the stalled-deal sweep gains an idempotency gate
  so it nudges once per stall episode instead of every morning, and
  lead/campaign/contact and opportunity/quote/contract automations stop
  overwriting each other's writes.
- 716bd4d: The Chinese automation pages regain the paragraph that says which half of the
  forecast pipeline owns what, and both they and the Chinese Opportunities pages
  name the `best_case` forecast category the way the shipped locale pack does.

  **The missing paragraph.** `## Scheduled automation` in
  `content/docs/administration/automation.mdx` has carried three paragraphs since
  #615 landed `forecast_snapshot`; the two Chinese copies had two. The one they
  lacked is the only place on the page that gives the _criterion_ for splitting
  work between a flow and an object hook — the **Forecast Snapshot** flow decides
  who gets a snapshot and what the totals are, while the forecast object's hook
  decides which calendar period the snapshot belongs to, because a cron schedule
  can say "every night" but not "the first day of this quarter". Without it a
  Chinese reader got the preceding paragraph's conclusion (date-driven field logic
  that needs no orchestration lives in object hooks) with none of the reasoning,
  and the English text explicitly calls this "the pattern to copy". Both
  `automation.zh-Hans.mdx` and `automation.zh-Hant.mdx` now carry it, using each
  page's own established vocabulary (计划类流程 / 排程類流程, 对象钩子 / 物件鉤子,
  日历周期 / 日曆週期, 写入方 / 寫入方).

  The rest of the page was swept the same way while the file was open — every
  other section already matches the English one paragraph for paragraph, and no
  further gap was found.

  **One picklist value, three spellings.** `src/translations/zh-CN.ts` ships
  `crm_opportunity.fields.forecast_category.options.best_case` as 「最佳情况」, and
  that is what the _Forecast Category_ dropdown shows. The Chinese docs used three
  different words for it: 最佳情况 on the Forecasting, Sales index, glossary,
  Copilot and cubes pages (right), 最佳可能 on the Opportunities pages, and 最好情况
  on the automation pages. Both wrong spellings are gone. The two Opportunities
  occurrences per locale sit in the same sentence as 「承诺（Commit）」, which was
  already correct, so the _This Quarter's Closing_ view described its own filter
  with one term a reader can find in the UI and one they cannot.

  The same automation table row named the fourth forecast total 「赢单合计」, a word
  the pack ships nowhere; `crm_forecast.closed_amount` is labelled 「已成交金额」,
  which is also what the Forecasting page already used. That row now agrees with
  both.

  Documentation only — the locale pack is the contract, so nothing under `src/`
  changed, and the English pages (which already match the pack) are untouched.

  Fixes #836. Fixes #845. Follows #829.

- fdf6055: 按引擎实况清扫 bare `workflows` 残留：faq / performance-and-limits 的「重新评估 5 次后停止」是虚构的计数器，quotes 的「调整报价对象工作流上的计划」指向不存在的配置面（#899）

  #850 / PR #894 清掉的是「工作流规则 / workflow rule」这个字串。本次清的是另一个：把 `workflows`（不带 rule）当成独立于流程的一种东西来讲的散布，7 个页族 ×3 语言，grep 命中面与上一轮不重叠。

  **引擎里没有 5 次这个计数器。** PR #854 已在 `content/docs/administration/automation.mdx` 把这条说法改成实况，但两份副本没跟上，文档因此自相矛盾：

  - `content/docs/reference/faq.mdx` 的「我的流程没有触发」问答，第 5 条原本让管理员去数「级联是不是超过 5 次停了」。改写为真实的失败模式：流程在上一次运行尚未结束时又因同一条记录被重入，会被引擎的**重入守卫**跳过并记一条警告日志——没有可对照的重新评估次数，守卫是兜底而不是停止条件。整段问答的一等主语从「工作流」收口到流程（标题、「该规则是否已激活」、「先前的工作流」等）。
  - `content/docs/reference/performance-and-limits.mdx` 的自动化限制表原本列着 **Workflow re-evaluations per save = 5 (then halts)**，即一个可以据以做容量规划的硬上限。该行改为流程重新评估、并写明没有固定预算：流程自身的写入会重新进入触发顺序，引擎用重入守卫打断自触发环，而不是计次。（同表 `Workflow rules per object` 一行是 PR #894 写下的「该类型已退休」说明，保持不动。）

  **两处指向不存在配置面的说法改指真实位置，并如实写明这是源码作者面而非 Setup 界面**（与 #850 A 类同一失效模式）：`content/docs/sales/quotes.mdx` 里「要改扫描时间就去调整报价对象工作流上的计划」——报价对象上没有这样的设置项，该计划是 `src/flows/quote-expiration.flow.ts` 中 `quote_expiration` 流程 start 节点上的 `schedule: '0 1 * * *'`，改它是一次代码改动加重新部署；同段「加一个工作流把报价翻转为审核中」也不再把 workflow 讲成可新建的类型，改为在 `src/flows/` 下新写一条记录变更类流程。

  **四处枚举不再把 `workflows` 与流程并列成两种可部署 / 可审计的东西**：`content/docs/administration/index.mdx` 的管理员心智模型（与同页 PR #894 已改的自动化行对齐为流程 / 对象钩子 / 状态机）、`content/docs/administration/sandbox-and-releases.mdx` 的变更包内容枚举与可打包项表格（原表格一行里 `Workflows, flows` 并列了两遍）、`content/docs/reference/security-and-compliance.mdx` 的审计类目、`content/docs/customization/index.mdx` 的开篇分流句（其两个中文版本本就写的是「流程」，本次是英文版对齐）。

  workflow 的日常英语 / 汉语义命中不在本次范围，未动：`administration/setup` 的「日常工作流」、`administration/sandbox-and-releases` 的「变更工作流 / 安全的工作流」、`customization/theming-and-i18n` 的小节标题、`customization/testing-and-ci` 与 `marketplace/publishing-your-first-app` 的 GitHub Actions 语境、`service/index` 的「看板式工单工作流」、`service/knowledge-base` 的「内容维护工作流」。

  仅文档改动，`src/**` 零改动。

- a8a1a45: Write the three remaining business-hours claims to what the app actually ships,
  in all three locales. PR #924 fixed the two on `service/sla-and-escalation`; the
  same promise was still being made on the setup checklist, in the FAQ and in the
  glossary, and the setup page had ended up contradicting the SLA page outright.
  Every claim was re-confirmed against `origin/main` first: `business_hours`,
  `workingHours`, `businessCalendar` and `slaCalendar` have zero occurrences in
  `src/`, the only `business.?hour` matches are three product-description strings
  in the seed data, and the only code that computes an SLA deadline is
  `due.setHours(due.getHours() + 4)` in `src/objects/case.hook.ts` — wall-clock
  hours, stamped for `critical` and no other priority.

  **`administration/setup` no longer sends admins to a screen that does not
  exist.** Day-1 section 2 was a checklist — three checkboxes under a bold
  **Setup → Business Hours** heading — telling a new admin to enter working days,
  working hours and the year's holidays, then closing with "business hours drive
  SLA calculations". There is no such screen, none of the three settings exist,
  and after #924 the page it linked to says so in as many words, so the two pages
  disagreed about the same feature. The section keeps its number and its name (a
  reader who was sent looking for it needs to find out what happened to it) and
  now states plainly that there is nothing to configure, that deadlines therefore
  run on calendar hours, and that the four-hour Critical target is the only
  deadline the app computes. The old example, "resolve within 8 business hours",
  is High's service commitment: nothing stamps `sla_due_date` for High, so it is
  now named as a promise the team keeps rather than a clock the app runs.

  **`reference/faq` no longer lists two fictional preconditions for the SLA
  clock.** "My SLA clock isn't running" told the reader to check that business
  hours were configured and that the case's priority had an SLA defined, then
  added that cases without a priority get the default SLA. None of the three is
  real — there is no business-hours setup, no per-priority SLA definition screen
  and no default SLA. This was the expensive one: an admin whose High case was not
  being timed went looking for a configuration problem, when the reason is that
  the hook stamps `sla_due_date` for `critical` only. The answer now opens by
  saying there is no countdown at all, and the checklist is the real one — open
  status (`case_sla_monitor` filters `status: { $nin: ['resolved', 'closed'] }`),
  a due date present at all, and that due date already past with an hourly sweep
  having run since. The first bullet, open status, was already correct and is
  unchanged.

  **`reference/glossary` keeps the term and loses the false half.** The entry
  defined business hours as "working days and hours used in SLA calculations",
  which describes a concept this app does not have and asserts a use it does not
  make. It now gives the industry meaning, states that HotCRM has none of it, and
  points at where the one real deadline comes from.

  Whether the app _should_ grow a business-hours calendar, per-priority SLA
  definitions or a default SLA stays open in #595 — this change records today's
  behaviour only. Documentation in three locales; no metadata under `src/`
  changed. Refs #928, #917, #924, #903.

- 0939644: Let a lead or contact who was enrolled in a campaign be deleted again. Anyone who
  had ever been added to a campaign was **permanently undeletable** — through the
  API and through the UI — and the refusal named an object the caller had not
  touched:

  ```
  DELETE /api/v1/data/crm_lead/<id>
  → 400 {"error":"A campaign member must reference either a Lead or a Contact",
         "code":"VALIDATION_FAILED","object":"crm_lead"}
  ```

  The cause was a default nobody wrote down. `crm_campaign_member.crm_lead` and
  `.crm_contact` declared no `deleteBehavior`, so both took `Field.lookup`'s spec
  default of `set_null`. Deleting the person made the engine's referential pass
  clear that column, the cleared row instantly violated
  `lead_or_contact_required` — the rule the same object declares — and the whole
  delete rolled back. Since `enroll_leads` and the `campaign_enrollment` flow are
  ordinary parts of the marketing flow, ordinary use reached it, and a GDPR-style
  "delete this person" request could not be served at all.

  Both party lookups now declare `deleteBehavior: 'cascade'`. A campaign member is
  a junction row whose whole meaning is "this person is enrolled in this
  campaign"; once the person is gone the row denotes nothing, so deleting a lead
  or a contact now removes that person's campaign memberships with them.
  `restrict` would have produced an accurate message but left the person
  undeletable until someone un-enrolled them by hand, and the problem being fixed
  is undeletable people, not confusing text.

  **What changes for you:** deleting a lead or contact silently removes their
  `crm_campaign_member` rows, so a campaign's member count and response-rate
  metrics drop accordingly — deliberately, since the person is gone. Memberships
  naming anybody else, and the campaign side of the junction, are untouched: the
  required `crm_campaign` lookup still refuses to delete a campaign that has
  members, because a campaign's member list is its historical record. Refs #696.

- a67f15e: Campaign Member detail pages now show the **Basic Information** section again.

  Every field in that group was already on display in the page header — the member
  number is the record title, and Campaign / Lead / Contact are the first three
  entries of the highlight strip — so the group had nothing left to render below
  the header and disappeared from detail pages while still appearing on forms.
  The **Added Date** enrollment stamp moves from _Response Tracking_ into _Basic
  Information_, where it reads better anyway: it records when the membership was
  created, not how the person responded. _Response Tracking_ keeps the response
  lifecycle (First Opened, First Clicked, Response Date, Has Responded).

  Nothing changes in the campaign's Members list or in the member header — the
  highlight strip is deliberately untouched, because those same fields are what
  give the members panel on a campaign its Lead / Contact / Status / Response Date
  columns.

- 4d48779: Make a blocked delete name the record that actually blocked it. A cascade guard
  answered with the child's own point of view, so the refusal named an object — and
  sometimes an operation — the caller had never touched:

  ```
  DELETE /api/v1/data/crm_account/<id>
  → 400 "Cannot delete contact: still referenced by 1 open opportunity(ies), …"

  DELETE /api/v1/data/crm_opportunity/<id>
  → 400 "Cannot edit a converted lead (attempted: converted_opportunity).
          Make changes on the converted records instead."
  ```

  Both refusals were correct — the records really were still referenced — but the
  first told an account deleter they had asked to delete a contact, and the second
  reported a _delete_ of an _opportunity_ as an _edit_ of a _lead_, advising the
  caller to go and change the record they had just tried to remove. Either way the
  reader went looking at the wrong record.

  Each guard has two invocation contexts and no way to tell them apart. The contact
  delete guard runs on a direct delete **and** as a cascade child of an account
  delete; the converted-lead, closed-opportunity and frozen-quote locks run on a
  hand edit **and** on the engine's referential clear, which implements `set_null`
  by _updating_ the row that holds the lookup. Measured on 17.0.0-rc.2, the hook
  context carries no cascade marker at all — so every refusal is now phrased from
  the **blocking relationship**, which is true in both contexts:

  ```
  Contact Ada Lovelace (<id>) is still referenced by 1 open opportunity(ies),
  0 active quote(s), 0 active contract(s), so it cannot be deleted — and neither
  can its account, because deleting an account deletes its contacts. Close or
  reassign those records first.

  Converted lead Bo Chen (<id>) is locked, so its link(s) converted_opportunity
  cannot be cleared — which also blocks deleting the record(s) they point at.
  Delete the lead first, or have an admin clear the link with a system write.
  ```

  The same construction was found on two guards the report did not cover, both
  reachable with the same two REST calls: deleting a contact that a **closed**
  opportunity names as its primary contact, and deleting an opportunity an
  **accepted** quote references. Those refusals now name the frozen record and the
  link too, and every lock still names the record it refuses plus the fields that
  were attempted when the write really was an edit.

  **Nothing about what is refused changes** — the same deletes are still blocked,
  for the same reasons, and the same records survive. This is wording only. Refs
  #693.

- 4d7307f: Correct where the `allowExport` permission is actually enforced, in the Import & Export guide and in the permission-set notes.

  The guide told readers that the Cases export grant "is aimed at report export, which rides on the platform's `reports` capability" — and, since HotCRM does not require that capability, that the grant had nothing behind it. Measured against a running server, that is wrong: bulk export runs on a single server-side route (`GET /api/v1/data/:object/export`), which the list view's Export button calls and which anyone may call directly. A role holding the grant gets the rows; a role without it is refused with `EXPORT_NOT_PERMITTED`. Cases simply has no Export button, because no Cases list view declares `exportOptions` — the grant itself works over the data API.

  Reports are not an export surface in this app at all: a report page renders its chart and table and offers no download. The three localized copies of the guide carried the same claim and are corrected together.

  Also adds a guard so the question the old text got wrong now has an answer in CI: every object carrying `allowExport` must leave `export` enabled on its API, so a grant can never be authored behind a route the object has switched off.

- 44067a0: Give inbound cases an owner, and make the case that has none visible.

  A web-to-case submission arrived ownerless by design — the guest-sanitisation
  branch of `case_sla_defaults` strips a client-supplied `owner_id`, correctly,
  because a public form must not choose its own owner — and then had nowhere to
  go. ObjectStack has no queue engine (`sys_queue` does not exist; the `queue`
  sharing-recipient and approver enum members are deprecated upstream), and
  HotCRM had no substitute for cases, so an inbound case landed with nobody
  accountable for it and no view that could even list it. Non-portal cases were
  unaffected: those default to their creator.

  Two things ship together, because either alone leaves a silent state.

  **`case_auto_assign`** assigns an ownerless new case to the service agent with
  the fewest OPEN cases — a load-balanced round-robin needing no rotation
  counter, copied from the `lead_auto_assign` precedent that already does this for
  inbound leads. The pool is whoever holds the `service_agent` position
  (`sys_user_position`). It writes `owner_id`, the one ownership column since
  #548, so the assigned agent really owns the case rather than being named on it.
  Load counts exclude `resolved` and `closed` (not `is_closed`, which only flips
  on `closed` and would keep finished work counting against an agent — the same
  `$nin` predicate `case_sla_monitor` settled on). It runs at priority 250, after
  the guest strip at 200: `lead_auto_assign` shipped below its strip and had every
  web-to-lead assigned and then un-assigned, so the ordering is pinned rather than
  assumed.

  **`Unassigned — triage`**, a pinned list view on `crm_case`, is the other half.
  The pool is EMPTY on a fresh install — `sys_user_position` membership is runtime
  data — and assignment also stands down when the read is denied, which is the
  normal anonymous-form case. Both leave the case ownerless, which is the right
  behaviour (intake must never be blocked) and was previously invisible. The view
  filters `owner_id is_null` and excludes closed cases, so its row count is the
  intake backlog. Label and empty state are authored in all four locales.

  ⚠️ Who sees rows in that view is decided by record-level access, not by the
  view: `system_admin` and `sales_manager` see the whole backlog, service
  manager/director see the critical open slice through the existing criteria
  rules, and a `service_agent` — `readScope: 'own'` on `crm_case` — sees none,
  because an unowned row is owned by nobody. The empty-pool state is an admin
  problem (only an admin can staff `sys_user_position`), so the admin is the
  right first audience; making an agent able to pull from triage is a
  sharing-model change and is filed as #1096 rather than ridden in here.

  No permission-model change. Stamping another user's `owner_id` is a transfer,
  denied by the platform's #3004 guard without `allowTransfer`, and whether that
  gate applies is a property of the SEAM rather than of the object — so it was
  measured rather than inherited: against a real ObjectQL with a recorder on the
  same middleware seam the security plugin uses, a `crm_case` insert whose
  `beforeInsert` hook stamped `owner_id` reached the middleware with no `owner_id`
  at all, while the stored row carried the assigned agent. `crm_case.allowTransfer`
  is therefore neither needed nor granted. The measurement is pinned, with a
  negative control, in `test/case-assignment.test.ts`; if a platform release ever
  moves the guard downstream of the hook phase, that test goes red rather than the
  feature failing quietly in production.

  ⚠️ This is explicitly an **app-level stopgap**. It lives alone in
  `src/objects/_case-assignment.ts` — the single home for "who should own this
  case", so the escalation-reassignment work in #1070 extends it instead of
  authoring a second ownership path — and that module is the code to delete, not
  adapt, when a platform queue or assignment-rule engine lands. Fixes #596.

- 3912845: Add an **Export** button to the Cases list view.

  The four roles that may export Cases — Sales Rep, Sales Manager, Service Agent and
  System Admin — have held a live `allowExport` grant on `crm_case` all along, but no
  Cases list view declared `exportOptions`, so the only way to use the grant was to call
  the data API directly. The Cases list now offers CSV and Excel from its toolbar, the
  same way Accounts, Contacts, Leads and Opportunities already do. Nothing about who may
  export changed: the button and the API call the same server-side route, and a role
  without the grant is refused either way.

  Reports are no longer treated as an export surface in the permission-coverage guards.
  A report page renders a chart and a data table and offers no download, so counting it
  as one meant a new report could make the suite demand bulk-export rights on an object
  whose users had no way to export it.

- b94b624: Enforce case-number uniqueness on deployments that have no organization set.
  `crm_case` declared it as a hand-written table composite,
  `indexes: [{ fields: ['organization_id', 'case_number'], unique: true }]`, and a
  declared index is materialized verbatim — so it became plain
  `UNIQUE (organization_id, case_number)`. SQL UNIQUE treats NULLs as distinct, and
  `organization_id` is NULL on every row of a single-organization or untenanted
  install, so on those deployments the index constrained nothing at all:

  ```
  UNTENANTED, two cases both numbered CASE-00001
    before → second insert ACCEPTED   (index never engages; NULL ≠ NULL)
    after  → second insert REJECTED
  ```

  That mattered here more than on any other object because `case_number` is an
  autonumber (`CASE-{00000}`) whose sequence is keyed per tenant — each
  organization counts from 1. The sequence was already scoped per organization
  while the constraint was not enforced on the untenanted rows, so duplicate case
  numbers were prevented only by the accident that a single-organization install
  happens to run a single sequence.

  Uniqueness is now declared on the `case_number` field itself (`unique: true`),
  the same spelling `crm_account.name`, `crm_contact.email` and `crm_product.sku`
  already use. The field-level form is per-organization (framework#3696) and its
  organization key part is NULL-safe as of platform 17.0.0-rc.4 —
  `COALESCE(organization_id, '__global__')` (ADR-0120 D3) — so rows with no
  organization form one bucket instead of each escaping the constraint.

  No behaviour changes for a multi-organization deployment: two organizations can
  still each hold `CASE-00001`, and a duplicate within one organization is still
  rejected. The old spelling was also the bare `unique: true` form that ADR-0120
  warns on in 17.x and protocol 18 rejects, so this additionally clears both
  `pnpm validate` warnings on the object. Measured end-to-end against a real
  SQLite database in `test/case-number-tenant-scope.test.ts`, which also re-measures
  the old spelling so the hole it left stays a measurement rather than a claim.
  Refs #1023.

- 64ec0d4: Service docs: the case detail header bullet and the first-response stamp now match the app.

  `content/docs/service/cases` described the case detail header as carrying a status badge, a
  priority badge and an **SLA countdown**. None of the three is there. The header renders the
  case number and subject as its title, the account as its subtitle, an icon, a breadcrumb and
  the action buttons — and nothing in this app computes time remaining or time over, so there is
  no countdown to render anywhere on the case. **Status** and **Priority** are ordinary fields in
  the **Key Information** highlights strip below the header, alongside SLA Due Date, SLA
  Violated, Owner and Account; that strip is now a bullet of its own instead of being folded into
  the header. This also settles a straight contradiction with `content/docs/service/sla-and-escalation`,
  which already said there is no countdown and that the header carries the case number, subject
  and account only.

  The same page said **first response time** was "stamped the first time an agent comments or
  replies". Neither action stamps it. `first_response_date` has exactly one writer,
  `logActivityAction`, and it stamps when a call or meeting that **already took place** is logged
  on the case (**Log a Call** / **Log a Meeting**), only while the field is still empty. A
  comment, an outbound email, a status change and a meeting that is merely _scheduled_ all leave
  it untouched — so a case worked entirely through comments and email keeps an empty field.

  The **Status path** bullet beside the header one was re-checked against the page metadata and
  is accurate, so it stays as written. English, Simplified Chinese and Traditional Chinese.
  Documentation only — no metadata changed.

- 7003858: Service docs: the three remaining "when you open a case, you'll see" bullets now match the page metadata.

  `content/docs/service/cases` promised a **Customer panel**, a **Related** tab carrying four kinds of
  record, and an **AI Reference Rail**. Measured against `src/pages/case_detail.page.ts`, that page
  declares two regions and nothing else — a header holding the page header, the Key Information
  highlights strip and the status path, and a main region holding one tab strip. There is no third
  region, no side panel and no AI component anywhere on it.

  - **Customer panel** — no such component. The **account** is on the page three times over (header
    subtitle, Key Information strip, and a field in the _Details_ tab) and the **primary contact** is a
    field in that tab's _Case Information_ section, so the bullet now points at where those two
    actually are. **Contract tier** and **open cases this month** have no carrier at all: a case links
    to no contract, `crm_contract` has no tier field either (the nearest real field is **Customer
    Tier** on the account, which this page does not show), and nothing in this app counts a customer's
    cases by month.
  - **Related** — one list, not four. The tab is an accordion with a single item, **Open Tasks**: the
    `crm_task` records pointing at the case through **Related Case** (`related_to_case`), filtered to those not yet
    _Completed_, ten at a time. Attachments are enabled on the object but no component on this page
    lists them; `crm_case` has no opportunity relationship in either direction; and the case's three
    milestones — _escalated_, _resolved_, _closed_ — are `activityMilestones` that land as entries in
    the **Activity** timeline, not as records on this tab.
  - **AI Reference Rail** — no rail of any kind. The service skills are real and the page already
    describes them further down, but they are reached by asking, not from a panel beside the case. The
    one reference rail this app renders is on the opportunity detail page, and it lists related records
    rather than suggestions.

  Each name is kept and answered rather than silently deleted, following the same approach as the
  earlier case and SLA passages. Whether this page _should_ grow a customer panel or an assistant rail
  is a product question this leaves open, as is the "Copilot" wording itself. English, Simplified
  Chinese and Traditional Chinese. Documentation only — no metadata changed.

- 8308baa: Service docs: _What a case record stores_ now separates the three things that organise a case's fields, and the _Details_ tab stops promising all of them.

  `content/docs/service/cases` opened its field section with "the detail screen is organised into
  6 sections" and a six-row table. No screen in this app has those six sections. The six **names**
  are real — they are `crm_case`'s `fieldGroups` (`src/objects/case.object.ts`), the object's own
  filing scheme for its fields — but the detail screen and the form each declare sections of their
  own and render three apiece: _Case Information_ / _Status & SLA_ / _Description_ on the **Details**
  tab (`src/pages/case_detail.page.ts`), and _Case_ / _SLA_ / _Resolution_ on the tabbed form
  (`src/views/case.view.ts`). The section now keeps all six names, says what they actually are, and
  gives the three layouts as three tables instead of one merged fiction.

  Five of the six field-group rows were also wrong on their own terms: **Parent Case** is in _Case
  Information_, not _Origin & Routing_; **Status** and **Case Type** are in _Case Information_, not
  _SLA & Priority_; **Closed Date** is in _SLA & Priority_, not _Resolution_; and _System_ holds
  **Internal Notes** and **Is Closed** — there is no _audit trail_ field on a case at all. Only
  _Escalation_ was accurate. **Priority Rank** belongs to no group, which the table now says.

  The **Details** tab bullet said it carries "all metadata fields". It carries **16** of `crm_case`'s
  **28**. The twelve it does not carry are named, including **First Response Date** — the field the
  _What happens automatically_ section above explains at length, which a reader following "all
  metadata fields" would go to this tab to find and not find. Nine of the twelve are on the form
  instead; **Escalated Date**, **Priority Rank** and **Display Title** are on no case screen.

  English, Simplified Chinese and Traditional Chinese. Documentation only — no metadata changed.

- bbb140d: Demo campaigns and knowledge articles now get an owner, so the marketing and service edit grants actually work

  Seeded rows arrive owned by nobody — a seed cannot name a user — and the
  `demo_bootstrap` sweep is what gives them one on first boot. It claimed nine
  objects and skipped two: `crm_campaign` and `crm_knowledge_article`.

  Those two hid longer than the rest because their org-wide default is
  `public_read`. Their rows read normally for everybody, so nothing looked wrong —
  no empty list, no error, no blank page. But `public_read` opens the read
  baseline only; a **write** still needs the caller to own the record or hold a
  share. `marketing_user` is granted `crm_campaign` edit and `service_agent` is
  granted `crm_knowledge_article` edit, both without _Modify All Records_, which
  means their write reach is "records I own". Against a permanently ownerless row
  that is no records at all: every seeded campaign and every seeded article
  answered **403 on save** for everyone except a system administrator, while the
  permission screen said the edit was allowed. The same rows also stayed out of
  every "My …" list, rendered a blank owner on any owner-grouped report, and could
  not receive an owner-addressed notification.

  Both objects are now claimed alongside the other nine, so a demo org comes up
  with no seeded row left ownerless. Ownership of demo seed data goes to the org's
  first user, the same convention every other seeded object already follows —
  whether a real deployment's article owner should mean its _author_ or its
  _maintainer_ is a product question this does not answer, and real deployments
  assign ownership through import or territory rules before the sweep has anything
  to pick up.

  Existing demo databases heal themselves: the sweep runs every ten minutes and
  claims whatever is still ownerless on its next pass — no reset required. Records
  that already have an owner are never reassigned.

- 1e25cb7: Pin the cold-boot flow re-bind: every authored flow must register through the
  real automation engine, in `pnpm test`, with the whole validation error.

  Through 17.0.0-rc.1 every boot of this app emitted **24 warnings — one per
  flow** — from the automation service's `kernel:ready` re-bind, and each one
  printed the single character `[`. The re-bind is additive, and the boot pull
  had already registered the flows, so automations kept firing and the noise read
  as cosmetic. It was not: any host that boots from the stored view alone (a
  metadata reload, a `sys_metadata`-first host) has only that path, and would
  have inherited a flow set of **zero**, silently.

  Both halves were platform-side, and only one of them is fixed.

  `registerFlow` parses with `FlowSchema`, which #4001 closed — an unrecognized
  key throws instead of being dropped. `err.message` was therefore a Zod issue
  array, and interpolating it into a one-line `logger.warn` left only its opening
  bracket. The full text, once read, named a key **this app never wrote**:

  ```
  [ { "code": "unrecognized_keys", "keys": [ "_diagnostics" ], "path": [], … } ]
  ```

  `getMetaItems({ type: 'flow' })` decorates every served item with
  `_diagnostics`, and the bind fed that served document straight back into the
  strict schema — the read path failing its own output. 17.0.0-rc.2 fixed it at
  the read seam (`stripReadDecorations`, cloud#971) rather than by loosening
  `FlowSchema`, so the upgrade in #663 already cleared all 24 warnings here; on
  current `main` the boot reports `Bound 24 flow(s) from the protocol at
kernel:ready`. **No HotCRM metadata was ever at fault, and none is changed.**

  The truncated warning itself is still live in rc.2 — the next flow that fails
  to bind reports the same unreadable `[` — and is filed upstream, because a log
  line in `@objectstack/service-automation` is not this app's to fix.

  What _is_ this app's to fix is never being the thing that log line hides. Adds
  `test/flow-cold-boot-rebind.test.ts`, which runs every flow in `allFlows`
  through the exact `AutomationEngine.registerFlow` call the re-bind makes —
  JSON-round-tripped first, since the re-bind sees the stored document and not
  the TypeScript object — and reports the **complete** Zod issue array on
  failure. It also reconstructs the #653 class directly: a read-decorated flow
  must still be rejected (proving the schema stays closed, so a genuine authoring
  error cannot hide either) and must become registrable again after
  `stripReadDecorations` (proving the rc.2 remedy is still the remedy, keyed off
  `METADATA_READ_DECORATIONS` so a decoration added later is covered too).

  Refs #653.

- 3940736: Dedupe contact email addresses within the organization, not across every
  organization on the deployment. On a hosted deployment where many customer
  organizations share one database, every customer after the first signed up to
  an empty address book: the `contact_integrity` hook looked an address up with
  no organization scope, so each new organization's copy of the sample data met
  the first organization's contacts and was refused row by row —

  ```
  Another contact (…) with email john.smith@acme.example.com already exists.
  ```

  Measured on a two-customer deployment, the second and third customers landed
  0 of 9 contacts and 0 of 4 contracts (a contract requires a contact), plus
  partial quotes (3 of 5), quote line items (10 of 16), campaign members (29 of 51) and event attendees (3 of 27). After this change every customer holds the
  complete copy: 9 / 4 / 5 / 16 / 51 / 27.

  No data was ever exposed across customers — the platform's tenant wall held
  throughout, and the same measurement re-run after the fix still shows no row,
  reference or record id shared between customers. The rule itself is unchanged
  and is the one the documentation already stated: an address is unique **within
  your organization**, spanning every account in it, matching the
  `(organization_id, email)` unique index `crm_contact.email` declares. Two
  different organizations may each know the same person; a second contact with
  that address inside one organization is still refused.

- b551f15: Contact documentation now states the email rule that actually ships: an email
  address is unique **per organization**, not "within the same account".

  `content/docs/sales/contacts.mdx` and its two Chinese translations promised that
  "an email address must be unique within the same account" and that "the same
  person can appear under multiple companies (a board member, for example)". Both
  halves were wrong, and the second one walked the reader straight into an error:

  - `crm_contact.email` carries field-level `unique: true`, which since framework
    #3696 materializes as the tenant composite `(organization_id, email)` — one
    address per organization, across every account in it.
  - The `contact_integrity` hook (`src/objects/contact.hook.ts`) looks the address
    up with **no account scope** and rejects the duplicate first, with
    `Another contact (…) with email … already exists.`, so the friendly check is at
    least as strict as the index.

  So the documented board-member workflow — the same person under two companies —
  is exactly the write the product refuses. The rule lines now read like the
  corrected `crm_account` ones (#625 / #646): unique within your organization,
  another organization may hold its own contact at the same address, the address is
  normalised to lower case before it is stored and compared, and a person you deal
  with at two companies needs a different address on each contact record.

  Documentation only — no metadata, hook or constraint changed. Whether "one
  person, two companies" _should_ be supported is a separate product question; this
  change only stops the docs describing a write that fails.

  Fixes #648.

- d17e5f2: Drop the raw salutation value from Contact and Lead name formulas so records no longer render as "ms Emily Davis".

  `crm_contact.full_name` (and `crm_lead.full_name` / `display_title`) joined `record.salutation` ahead of the name fields. `salutation` is a picklist, so a formula sees the stored VALUE (`mr`, `ms`, `dr`) rather than the label, and every contact and lead rendered with a lowercase prefix in list views, detail titles, and lookups. The formula language offers no proper-case or option-label lookup, and hardcoding `"Ms."` would bake English into a stored value, so the name is now built from `first_name` + `last_name` alone (the Salesforce convention); `salutation` remains its own field and keeps its translated label on forms and detail pages.

- 0ac226e: Rewrite the Contracts page's "On contract activation" section against the hook
  that actually runs, in all three languages. Three of its four steps had no
  implementation behind them, and the one thing activation really does was missing.

  `contract_on_activation` (`src/objects/contract.hook.ts`) does exactly two things
  when a contract's status changes to _Activated_: it stamps **Signed Date** on the
  contract when the contract carries none yet, and it sets the account's **type** to
  _Customer_ when the account is not already one. The page documented neither the
  signed-date stamp nor the true promotion condition, and promised three things
  instead:

  - a **Customer Since** date stamped on the account — `crm_account` has no
    `customer_since` field, and no field of any name records when an account became
    a customer, so the cohort report a reader would build on it cannot exist;
  - a **welcome email** to the primary contact, "(configurable)" — no outbound
    customer mail is sent at activation and there is no setting behind one, the
    same promise `content/docs/sales/contacts.mdx` made and lost in #796;
  - a **notification** to the account owner — the hook raises none, for the account
    owner or the contract owner. The two contract `notify` nodes that do exist
    belong to the daily expiration and renewal sweeps, not to activation.

  The surviving step is also stated more tightly than "if it was a Prospect": the
  hook promotes every account that is not already a _Customer_, so a _Partner_ and a
  _Former Customer_ are promoted too. Two mechanics that decide whether anything
  happens at all are now written down — the writes run after the save with failures
  logged rather than raised, and they hang off an **update**, so a contract that
  arrives already _Activated_ (data import, seed data, an integration writing the
  record in one shot) triggers neither and leaves its account a _Prospect_.

  The admin tip on the same page is corrected with it: contract activation is an
  object hook, not a flow, so an admin who followed it to the flow list found
  nothing to customize.

  Documentation only — no metadata, behaviour or field changes. Whether HotCRM
  _should_ send a welcome email or carry a `customer_since` field is a product
  decision and stays open; this change only stops the docs from claiming it already
  happens. Fixes #805.

- 16f8952: Rewrite the three remaining fabricated passages on the Contracts page against the
  flows and the object that actually run, in all three languages. #805 fixed only
  the activation section; these three were on the same page, and none of them was
  caused by that change.

  **The expiration sweep sends one notification, not two.** The loop body of
  `src/flows/contract-expiration.flow.ts` holds exactly two nodes — `mark_expired`
  and `notify_owner`, whose recipient list is `{currentContract.owner_id}` alone.
  Nothing in the flow reads the account's owner, so the page's third step
  ("Notification to the account owner") described a message nobody ever receives —
  the failure mode where an account owner believes they will be told a contract has
  lapsed. The page now says the contract owner is the only recipient and that
  anyone else has to be arranged by an admin, and adds the two facts that decide
  whether a given contract is touched at all: the sweep reads _Activated_ contracts
  only, and takes at most 500 per run.

  **The renewal reminder has no one-click action, and it does more than remind.**
  `notify_owner` in `src/flows/contract-renewal.flow.ts` carries
  `actionUrl: '/crm_contract/{currentContract.id}'` — the contract detail page.
  There is no "Create Renewal Opportunity" button on it, and opening it creates
  nothing; the renewal opportunity is created _by the flow itself_, unprompted, when
  `auto_renewal` is on and the account has no open renewal deal. The section now
  lists what the sweep does in the order it does it — the renewal task it files
  first (which the page never mentioned), the notification, and the conditional
  renewal opportunity with the values it copies — plus the idempotency the task
  provides: an open _Renewal due_ task means the day is already handled, and
  completing it lets the next morning file a fresh one. The 120-day look-ahead is
  written down too, because it caps notice windows set longer than that.

  **Four field names on the record table do not exist.** `activation_date`,
  `renewal_terms`, `account_exec` and `order_form` are each zero hits under `src/`.
  Following #792, the table is rebuilt from the six `fieldGroups` declared in
  `src/objects/contract.object.ts`, so it is now the full inventory rather than an
  invented one, with the required fields called out. The four absent names are
  addressed head-on rather than quietly dropped, since a reader who went looking for
  them deserves to know where the capability really lives: activation stamps
  **Signed Date**, renewal instructions belong in **Special Terms**, ownership is the
  single **Contract Owner** lookup, and **Contract Document** is a URL — the executed
  PDF is an attachment on the record, and there is no _Order Form_ field.
  _Renewal Terms_ was recommended a second time further down the same page, in the
  Renewals section and in the tips for contract owners; both now point at Special
  Terms. The zh pages take **计费周期 / 計費週期** for billing frequency from the
  locale pack, matching the field-group headings the table now uses.

  Documentation only — no metadata, behaviour or field changes. Whether Contract
  _should_ carry an activation date, a renewal-terms field, an account exec or a
  file-typed contract document is a product decision and stays open. Fixes #826.

- 6cd53d2: Rewrite the four remaining passages on the Contracts page that describe something
  `src/` does not contain, in all three languages. #826 (PR #831) settled three
  other passages on the same page; these four are independent of those, and none of
  them was caused by that change.

  **The five "standard list views" are five names for nothing.**
  `src/views/contract.view.ts` saves exactly one list — `all_contracts`, with no
  filter on it — and offers that same data in four visualisations
  (`appearance.allowedVisualizations` plus `tabs[]`): the grid, a renewal calendar
  placed on `end_date`, a gantt from start date to end date, and a quarter-scale
  timeline grouped by account. Following #792's treatment of the sales list-view
  rosters, the section is rebuilt as one dataset drawn four ways, each tab
  described by the columns, sort and colouring it really uses. The point a reader
  needs most is now stated outright: none of the four filters anything, so _My
  Active Contracts_, _Expiring in 60 Days_, _Up for Renewal_, _Expired This Month_
  and _Pending Activation_ do not exist and never did — narrowing the list is
  something you do on the grid columns yourself, and what watches renewal dates is
  the daily renewal reminder, not a saved view.

  **Three picklist values the page offered cannot be picked.** Billing Frequency is
  `monthly` (default), `quarterly`, `annually` and `one_time` — there is no
  _Custom_. Payment Terms is the canonical set shared with Quote in
  `src/objects/_picklists.ts`: `net_15`, `net_30` (default), `net_60`, `net_90`
  and `due_on_receipt` — no _Net 45_, no _Prepaid_. Both lists are now the ones the
  form offers, the absent values are named as absent so a reader stops hunting for
  them, and the zh pages take the option labels from the locale pack (按月 / 按季度 /
  按年 / 一次性, 15 天账期 … 货到付款). Since that payment-terms set is shared, the
  quotes page was checked in the same pass: `content/docs/sales/quotes.mdx` already
  lists exactly the five real values, so the distortion is confined to Contracts.

  **"Activated contracts cannot be deleted" was a guardrail nobody built.** Contract
  has no `beforeDelete` hook and no status check anywhere — deletion is decided by
  the profile alone, and the profile never looks at the status: a System
  Administrator can delete any contract, activated ones included, while Sales
  Manager and Sales Rep can delete none, not even a draft. That sentence is gone.
  In its place the section now carries the rules that really do reject a save — the
  `end_after_start` validation rule, and the two throws in
  `src/objects/contract.hook.ts`: a term more than one month away from the date
  range, and any edit that pulls an activated contract's end date in. Two things
  often read as rules are separated out as not being rules: the zero-or-positive
  contract value is the field's own `min: 0` rather than a validation rule, and the
  `contract_status_progression` state machine is declared at **warning** severity —
  measured in `@objectstack/objectql`, a non-`error` verdict is logged and the save
  proceeds — so Draft jumping straight to Activated, or an Expired contract being
  revived, is written to the server log and saved anyway. Naming that honestly
  matters more than the transition table: the whole defect class here is a reader
  believing in a gate that is not there.

  **The tip for sales reps taught them to do what the object refuses them.**
  `src/profiles/sales-rep.profile.ts` grants `crm_contract` read-only
  (`allowCreate: false, allowEdit: false`, own records), so "when you create the
  contract" was addressed to the one persona who cannot. Nor is the opportunity
  link ever pre-filled: `crm_contract.crm_opportunity` carries only
  `dependsOn: ['crm_account']`, which filters the picker, and no `defaultValue`.
  What actually happens is that accepting the quote drafts the contract —
  `quote_on_accepted` in `src/objects/quote.hook.ts` inserts a Draft contract
  carrying the quote's account, contact, opportunity, owner and total on a
  12-month term — so the link is copied from the quote rather than filled in on a
  form, and it lands in the rep's name as a record they can read but not edit. The
  tips now say who creates contracts, how the link really arrives, and that nothing
  reads it for reporting today, since HotCRM ships no contract report or dashboard.

  Documentation only — no metadata, behaviour, permission or picklist changes.
  Whether Contract should gain a Custom billing frequency, Net 45 or Prepaid terms,
  a delete guard for activated contracts, or a create grant for sales reps are all
  product decisions and stay open. Fixes #832.

- 0550c5f: Rewrite the _Manual termination_ and _Sharing_ passages on the Contracts page
  against the profiles, the status machine and the engine, in all three languages.
  #832 (PR #874) settled four other passages on the same page and, while measuring
  the state machine for one of them, established the result that contradicts these
  three sentences outright — the page currently answers the same question two
  different ways in two adjacent sections.

  **"The owner can change status to Terminated" is false for the most common
  owner.** Edit on `crm_contract` is an object-level right and ownership does not
  extend it: `src/profiles/sales-rep.profile.ts` grants the object
  `allowEdit: false` (read-only, own records), while `sales-manager.profile.ts` and
  `system-admin.profile.ts` are the two profiles that hold edit. The gap lands on
  the common case rather than an edge one, because the contract a rep ends up
  owning is the one `quote_on_accepted` drafts for them — `src/objects/quote.hook.ts`
  copies the quote's `owner_id` onto the new contract — so the rep whose deal it
  was owns a record they can read and cannot touch. The section now says who may
  terminate a contract, and that owning it is not what qualifies you.

  **"Terminated contracts can't be reactivated" is a gate nobody built.**
  `contract_status_progression` does declare `terminated` a dead end
  (`src/objects/contract.object.ts`), but the whole rule is `severity: 'warning'`,
  and a non-`error` verdict is logged and the save proceeds — the behaviour PR #874
  measured in `@objectstack/objectql` and wrote into this page's _Built-in rules_
  section. Moving a terminated contract back to Activated therefore writes a line
  to the server log and saves. The advice is kept, because one-way is what the
  status means and how everything downstream reads it, but the page now says
  plainly that nothing enforces it and that enforcing it is something an admin has
  to author. The two sections now give one answer instead of two.

  **"The contract owner reads and edits their own contracts" conflated the two
  access layers.** Record-level sharing decides which records you reach; whether
  you hold edit at all is decided a layer earlier by the profile's object-level
  CRUD, so widening the record side never gets a Sales Rep past the object gate.
  The bullet now separates the layers and states the direction of that
  relationship. It describes only the behaviour measured today and takes no
  position on #549, which is still open on the read side.

  Documentation only — no metadata, profile, permission or validation-rule changes,
  and nothing in `src/` was touched. Whether Contract's status machine should be
  raised to `error` severity, and whether a Sales Rep should be able to edit a
  contract they own, are both product decisions and stay open. Fixes #872.

- 92b94e7: Bring the Chinese contracts pages' closing _Sharing_ paragraph up to the
  measured `controlled_by_parent` reach, so zh readers stop getting the pre-#694
  account-scoped story.

  `content/docs/revenue/contracts.mdx` was rewritten in #699 to say that neither
  route an admin can take actually delivers "contracts follow the account" today:
  a sharing rule on Contract widens the records it matches for every holder of the
  object, and a Controlled-by-Parent OWD derives org-wide in this release — the
  parent link is not consulted per caller. That rewrite landed on the English page
  only. `contracts.zh-Hans.mdx` and `contracts.zh-Hant.mdx` still told readers the
  two routes merely "open contract visibility to every user of the object", which
  omits the conclusion the correction exists to deliver: the narrow route the
  reader is looking for does not exist.

  Both translated paragraphs now carry the same three facts as the English page,
  and both point at the _Controlled by Parent, in practice_ section of
  `content/docs/administration/sharing-and-security.mdx` by its translated section
  name — `“由父级控制”在实践中` / `「由父層控制」在實務中` — on top of the
  page-level link they already had. No new anchor link is introduced: the
  translated headings do not slugify to the English anchor, so the zh pages keep
  the un-anchored form used since the #868 anchor sweep, and the English page
  itself cites the section as plain text too.

  Documentation only, Chinese pages only. No English page, metadata, profile,
  sharing-rule or OWD change — the reach being described is unchanged and stays
  pinned by `test/parent-derived-reach.test.ts`.

- 0899b4f: Completes the `controlled_by_parent` doc-truth correction over the sites the first
  batch's file surface did not reach. Prose and comments only — every OWD, sharing
  model, sharing rule, RLS policy and profile grant is byte-identical.

  Same measurement as the first batch, pinned by `test/parent-derived-reach.test.ts`
  on 17.0.0-rc.2: the ADR-0055 derivation resolves the master id set through the
  master's row-level security policies only, under a system context — ownership
  scope and `sys_record_share` grants are never folded in — so a parent-derived
  child is readable by every holder of object-level read on it, and the
  parent-write gate is exactly as wide.

  Corrected:

  - `src/objects/event_attendee.object.ts` claimed reads are filtered to attendees
    whose `crm_event` the caller can read and that "an attendee row is therefore
    never more visible than the meeting it belongs to". `crm_event` is private and
    reps hold it own-only, so this was the widest gap between documented and
    shipped reach in the app.
  - `src/objects/opportunity_line_item.object.ts` claimed reads are filtered to
    lines whose `crm_opportunity` the caller can read — the twin of the
    `crm_quote_line_item` wording already corrected. It now also names the one RLS
    policy this app authors on a master (the private-deal filter on
    `crm_opportunity`, carried by the `sales_manager` and `marketing_user` sets),
    which is the only thing that narrows a derived master set here.
  - `src/objects/campaign_member.object.ts` claimed reads are filtered to members
    whose `crm_campaign` the caller can read. Because `crm_campaign` is
    `public_read` the practical read delta is small — a caller holding campaign
    read already reads every campaign — so the note says that rather than
    overstating it, and records that the write side genuinely does narrow through
    the platform's `member_default` owner-only-writes policy.
  - `src/profiles/sales-manager.profile.ts` and
    `src/profiles/marketing-user.profile.ts` described attendee, member and line
    item rows as following the event / campaign / deal.
  - `content/docs/administration/profiles.mdx` told admins a rep's contacts follow
    the accounts they can see, and that line item control is scoped to the rep's
    own deals and quotes.
  - `content/docs/administration/sharing-and-security.mdx`: the Campaign Member OWD
    row said "membership follows the campaign", and the corrected section said
    HotCRM authors no master RLS policy at all — it authors exactly one.
  - `content/docs/revenue/contracts.mdx` offered a Controlled-by-Parent OWD as the
    way to make contracts follow the account; in this release that derives
    org-wide, which is not what the sentence promised.

  The narrow "filtered to readable parents" semantics is the intended one. The
  platform gap is tracked upstream as objectstack-ai/objectstack#5386; the guard
  test goes red the moment the derivation narrows, which is the signal to rewrite
  these sites and re-take the OWD decision (#549).

  Refs #694.

- 0899b4f: The docs and code comments describing `controlled_by_parent` now say what the platform actually does: a parent-derived child is readable org-wide, not filtered to the parents the caller can read.

  No behavior changes — every OWD, sharing model, sharing rule and profile grant is
  byte-identical. What changed is that three prose sites stopped claiming the
  opposite of measured reality.

  `test/parent-derived-reach.test.ts` boots the shipped stack (ObjectQL +
  `plugin-security` + `plugin-sharing`) over this app's own metadata and measures
  what a `sales_rep` gets back. On 17.0.0-rc.2 a rep who can read exactly ONE
  account reads BOTH accounts' contacts, and a rep who can read NO quote at all
  still reads every quote's line items. The ADR-0055 derivation resolves the master
  id set through the master's row-level security policies only, under a system
  context — ownership scope and `sys_record_share` grants are never folded in — and
  HotCRM authors no RLS policy on any master, so the master set is every record.
  The write gate resolves the master through that same filter, so it is exactly as
  wide.

  Corrected:

  - `src/objects/quote_line_item.object.ts` claimed "reads are filtered to lines
    whose `crm_quote` the caller can read".
  - `src/profiles/sales-rep.profile.ts` claimed a rep's territory account carries
    its contacts, and that the parent derivation is what scopes line items to the
    rep's own book. Every `controlled_by_parent` grant in that set is org-wide read
    today.
  - `content/docs/administration/sharing-and-security.mdx` told admins contacts
    "follow the account", that a manual share carries its parent-derived children,
    and that a Controlled by Parent record is granted when its parent is visible.

  The narrow "filtered to readable parents" semantics is the intended one. The
  platform gap is tracked as objectstack-ai/objectstack#5386; the guard test above
  pins the measured reach and goes red the moment the derivation narrows, which is
  the signal to rewrite these sites and re-take the OWD decision (#549).

  Refs #694.

- eb4a7e1: Write the two AI skill pages' capability lists back to what the skill sources
  actually declare, in all three languages.

  `content/docs/ai-copilot/service-copilot.mdx` and
  `content/docs/ai-copilot/sales-copilot.mdx` (plus their `.zh-Hans` / `.zh-Hant`
  siblings) listed abilities that `src/skills/case-triage.skill.ts` and
  `src/skills/customer-360.skill.ts` do not have. PR #848 corrected one bullet on
  each page (the ghost **Customer Since** field); this is the rest of the same
  sweep, and it separates two different severities rather than treating them
  alike.

  **Class one — the tool surface cannot reach it (`case_triage`).**
  `case-triage.skill.ts` declares `tools: ['describe_object', 'get_record']`.
  `get_record` fetches one record by ID and there is no query tool of any kind, so
  the Case Triage page's promises of _historical cases from the same account and
  contact_, _the Support Knowledge knowledge base for matching articles_ and _top
  matching KB articles_ were not merely unwritten instructions — nothing in the
  skill can perform them. The _draft first reply_ was worse still: it contradicted
  the skill's own step 6, which hands the customer-facing reply to the
  `email_drafting` skill by name. _Suggested category_ named a job the
  instructions never assign (they define a priority and one reason), and its
  option list was wrong twice over — `crm_case.type` ships Question / Problem /
  Feature Request / Bug, with no Billing option.

  **Class two — reachable, but the instructions do not enumerate it
  (`customer_360`).** That skill does carry `query_records`, so _recent activity_,
  _contracts_ and _marketing engagement_ on the sales page, and _contract status_
  and _last touchpoints_ on the service page, are a narrower miss: the skill could
  read `crm_contract` / `crm_campaign` / `crm_event` / `crm_task` and is simply
  not told to. Both Customer 360° sections are now written from steps 2-4 of the
  instructions — the related objects it does enumerate (`crm_contact`, `crm_case`
  filtered on `is_closed`, `crm_opportunity`, published `crm_knowledge_article`),
  the totals it takes from `aggregate_data` instead of adding up by hand, and the
  three sections it answers in (**Account Snapshot** · **Active Work** ·
  **Risks & Notes**) with record IDs cited inline.

  Following PR #841 and PR #848, no capability name is deleted in silence. A
  reader who arrives looking for case history, KB article matching or a first-reply
  draft lands on a paragraph that says which skill does own it — Customer 360° for
  the history and the article matches, Email Drafting for the reply — or that the
  data has to come from the record's own related lists for now.

  Whether either skill _should_ be given more reach stays a product decision under
  ADR-0109 and is deliberately not pre-empted here: `src/**` is untouched and no
  tool list changed. Whether the **Support Knowledge** knowledge base exists as an
  entity is likewise out of scope — that is issue #808; this change speaks only to
  what tools the skills hold and what their instructions say.

  Chinese field and option names follow `src/translations/zh-CN.ts` (the #825
  precedent): the case type options are 咨询 / 故障 / 功能需求 / 缺陷, and
  `crm_campaign` is 营销活动 in zh-Hans (PR #849) and 行銷活動 in zh-Hant.

  Documentation only — no metadata, behaviour, field or skill changes.
  Fixes #847.

- 3c61675: Retire the last six homes of the ghost **Customer Since** field, on the two
  AI Copilot skill pages, in all three languages.

  #805 / PR #823 corrected `revenue/contracts.mdx` and #824 / PR #841 corrected
  `revenue/index.mdx` and `sales/accounts.mdx`. The same claim survived on
  `ai-copilot/sales-copilot.mdx` and `ai-copilot/service-copilot.mdx` under a
  spelling the earlier keyword sweeps could not see: the English pages wrote
  `customer-since` with a hyphen, the Chinese pages translated it to
  "the date they became a customer".

  These two were the worst-placed of the family, because they described what a
  skill _reads_. A reader writing a prompt against the docs would expect Customer
  360° and Case Triage to be able to answer "how long has this account been a
  customer". Neither skill can. `crm_account` has no `customer_since` field and
  no field of any name records when an account became a customer
  (`src/objects/account.object.ts`); contract activation
  (`src/objects/contract.hook.ts`) stamps **Signed Date** on the _contract_ and
  flips the account's **Type** to _Customer_, writing no date to the account.

  Both bullets are now written from the skill sources, which are the only
  authority on what a skill reads:

  - **Customer 360°** (`src/skills/customer-360.skill.ts`) `get_record`s the
    account, so the relationship snapshot is the account's **Customer Tier** and
    its owner — both real fields. The page now says plainly that no
    customer-since date exists to snapshot, and sends a tenure question to the
    contract's **Signed Date** or **Start Date**.
  - **Case Triage** (`src/skills/case-triage.skill.ts`) weighs "customer tier and
    contract value" first in its rubric, and never mentions tenure. The page now
    names those two, and says tenure is not weighed and has no field to be
    weighed from.

  As in PR #841, the name _Customer Since_ is not silently deleted — a reader who
  came looking for it needs somewhere to land.

  Two Chinese field names are aligned to the locale pack in the sentences that
  were rewritten (#825 precedent): the `tier` field is 客户分层 / 客戶分層 as
  `src/translations/zh-CN.ts` ships it, not the pages' 客户层级, which on
  `sales/accounts.zh-Hans.mdx` already means account _hierarchy_.

  Documentation only — no metadata, behaviour or field changes, and `src/**` is
  untouched. Whether the two skills _should_ be given this data point is a
  product decision and stays open; this change only stops the docs from promising
  they already have it. Fixes #840.

- 86010ff: Stop naming a retired persona in the product docs, and pin the version the
  release page prints.

  `#512` removed the two app-authored agents and ADR-0063 §2 made the surface
  skills-only; `#589` / PR `#611` rewrote `content/docs/ai-copilot/*` to match. The
  rest of the tree did not follow: 29 product pages across all three locales still
  called the assistant "the Sales Copilot" / "the Service Copilot" in running
  prose — 65 occurrences. None of them declared a `sales_copilot` agent, so every
  gate stayed green: `os validate` and `pnpm lint` walk authored metadata and never
  open a paragraph.

  Per the maintainer's ruling on `#612`, those pages now say **AI assistant**
  (zh-Hans / zh-Hant: **AI 助手**), with each sentence's functional meaning left
  alone — only the name changes. The wording follows the architecture the pages
  have to describe: AI capability is implemented by agents in
  `objectstack-ai/cloud`, and HotCRM contributes domain skills that attach to the
  platform assistant (`ask`), so no page implies an app-owned agent any more. Two
  zh index pages were also carrying a `## Sales Copilot` / `## Service Copilot`
  heading whose English counterpart had already become _Sales AI skills_ /
  _Service AI skills_; they now match. `content/docs/whats-new.mdx` was the mirror
  case — both translations already said "向助手询问" and the English page alone was
  still personifying.

  Twelve pages keep the names on purpose and are exempt by name, each with its
  reason recorded: the nine `ai-copilot/*` retirement callouts PR `#611` wrote, and
  the three `whats-new` v1.0 release records, which describe what that release
  actually shipped.

  `test/docs-drift.test.ts` now enforces both halves so a third cleanup round is
  not needed:

  - **Persona rule** — no page under `content/docs/**` may write either name.
    The scan normalises soft wraps and blockquote continuation markers before
    matching, because two of the live occurrences were split across lines
    (`the Sales\n> Copilot`, `ask the Sales\nCopilot`) and a line-oriented grep —
    how the original inventory was taken — reads neither. Whitespace between two
    CJK characters is stripped as well, since `ai-copilot/index.zh-Hant.mdx` wraps
    「服務 Copilot」 between 服 and 務. Three vacuity guards keep it honest: the walk
    must find a real tree, every exemption must still cover a live occurrence, and
    a probe test asserts the detector reads all six spellings in every wrap shape —
    without that last one, a detector that had stopped matching would report a
    clean tree and read exactly like success.
  - **Version rule** — `docs/RELEASE_STRATEGY.md` had printed `1.0.5` since v1
    while the manifest declared `2.2.2`, a whole major behind on the one page a
    releaser trusts for the current version. It now reads `2.2.2`, and the value
    is extracted from `objectstack.config.ts` `manifest.version` and asserted
    against `docs/RELEASE_STRATEGY.md`, `docs/STATUS.md`, `docs/ARCHITECTURE.md`
    and `README.md`, plus a `package.json` parity check — the alignment
    `RELEASE_STRATEGY.md`'s own _Version Sources_ section already asks for.

  Docs, prose and tests only: no metadata, no `src/` behaviour, no dependency
  changed. Fixes `#612`.

- d511b67: Gate the copyright header's position in `scripts/check-source-hygiene.mjs`, and
  move the header back to line 1 in the eight files that had drifted below an
  import.

  The gate is the change; the eight files are what made it green. All eleven
  instances of this drift came from one mechanical 836-file commit that prepended
  an import above the header; no gate saw it, and cleaning it up by hand took two
  issues and two PRs (#1091 fixed three, this fixes the other eight). The new
  check requires the header to be the
  first line of every `.ts` file under `src/`, `test/`, `e2e/` and `scripts/`,
  with a shebang as the only thing allowed above it — the one construct whose
  position is load-bearing. A missing header is an error too, since all 282 `.ts`
  files already carry one and a position-only rule would be satisfiable by
  deleting it.

  There is no path list and no skip-list, so a new file with the header in the
  wrong place goes red. Each of the three failure shapes — displaced, absent,
  pushed off column 1 — reports its own message naming the case and the fix.

- ed0ca36: Fixed the `crm_enterprise` app's `branding.logo` / `branding.favicon` pointing at `crm-logo.png` / `crm-favicon.ico`, neither of which was ever added to `assets/` — every Console page load hit two 404s. Repointed both to the existing `assets/icon.svg`, served live at `/runtime/assets/icon.svg` (the only mount the runtime actually serves app assets from; a plain `/assets/*` path — what was previously referenced — is not served at all).
- 4c93ba1: Correct the two sentences in the packaged Sales guide that still promised a
  manager notification neither flow sends.

  `src/docs/crm_sales.md` is a package doc: ADR-0046 collects it whole into
  `dist/objectstack.json`, so it ships to every reader of the app, not just to
  whoever opens the file in the repo. Two of its automation paragraphs named a
  recipient that does not exist:

  - **Stalled-deal nudge** — _"The owner and their manager are notified"_. The
    daily sweep in `src/flows/opportunity-stagnation.flow.ts` has exactly one
    `notify` node, addressing `{currentOpp.owner_id}` on inbox + email. There is
    no manager, position or team recipient anywhere in the flow; the node header
    records why (`{currentOpp.owner_id.manager}` cannot traverse a lookup in flow
    templates and interpolates to the literal `undefined`).
  - **Won-deal alert** — _"the owner and manager are notified automatically"_.
    This is the same claim #851 already removed from the Automation page table and
    from the flow's own `description`, surviving here because it is spelled
    _"owner and manager"_ rather than _"owner and their manager"_ and so escaped
    that search. `src/flows/opportunity-won-alert.flow.ts` notifies
    `{record.owner_id}` alone, for the same lookup-traversal reason.

  Both now read _the owner alone, not their manager_ — the wording already landed
  in the flow `description` (#851) and the node `label` (#869), so the app tells
  one story about who gets paged. Everything else in the two paragraphs is
  accurate and untouched: the 07:30 schedule, the 14-day threshold, the
  high-priority follow-up task, and the $100,000 trigger amount.

  Documentation only. No flow, node, condition or recipient changed. Fixes #875.

- aacc75a: Remove the last two homes of the ghost **Customer Since** field, and write the
  daily renewal reminder's recipient list against the flow that sends it — in all
  three languages.

  `crm_account` has no `customer_since` field, and no field of any name records
  when an account became a customer (`src/objects/account.object.ts`). Contract
  activation (`src/objects/contract.hook.ts`) writes a date to the **contract**,
  not to the account: it stamps **Signed Date** when the contract carries none
  yet, and sets the account's **type** to _Customer_ when the account is not
  already one. #805 / PR #823 had already corrected `revenue/contracts.mdx`; the
  same claim survived on two more pages, where it was the more misleading of the
  two — on `sales/accounts.mdx` it sat in _Automatic updates_ between three
  rollups that are real, so nothing marked it out as the empty one.

  Both pages now describe the write that happens and say plainly that no date is
  recorded on the account, pointing a cohort question at the contract's Signed
  Date or Start Date instead.

  The renewal reminder on the Revenue overview promised "the owner and the account
  owner get a reminder email". `contract-renewal.flow.ts`'s only `notify` node has
  a single recipient — `{currentContract.owner_id}`, the contract owner — over the
  inbox and email channels; the account owner and the account's renewal owner
  receive nothing. The same sentence now names the renewal task the sweep creates
  before it notifies, and states the notice window as the contract's own
  **Renewal Notice (Days)** (default 30) rather than an invented "e.g., 60 days".

  Documentation only — no metadata, behaviour or field changes, and `src/**` is
  untouched. Whether `crm_account` _should_ carry a `customer_since` field is a
  product decision and stays open; this change only stops the docs from claiming
  it already exists. Fixes #824.

- 8eaed67: Clear the remaining dangling in-site anchors under `content/docs`, so every
  anchored link lands on the section it promises instead of the top of the page.
  Thirteen links were left after PR #868; a full rescan of all three locales now
  reports zero.

  Two English links keep their anchor, and the section they point at gained an
  explicit heading id so the anchor is stable against future title edits:

  - `ai-copilot/skills` — `### 🚦 Case Triage` is now
    `### 🚦 Case Triage [#case-triage]`. Without it, the leading emoji makes the
    generated id `-case-triage` (the emoji is dropped, the space after it is not),
    so the obvious spelling could never have resolved.
  - `guides/import-and-export` — `### Scheduled export to a warehouse (not
shipped yet)` is now `… [#scheduled-export]`, which is the anchor
    `reference/performance-and-limits` has always used. The heading grew its
    "(not shipped yet)" qualifier after the link was written.

  The explicit-id spelling is `[#id]`, not `{#id}`: the latter is read as a JSX
  expression in `.mdx` and fails the parse outright.

  Every Chinese link now points at the page with no anchor, which is the form
  already used for cross-locale links elsewhere in the docs — the target headings
  are translated, so an English anchor cannot resolve on them:

  - `service/sla-and-escalation` → `ai-copilot/skills`
  - `reference/performance-and-limits` → `guides/import-and-export`
  - `marketing/campaign-members` → `marketing/campaigns`
  - `sales/opportunities` → `sales/quotes`

  `index` in all three locales linked the sales manager's starting point at
  `/docs/analytics/dashboards#sales-dashboard`. No dashboards page in any locale
  has a _Sales Dashboard_ heading — the dashboard ships with the label _Sales
  Performance_ (`sales_dashboard` is its metadata name, which is what the anchor
  was spelled from). All three now link the dashboards page itself, whose opening
  table lists all five dashboards.

- 9e151de: Fix two dangling in-page anchors in the docs, so both links land on the section
  they promise instead of the top of the page.

  `service/sla-and-escalation` (all three locales) pointed the escalation-trigger
  sentence at `/docs/administration/automation#case-escalation`. The automation
  page has no _Case Escalation_ heading — _Case Escalation Process_ is a row in
  the table under `## Flows (multi-step)`, which is where a reader chasing the
  trigger condition actually has to go. The English page now links
  `/docs/administration/automation#flows-multi-step`. The Chinese pages link the
  page with no anchor (`/zh-Hans/docs/administration/automation`,
  `/zh-Hant/docs/administration/automation`): the heading there is
  「流程（多步骤）」/「流程（多步驟）」, whose slug is not `flows-multi-step`,
  and un-anchored is the form already used for cross-locale links elsewhere in
  the guides.

  `guides/mobile` in Chinese pointed the roadmap link at
  `/zh-Hans/docs/whats-new#roadmap` (and the `zh-Hant` twin). The heading on the
  translated What's New pages is 「路线图」/「路線圖」 — the heading was
  translated, the anchor was not — so `#roadmap` resolved to nothing. Both now
  link `/zh-Hans/docs/whats-new` and `/zh-Hant/docs/whats-new`. The English
  `guides/mobile` keeps `#roadmap`, which resolves to the `## Roadmap` heading it
  has always had.

- 6cb7f53: Remove the four profile grants on `crm_competitor`, an object that no longer
  exists. `main` failed `pnpm validate` with four cross-reference errors: #547
  added the grants while the competitor module was still present, the demo-only
  competitor module was removed separately, and the two merged cleanly on text
  while contradicting each other on meaning. `sales_rep`, `sales_manager`,
  `marketing_user` and `system_admin` no longer reference the removed object.
- f3d28ce: Remove the widget-level drill-through config from all four dashboards. All 16
  KPI tiles declared `actionUrl` / `actionType` / `actionIcon`, and every URL
  pointed at a route the console does not serve (`/objects/…`, `/reports/…`) —
  but the deeper problem is that a dataset-bound widget renders no drill-through
  at all: measured on 16.1.0, a KPI tile emits no link, no button and no icon,
  its cursor stays `auto`, and clicking it does not navigate. Repointing the URLs
  would have polished config nobody can reach, so the config is removed instead,
  matching #538 and #554. Clears all 16 `dashboard-action-route-unresolved`
  warnings (validate goes from 18 warnings to 2, both pre-existing and benign).
  Fixes #527.
- 9f748ab: The dashboards documentation now lists the tiles the app actually ships, and a CI rule keeps it that way.

  `content/docs/analytics/dashboards.mdx` described a different product. Of the tiles
  it named, CRM Overview and Executive Overview overlapped the registered metadata on
  **zero**; the page advertised "Forecast vs Quota — gauge", "Net New ARR", "CSAT and
  NPS", "Customer Acquisition Cost", "Activity Heatmap" and "Slipping Deals", several
  of which are not measures any dataset defines. It also asserted that _"the Cases
  Approaching SLA tile is the most-clicked widget on this dashboard"_ — a tile that
  does not exist, quantified by click telemetry this repo does not collect. That claim
  is **deleted**, not restated more softly: an unmeasured superlative is the same
  defect as a hand-typed trend percentage (#587).

  The page now describes the five dashboards that are registered — CRM Overview, Sales
  Performance, **Sales Activity** (added by #592, and undocumented until now),
  Customer Service and Executive Overview — tile by tile, under their own `label`s, and
  keeps the "built for / answers" framing that was the genuinely useful part. Three
  further corrections of substance:

  - No KPI tile shows a period-over-period delta on any dashboard (#500, #587), so the
    "trend vs prior week" lines are gone rather than reattached to real tiles.
  - Sales Activity and Customer Service have **no date-range picker**, deliberately —
    a datetime-column range zeroes every widget on the current platform (#460). The
    page said all dashboards could be filtered by date; it now says which can, and why
    the other two cannot.
  - The capability list that promised tile export to image/PDF, weekly PDF
    subscriptions, dashboard-level threshold alerts and scheduled snapshot decks is
    replaced by the controls each dashboard actually declares (date range, global
    filters, refresh interval), since nothing in this app implements the rest.

  `test/docs-drift.test.ts` gains a dashboards rule so this class fails at PR time
  instead of in front of a customer: every tile bullet inside a dashboard's section
  must resolve to a widget `title` on that dashboard, every `**Name** tile` reference
  in the prose must resolve to a widget on some dashboard, and every registered
  dashboard must have a section on the page — the last of which is what a fifth
  dashboard shipping undocumented would have tripped. Three vacuity assertions keep
  the rule from passing over zero input.

  The `zh-Hans` / `zh-Hant` translations of this page still carry the old text and are
  tracked separately; the guard is written so they join it as a one-line change once
  retranslated.

  Refs #610.

- 04fbb8e: Retranslates the Chinese dashboards pages against the corrected English page, and
  extends the CI tile guard to cover them.

  `content/docs/analytics/dashboards.mdx` was rewritten in #610 to describe the five
  dashboards the app actually registers. The two locale copies were left behind and
  still carried the whole of the original defect for every zh reader:

  - "四个仪表盘 / 四個儀表板" — five are registered. `sales_activity_dashboard`
    (added in #592) had no section at all in either locale.
  - Tiles that do not exist, in both files: `Slipping Deals`, `Cases Approaching SLA`,
    `Customer Satisfaction (CSAT)`, `Net New ARR`, `CSAT and NPS`, `Forecast vs Quota`,
    `Pipeline Coverage`, `Customer Acquisition Cost` and the rest of the invented
    lists — none of them a widget any dashboard ships, several of them not even a
    measure any dataset defines.
  - A fabricated usage statistic: "_Cases Approaching SLA_ 磁贴是此仪表盘上点击最多的
    小部件". The tile does not exist, and this repo collects no click telemetry, so
    the sentence was a confident quantitative claim measured by nothing. It is
    deleted, not softened.
  - Trend claims ("过去 30 天，趋势", "与上周对比的趋势") that no tile makes — the
    renderer shows no period-over-period delta on any KPI tile.

  Both pages are now a translation of the current English text: the five real
  dashboards and their real widget titles, the real controls (no date picker on
  Sales Activity or Customer Service, and why), and the shared-definition and
  opt-out notes. Terminology follows the neighbouring zh analytics pages
  (多维数据集 / 多維資料集, 磁贴 / 磁貼, 小部件 / 小工具); the zh-Hant page also drops the
  mis-converted 磚貼 for 磁貼, the form the rest of the zh-Hant docs already use.

  The guard is what keeps this from happening a third time:
  `test/docs-drift.test.ts` now reads all three pages, not just the English one. Its
  extraction was already locale-agnostic — the section headings carry each
  dashboard's own English `label` and the bold tile names stay in English in every
  locale — so both rules now bite per locale. A tile named in a zh page that no
  dashboard ships fails the build, and registering a sixth dashboard fails until all
  three pages document it.

  Fixes #685. Follows #610.

- eb0ff2e: Remove the `form.data` provider from all twelve view files. A form binds to its
  object and record through the route context, so the block never wired anything —
  the platform's own `liveness-dead-property` rule flagged every one of them.
  Verified before removal, not taken on the validator's word: with the blocks gone,
  a lead record's edit form still binds on 16.1.0 (8 inputs, 7 populated from the
  record). Adds two guards — no view may reintroduce `form.data`, and every view
  must still resolve its object from the list provider now that the `form.data`
  fallback is gone. Clears the last 12 validate warnings; `pnpm verify` goes from
  15 warnings to 3 (all pre-existing).
- 9f748ab: `decision` 节点不再声明永不生效的 `config.condition`,分支判断统一由出边(out-edge)承担。

  `@objectstack/service-automation` 只在三个位置求值流程条件:`start` 节点的
  `config.condition`(`AutomationEngine.execute`)、`decision` 节点的**复数**
  `config.conditions[]`(决策节点执行器读取 `config?.conditions ?? []`)、以及每条
  出边的 `condition`(`AutomationEngine.traverseNext`)。`decision` 节点上的**单数**
  `config.condition` 不在其中——`@objectstack/spec` 的 `DecisionConfigSchema` 只声明了
  `conditions` 一个键,而 `decision` 不发布 descriptor `configSchema`,因此引擎针对未声明
  配置键的拒绝检查(#4277)会整类豁免它。也就是说,这个键在任何一层都不会报错,只是静静地
  不被读取。

  本仓库有 8 个 `decision` 节点(分布在 `campaign_enrollment`、`contract_renewal`、
  `forecast_snapshot`、`opportunity_stagnation` 四个流程中)正是这样声明的。行为一直
  正确,只因为同一个谓词被完整复制到了出边上,而没有任何机制强制这份复制保持同步:单独
  修改节点上的那份,流程的走向不会有任何变化,没有报错、没有告警、没有测试——偏偏节点上
  那份才是读代码的人最可能去改的,因为它读起来才像"这个决策"。这属于"声明 ≠ 生效"
  (#634 / #621 / #633)家族,但机制不同:它既不是运行时中断,也不是静默跳过,而是
  惰性元数据。

  修复方式是让**出边成为唯一的谓词站点**,而不是把谓词搬到节点上。后者(改用引擎支持的
  `config.conditions[]`,让出边跟随其 label)在真实引擎上实测会**失效为放行**:本仓库
  8 个站点里有 7 个是单出边的"跳过"闸门(如"已经提醒过就不再提醒"),假分支无处可去。
  一旦节点声明了 `conditions[]` 并去掉出边上冗余的谓词,条件为假时执行器返回
  `branchLabel: 'default'`,而 `traverseNext` 找不到任何带该 label 或标记 `isDefault`
  的出边,便按设计回退为**求值全部出边**(避免运行中的实例因元数据错误而中断);此时那条
  仅存的出边已不带条件,于是无条件执行——闸门被静默反转,流程恰好做了决策刚刚否定的事。
  要让该形态安全,每个闸门都得额外造一个空节点作为 `isDefault` 汇点,属于用变通换架构。
  出边形态没有这个失效模式(未匹配的边直接不走),也无需臆造节点,而且本来就是仓库 17 个
  `decision` 节点中 9 个已在使用的形态。

  新增 `test/flow-decision-authority.test.ts` 固化该不变量:静态扫描全部流程(含 `loop`
  体内嵌套的节点)禁止 `decision` 节点携带单数 `config.condition`、要求每个 `decision`
  确实基于某个谓词分支;并在真实引擎上跑两个可执行证明——把与出边相反的谓词植入真实流程
  `opportunity_stagnation` 的节点后走向完全不变(证明其惰性),以及无 `isDefault` 汇点的
  节点权威形态确实失效为放行(记录选择出边形态的实测依据)。

  `test/flow-variable-conditions.test.ts` 的"guard the guard"断言原先要求至少存在一个
  节点级 `config.condition` 站点,而该断言只有在缺陷存在时才成立,与该文件自己的注释
  (称本仓库已不再声明节点副本)相互矛盾;现改为断言此类站点为空。

  用户可见行为没有变化:这些流程的走向此前就完全由出边决定,本次改动删除的是从未被读取
  的元数据。

  Refs #650.

- 900fa0b: Declare the `engines.protocol` compatibility range (fixes #529, ADR-0087).

  The app never declared the metadata/runtime protocol range it is authored
  against, so ObjectStack 17.0 loaded it unchecked and warned:
  `package 'app.objectstack.hotcrm' declares no engines.protocol range; loading
under protocol 17.0.0 without a compatibility check (ADR-0087)`.

  The stack manifest in `objectstack.config.ts` — the manifest the ADR-0087
  load-time handshake reads — and `objectstack.manifest.json` now both declare
  `engines.protocol: "^16.0.0"`, matching the installed `@objectstack/*` 16.x
  line. A runtime on a different protocol major now refuses the load up front
  with the structured `OS_PROTOCOL_INCOMPATIBLE` diagnostic (naming the
  `objectstack migrate meta --from 16` replay command) instead of failing deep
  in a schema parse. The platform-upgrade checklist (`docs/MAINTENANCE.md` §3)
  now includes bumping this range alongside `specVersion`.

- ffed923: Demo bootstrap now claims the platform ownership column, so seeded records are editable

  On a freshly seeded demo org, every seeded contract was read-only for every user — the
  admin included. Opening a demo contract and changing a field answered
  `403 FORBIDDEN`, and uploading to its Attachments panel answered
  `403 ATTACHMENT_PARENT_ACCESS`, which read as "attachments are broken on contracts" when
  what was broken was the contract's ownership.

  Each of these objects carries two ownership columns: the app's own `owner` lookup, which
  drives the "My Leads" / "My Deals" / "My Cases" views and every owner-addressed
  notification, and the platform's `owner_id`, which is the only one record sharing reads.
  Under `sharingModel: 'private'` a record with no `owner_id` admits nobody, and a share can
  only widen access from an owner that isn't there. The `demo_bootstrap` sweep stamped the
  `owner` lookup alone, so a seeded row that arrived without a platform owner came out of
  bootstrap looking claimed everywhere a person would check while still being owned by
  nobody for access control — and because the sweep then selected on `owner`, it never
  looked at that row again. The state was permanent.

  `demo_bootstrap` now stamps both columns on every record it claims, and sweeps each object
  for rows missing either one, so an org already left in the half-claimed state repairs
  itself on the next pass rather than needing a database reset. No metadata, seed values or
  API shapes changed; only the bootstrap sweep.

- a2eec9d: Refresh the CRM demo experience with curated sales opportunities, expanded account coverage, and a campaign calendar that tells a complete month-long story. Simplify the default account and campaign grids, keep the active sales board focused on open work, and make the Sales Performance dashboard's KPIs visible earlier in the viewport.
- 2e373d7: Docs alignment: correct the metadata counts in the README, rewrite the AI copilot
  pages as skill docs, and disclaim the archived Salesforce comparison.

  The README advertised "2 AI agents (sales-copilot, service-copilot), 20 flows,
  5 sharing rules" three paragraphs above a repository-layout block that correctly
  called the AI surface skills-only with 23 flows. The real numbers, taken from
  `objectstack.config.ts`, are **0 app-owned agents, 6 AI skills, 23 flows and 9
  sharing rules**; both README passages now say that, and the `8 datasets` count was
  added so the two lists agree.

  The published `ai-copilot/sales-copilot` and `ai-copilot/service-copilot` pages (en,
  zh-Hans, zh-Hant) still described two AI personas that were retired in #512 — "it
  lives in the right-side chat panel and as inline buttons" for capabilities that ship
  today as six skills on the platform `ask` assistant. They are rewritten as skill docs
  at their existing URLs, with the activation rules taken from each skill's real
  `triggerConditions` and the write paths named as the actual HotCRM actions
  (`convert_lead`, `schedule_followup`, `escalate_case`, `close_case`) the skills call.
  The AI Copilot index, the Skills page, the glossary's "Agent (AI)" entry, the
  customization guide (which told developers to edit a long-deleted
  `src/agents/sales-copilot.agent.ts`) and every inbound link label were updated to
  match.

  `docs/archive/2026-02/SALESFORCE_FEATURE_COMPARISON.md` now opens with a
  retired-architecture banner. It describes a ~148-object, 13-package product and marks
  `sla_policy`, `queue`, `email_to_case` and `pricebook` as implemented — none exist —
  so its "~95% Salesforce parity" headline was actively misleading anyone evaluating the
  repo. Finally `docs/ARCHITECTURE.md` was corrected: the diagram no longer draws the
  deleted `src/agents` or the never-created `src/cubes`, the manifest table reads
  `2.2.2` instead of `1.0.5`, and `requires` no longer lists the `ai` capability that
  was removed in 2.2.0.

- 748002f: Redraw the customization landing page's `src/` tree from the real repository, and
  put the page under the docs-drift tree guard.

  `content/docs/customization/index.mdx` (and both Chinese locales) is the twin of
  the developer page fixed in #984: it drew an `agents/` branch in the `src/` tree
  and listed `*.agent.ts` in the file-suffix table, both of which went away with
  the two app-owned copilots. HotCRM authors skills and the agent comes from the
  platform, so a reader following this page was being pointed at a directory and a
  file suffix that no longer exist.

  The tree was reconciled directory by directory rather than only having the dead
  branch cut out, so it now lists all eighteen directories `src/` actually
  contains: `hooks/`, `datasets/`, `mappings/`, `docs/` and `interfaces/` were
  real and missing from it, and every branch states what it actually holds. The
  "What you can build" table billed the AI skills page as "Copilot skills and
  agent wiring"; the wiring it referred to is gone, and exporting from the skills
  barrel is the whole of it.

  The page then joins `PRODUCT_TREE_DOCS` in `test/docs-drift.test.ts`, the guard
  #984 built for exactly this defect class and left a note in pointing at this
  page. Membership covers both of that guard's axes at once, since the tree-diagram
  list is derived from the product list.

- 52975b4: Redraw the developer page's repository tree from the real `src/`, and teach the
  docs-drift guard to read a tree diagram.

  `content/docs/getting-started/for-developers.mdx` (and both Chinese locales)
  still drew an `agents/` branch in the `src/` tree, still listed `*.agent.ts` in
  the file-suffix table, and still ended the "Add an AI skill" recipe with "add
  the skill name to the relevant agent in `src/agents/`". That directory and that
  suffix were deleted with the two app-owned copilots: HotCRM authors skills, and
  the agent comes from the platform. A developer following the page was being sent
  to create a file under a path that does not exist, and to perform a wiring step
  that no longer exists — exporting the skill from `src/skills/index.ts` is the
  whole of it.

  The tree was checked branch by branch while it was open, so it now matches the
  repository it claims to describe: `hooks/`, `mappings/`, `docs/` and
  `interfaces/` are real directories that were missing from it, and every branch
  states what it actually holds.

  `test/docs-drift.test.ts` owns exactly this defect class and could not see any
  of it, because two blind spots overlapped: it scanned only the maintainer docs
  (`README.md`, `AGENTS.md`, `docs/*`), never `content/docs`, and it matched only
  paths written with a literal `src/` prefix in a sentence — while a tree diagram
  draws the branch as `agents/`, with the prefix stripped by the drawing itself.
  Both axes are now covered: the product page is scanned for inline paths, and
  every doc that draws a `src/` tree, maintainer or product, has its branches
  resolved against the real tree. Each new check refuses to pass vacuously — a
  page whose diagram stops parsing fails loudly instead of silently checking
  nothing.

- 2cdced3: Stop the admin docs sending readers to Setup screens this platform has never
  shipped — nineteen invented page names across eight pages and three locales.

  These were not typos. Each one is a factual claim about the product's UI that a
  reader acts on, and several sat on top of a capability that does not exist at
  all, so following the instruction could not fail gracefully: the FAQ promised
  that a deleted record waits 30 days in a **Recycle Bin**, when every delete this
  platform performs is a hard delete — `@objectstack/spec` retired the flag that
  used to promise otherwise and says so in as many words ("a default-true flag
  promising a recycle bin was a false affordance").

  Where the screen exists under another name, the docs now use it:

  - _Profiles_ → **Setup → Permission Sets**, and the pages say plainly that what
    they call a profile is a permission set.
  - _Sharing Settings_ → **Setup → Sharing Rules**.
  - _Company Information_ → **Setup → Company**; _Security → SSO_ →
    **Setup → SSO Providers**; _Security → Audit Log_ → **Setup → Audit Logs**.
  - zh-Hans drift on shipped pages: 设置 → _电子邮件_ → **设置 → 邮件**, the label
    the zh-CN pack really carries.

  Where the capability itself is absent, the page now says so instead of naming a
  door that is not there — the convention the setup checklist already used for
  business hours:

  - **No Recycle Bin.** A delete is permanent and immediate; the audit log records
    who did it and does not bring the record back.
  - **No Lead Settings, and no assignment rules.** An ownerless lead goes to
    whichever holder of the `sales_rep` position has the fewest open leads
    (`src/objects/lead.hook.ts`) — load balancing, not region or territory
    matching, which is what the FAQ claimed.
  - **No Sandbox Management, no Change Packages, no Git Sync.** Provisioning an
    environment is an ObjectStack Cloud control-plane concern, not a page in this
    tenant's Setup; HotCRM's metadata is TypeScript under `src/`, reviewed in git
    and shipped with the app, so the release page now describes the intended shape
    and names what actually happens.
  - **No Privacy screen and no Data Subject Request record.** Access and erasure
    requests are served by hand; no bundle is generated, no audit certificate is
    produced, and no DPA template ships.
  - **No SCIM screen** (the capability is real, the navigation entry is not) and
    **no Session Policy screen** — login settings are at **Setup → Authentication**
    and live sessions at **Setup → Sessions**.
  - **No Usage dashboard.** API calls per user, AI invocations and storage growth
    are not collected anywhere a reader can look. **Setup → System Overview** shows
    users, organizations, sessions, installed packages and audit-event counts —
    platform health, not quota consumption.

  Every name fixed here deletes its line from the quarantine ledger in
  `test/docs-setup-navigation-names.test.ts`, which is staleness-checked in both
  directions: the ledger drops from 39 entries to 20, and neither half of that
  change can be faked — a line deleted without the prose being fixed fails, and
  prose fixed without deleting the line fails too. The remainder is the two
  sub-classes still to come (#1113): names that are real in **Studio** but cited
  under **Setup**, and the zh-Hant navigation strings, which cannot resolve because
  the platform ships no Traditional-Chinese pack.

- 081ded2: Docs/metadata drift fixes (#496, tiers 1–2): rewrite the stale `[Unreleased]`
  CHANGELOG section to reflect what actually shipped after 2.2.2, correct
  STATUS/README/CONTRIBUTING claims and tutorial references, align the changeset
  config note with the marketplace-only distribution model, fix comments that
  contradicted the code they sat on, and remove dead module-level hook code that
  was never registered.
- 920026d: Measure every claim on the Performance & Limits reference page against the app
  and the installed platform, in all three locales. The page carried roughly sixty
  quota figures, an archive API, a per-field indexing toggle and a pagination
  recipe — none of which had ever been checked against anything, and four of which
  were advice a reader could act on and get a wrong answer from:

  - **The pagination sample could not have worked.** It printed
    `GET /api/v1/opportunities?limit=200&cursor=…`. `query.cursor` was removed in
    `@objectstack/spec` 17 (#4286, ADR-0049) and is now rejected by name — the
    removal note records that no driver ever implemented keyset pagination, so the
    cursor was accepted and ignored and every page came back identical, meaning a
    caller looping "until `hasMore` is false" never terminated. The path was wrong
    too: the data plane is `/api/v1/data/<object>` with the `crm_`-prefixed name.
    Now `limit` / `offset`, plus a keyset expressed as an ordinary `where`
    predicate posted to `POST /api/v1/data/crm_opportunity/query`.
  - **"Mark the field indexed" named a flag that never built an index.**
    `FieldSchema` rejects `indexed` by name — _"a field-level index flag built no
    index (#2377). Declare the index in the object's `indexes[]`."_ Indexes are an
    object-level declaration, and HotCRM already ships sixteen of them across
    fifteen objects.
  - **There is no archive API.** Archiving itself is real —
    `ObjectSchema.lifecycle.archive` with `after` / `to` / `keep`, swept by
    ObjectQL's ADR-0057 archiver — but it is a metadata declaration, no object in
    `src/` carries one, and archived rows live in the datasource named by
    `archive.to` rather than behind a record route.
  - **The session defaults were the opposite of the truth.** Idle, absolute and
    concurrent-session controls exist (ADR-0069 D4, `@objectstack/plugin-auth`),
    but `0` means off for each and off is the default; the page presented
    5 sessions / 30 min / 12 hr as active defaults.

  The quota tables stay, and nothing was deleted — a removed claim and a false one
  look identical to the next reader. Each table now states whether anything
  enforces it, and every row with a source names it: the 10,000-row bulk ceiling is
  `MAX_BULK_PER_ROW_HOOK_ROWS`, search fields come from each object's
  `searchableFields` (no top-30 cap), the flow loop ceiling is 100,000 rather than
  2,000, file sizes are per-field `maxSize` values this app really sets, and no
  inbound rate limit is configured at all. The email-and-calendar quota table is
  marked _(not shipped)_, matching the guide. Part of #1119.

- 72d56d2: Stop documenting directories that no longer exist, and guard the class. `#512`
  deleted `src/agents/` when the AI surface went skills-only, but seven maintainer
  docs kept printing `src/agents/*.agent.ts` in their tree diagrams and
  registration tables — `code_examples.md` still told authors to "add its name to
  an agent in `src/agents/*.agent.ts`" after registering a skill. `src/cubes/` had
  the same shape: dropped in favour of datasets (ADR-0021, noted in
  `objectstack.config.ts`), still drawn in two trees. Also removes the skill
  `permissions: [...]` key from the worked example — `SkillSchema` has no such
  field and silently strips it (#511) — and corrects a stale flow count (20 → 23)
  and the `*.action.ts` suffix (the convention is `*.actions.ts`).

  Fills the gap left behind: the skill example now states which two sources a
  `tools` name can resolve to (platform data tools, or `action_<name>` from an
  `ai.exposed` Action), why `defineTool` is not a third one, and where the guard
  lives. `ARCHITECTURE.md` gains the same note plus the missing `case_triage`
  skill.

  Adds a repo-tree guard to `test/docs-drift.test.ts`: every `src/<dir>/` path a
  maintainer doc names must exist on disk (`docs/archive/` excluded — it is a
  historical record). It caught a stray reference in this change's own first pass.

- 53f1549: Measure every remaining claim on the Sandbox & Release Management page, in all
  three locales. PR #1118 added a page-level note saying the screens do not exist,
  but roughly half the page underneath it still read as working product
  description. Each claim was checked against the app's own metadata and the
  installed `@objectstack/*` packages (spec 17.0.0-rc.6), and each landed in one of
  three states — verified, converted to the _not shipped_ form, or flagged as
  unsettleable — with nothing deleted.

  What the measurement found:

  - **Sandbox types and refresh cadences.** No `sys_sandbox` object, no
    `sandboxType` key, and no config/partial/full taxonomy anywhere. The real
    surface is the ObjectStack Cloud `EnvironmentSchema`, whose `type` is a
    seven-member posture enum (`production | sandbox | development | test |
staging | preview | trial`) — `sandbox` is a value on it, but it is not a
    data-fidelity tier and the three cadences correspond to nothing.
  - **"Enterprise plans typically include 3 sandboxes."** No sandbox entitlement
    exists — no `sandboxLimit`, `maxSandboxes` or `sandboxQuota`. Cloud's
    `EnvironmentSchema` does carry a `plan` field, but its only quota is
    `storageLimitMb`; nothing counts environments.
  - **Anonymisation on refresh.** Zero hits for `anonymi[sz]`, `pseudonymi[sz]` or
    `fakeName` across the installed tree. The adjacent real mechanism,
    `publicSharing.redactFields`, _drops_ fields from a public share link — it does
    not transform values and is not anonymisation.
  - **"What can be packaged."** The nine-yes/three-no table is replaced by the
    compiled artifact's actual 42-key set. One row was outright wrong: **record
    data IS packageable** — `data` is a top-level key and this app ships 21 seed
    families through it, per environment (`env: ['prod','dev','test']`). Two more
    were stale: there is no approval-process key (approvals are flows carrying
    `approval` nodes since the `approvals` field was removed in 7.4) and no
    knowledge-base-config key. The "use file sync API" suggestion points at an API
    that does not exist.
  - **Deploy dry-run.** Genuinely real, in a different shape: `os migrate plan` is
    a dry-run diff of metadata against the physical database, categorised safe /
    needs-confirm / destructive, and it never mutates the schema. The page now
    names it. The "under 2 min" figure is marked unsourced — nothing times a
    deployment.
  - **Deployment alerts, error-spike auto-rollback, p95 regression detection.** All
    three absent. `connector_action` is a platform built-in but ships with an
    _empty_ connector registry and this app installs no connector; there is no
    alert-rule, threshold or anomaly-detection surface of any kind; and `p95` is a
    `MetricAggregationType` member — a value you can compute, not a detector that
    compares against a baseline.

  Two claims are explicitly **not** answered rather than denied: whether the
  ObjectStack Cloud control plane sends deployment notifications to Slack/Teams,
  and whether it watches error rates or p95 latency for hosted environments. Those
  are properties of a hosted service, not of this app's metadata, and the page now
  scopes its denial to HotCRM and the installed tree instead of overreaching.

  Also corrected: a smoke-test step that told the reader to send mail "through a
  connected inbox", a capability `guides/email-and-calendar.mdx` already documents
  as not shipped.

- eef112b: Measure every claim on the Security & Compliance reference page, in all three
  locales. The page described a security posture the app does not have, and four
  of the corrections reverse advice a reader could act on and get the opposite of
  the truth.

  - **Account lockout is off, not "default 5".** `lockout_threshold` defaults to
    `0`, which disables lockout entirely. So do password complexity, password
    history, password expiry, breached-password rejection, idle timeout, absolute
    session timeout and the concurrent-session cap — every protective knob at
    **Setup → Authentication** is off until an admin turns it on, and HotCRM turns
    none of them on. The page presented them as active defaults.
  - **Passwords are hashed with scrypt, not bcrypt.**
  - **IP allowlists and concurrent-session caps do exist** — as deployment-wide
    settings in the `auth` namespace, not the per-profile controls the page
    described and not the "not configurable anywhere" the previous correction pass
    left behind. Login hours and device trust are absent.
  - **No export has ever written an audit-log row.** The platform retired the
    `export` action from `sys_audit_log` rather than keep a permanently empty
    filter on a compliance surface. Failed sign-ins are not audited either. What
    the audit log really records, and its measured 90-day/7-year lifecycle, are
    now stated per category.
  - **`encrypted` is rejected by name.** Column-level field encryption was pruned
    in 2026-06; the real channel is `type: 'secret'` (AES-256-GCM into
    `sys_secret`, fail-closed), joined in 17.1.0 by `maskingRule` for partial
    masking and `requiredPermissions` / `internal` for per-caller field control.
  - **Record-view auditing is new in 17.1.0** — `sys_audit_log` can now answer
    "who viewed this record", for record-detail reads, on per-object opt-in. It
    is off in HotCRM today, and the page says how to turn it on.

  Claims that are properties of the deployment or its operator — data residency,
  backup key separation, TLS/mTLS, SOC 2 and ISO 27001 operation, HIPAA/BAA,
  RPO/RTO, status page and disclosure programme — are converted to the
  "property of your deployment" form pages 1 and 2 already use. Every denial is
  scoped to "nothing here does it"; none asserts what a hosted service or a
  company does or does not do.

- 64f1858: Point the automation docs at the console pages that actually exist, and gate the
  page names so the next wrong one cannot land.

  Six pages across three locales sent readers to **Setup → Process Monitor** and
  **Setup → Scheduled Jobs** to watch automation run. Neither page exists, and
  neither name exists: a literal search of the installed `@objectstack/*` tree
  returns zero hits for `Process Monitor`, and the only `Scheduled Jobs` in it is
  prose inside a schema description, not a navigation label. The sentence
  "the name you see in Setup → Process Monitor" is a factual claim about the
  product's UI, and it was false in every locale.

  Flow runs are real; they are somewhere else. What changed for readers:

  - Automation runs are read at **Studio → Developer → Flow Runs** — pick a flow,
    then read its recent runs and each run's status. The pages say that now,
    instead of promising a 24-hour cross-flow feed the page does not offer.
  - The built-in flow table is introduced as the roster shown in **Studio →
    Automation → Flows**, which is where those labels really come from.
  - Scheduled automation no longer points at a "Scheduled Jobs → History" page.
    Scheduled flows are flows, so their runs are in the same Flow Runs list — the
    same thing the page's own _Scheduled automation_ section already said.
  - The zh-Hans pages gloss the path with the zh-CN labels the console really
    shows (开发者 → 流程运行记录). The zh-Hant pages do not, and say why: the
    platform ships en / zh-CN / ja-JP / es-ES and no Traditional-Chinese pack, so
    those entries appear in English.

  This finding was still growing when it was fixed — a billing hand-off page added
  a fresh reference months after it was first reported, through a review that
  checked the flows and the three-locale docs but never asked whether the Setup
  page names inside them existed. `test/docs-setup-navigation-names.test.ts` now
  resolves cited navigation names live against the Setup and Studio navigation
  that `@objectstack/platform-objects` ships, in every shipped locale, and fails
  at PR time on a name that resolves to nothing — including bare prose with no
  `Setup → …` path, which is the shape that regression took.

- c5bc586: **Five documentation claims the product does not honour, written back to what ships.** Each was filed separately and ruled the same way — the docs move, the product does not — so they land together.

  **The app's own name (#998).** 22 doc pages across three locales called this app **Enterprise CRM**, a spelling `src/` has never carried: `CrmApp.label`, all four locale bundles, `dist/objectstack.json` and the marketplace manifest all say **HotCRM**, and it is HotCRM that a new user sees in the app launcher. The name appears to be a hand-rearranged reading of the identifier `crm_enterprise`, and it survived a full round of navigation rewrites (#927 / #938 / #943 / #963 / #976) because it was never the thing under review. All 25 occurrences now say HotCRM. `test/docs-quick-tour-navigation.test.ts` gains the app's name as an assertion: the guarded block's start marker and the app-launcher bullet on all three quick-tour pages are both derived from `CrmApp.label`, so renaming the app in `src/` goes red until the pages follow. Both holes that hid this are closed — the launcher list used to sit outside the guarded block, and the one occurrence inside it was not bold, so the "bold must be a real name" rule passed over it.

  **How many actions (#1012).** The README advertised **13 actions** beside eight other figures that are all registration counts; the stack registers **26**, and the source tree holds 6 `*.actions.ts` files — three true numbers answering three different questions. The reader-facing calibre is now the registration count, for the two reasons that decided it: it is the calibre every other number in that sentence already uses, and it is the only one a guard can re-derive instead of asserting a hand-maintained figure back at itself (a "family" is not a countable entity in source). README states 26, `docs/STATUS.md`'s note stops calling the calibre an open question, and the #729 count rule in `test/docs-drift.test.ts` gains an `actions` kind read off the registered stack. Its pattern is bold-scoped, because `actions` is the one noun on that list that is also an ordinary English word in these pages — a bare `(\d+) actions` reads the Copilot prompt _"What are the next 3 actions I should take?"_ on `whats-new` as an inventory claim.

  **Campaign members (#961).** The page promised a _Members_ tab, four standard member list views (_All Members_, _Responded_, _Bounced / Unsubscribed_, _Converted to Opportunity_) and an **Add Members** picker on the campaign. None of the three exists: `crm_campaign_member` ships no list views at all, no `relatedList: 'primary'` is declared anywhere in this repo so members render in the shared _Related_ tab, and the panel's **New** button opens a create drawer rather than picking people from lead and contact list views. The section now describes the **Campaign Members** panel and its real columns — Lead, Contact, Status, Response Date — and points at the enrolment path that does ship: the **Add to Campaign** action, which is declared on `crm_lead` only, not on contacts. Retired names are still named, in italics, so a reader who arrives with one learns where it went.

  **Forecasting (#732).** Verified against `main`: the guide already describes the shipped behaviour in all three locales — the Revenue Forecasting skill composes four read/visualise tools and answers in the conversation, `source: 'ai'` is reserved for an agent or integration of your own, and no transcript is stored. No further text change was needed; the capability half (making the skill write snapshots) was declined.

  **Permissions (#709).** `administration/profiles` promised two writes the platform refuses. Marketing User was listed as creating contacts org-wide: a contact is master-detail under its account, so the insert requires edit access to that account, which that profile holds nowhere — measured as a 403 at insert time. Service Agent's contacts were marked _(editable)_ and Marketing User's leads as editable org-wide: the platform's update gate is owner **and** creator, and org-wide read never widens it. Both personas now state, per object, whether editing reaches any record or only your own, and a new section — _Why "org-wide" describes reading, not writing_ — explains the gate once and names the two objects this app deliberately opens with a row-level rule (campaigns and campaign members, which is what makes "Add to Campaign" work for the whole team). The permission expansion itself is parked on #1062; no grant changed here.

- 774a797: Spell platform navigation in English on the Traditional-Chinese pages, and
  re-judge each name while doing it (#1113, sub-class 3 — the last one).

  Thirteen navigation names across eight `.zh-Hant.mdx` pages named screens that
  exist in **no configuration of the product**. The reason is structural rather
  than editorial: the platform ships `en` / `zh-CN` / `ja-JP` / `es-ES` and **no
  Traditional-Chinese pack**, so a zh-Hant reader is looking at the English UI
  while the page tells them to click 「設定 → 使用者」. Several of the thirteen
  were faithful translations of a label that really exists, which is precisely
  why none of them could be found on screen. The pages now use the English path
  the reader actually sees — the convention `getting-started/quick-tour.zh-Hant`
  already followed — and say once per page why a Chinese page prints English
  navigation.

  Rendering the label in English was only half of each fix, because every one of
  the thirteen was also an instance of one of the two earlier sub-classes wearing
  a Hant costume. Each was re-judged against what ships before being translated:

  - **Real labels, wrong spelling only** — 使用者 → **Setup → Users**, 整合 →
    **Setup → Integrations**.
  - **Invented screens** (sub-class 1) — 公司資訊 → **Setup → Company**, 共用設定
    → **Setup → Sharing Rules**, 權限設定檔 → **Setup → Permission Sets**, each
    with the same plain statement its English twin carries that Setup ships no
    _Profiles_ entry.
  - **Right name, wrong app** (sub-class 2) — 自動化 and 電子郵件範本 are
    **Studio → Automation** and **Studio → Integration → Email Templates**; the
    validation-rule path 設定 → 物件 → 驗證規則 → 新增 was a four-step path of
    which no step exists, and now says what the English page says: a rule is a
    `validations[]` entry in `src/objects/*.object.ts`, not a screen.
  - **Denials that survive as denials** — 潛在客戶設定 and 變更包 name screens
    the product does not have. Those sections now state that, and describe what
    really happens: an ownerless lead goes to whichever holder of `sales_rep` has
    the fewest open leads (`src/objects/lead.hook.ts`), and a package here is the
    platform's own unit, listed at **Setup → Packages** and **Studio → Packages**
    and built from source. On `guides/email-and-calendar` the two 「尚未落地」
    sections keep their Chinese wording and simply drop the arrow form, because
    there the **surface itself** is what is being denied — pointing them at a
    live path would contradict the page's own "HotCRM ships none of it today".

  This also clears the two half-converted pages the earlier passes disclosed:
  `administration/sandbox-and-releases.zh-Hant` (whose 變更包 sections were left
  stale while its 沙箱 sections were fixed) and the
  `administration/automation.zh-Hant` / `reference/glossary.zh-Hant` twins.

  The quarantine ledger in `test/docs-setup-navigation-names.test.ts` reaches
  **zero** — every bold navigation citation in `content/docs/**` now resolves
  live against what `@objectstack/platform-objects` ships. The empty ledger is
  kept rather than deleted: it is still staleness-checked in both directions, so
  the zero is asserted rather than merely absent, and the next wrong name still
  has something to fail against.

  Documentation only — no metadata, behaviour or field changes.

- 05daa5c: Fail the end-to-end suite with the actual reason when the demo seed is loaded but
  invisible to the account it runs as.

  `pnpm test:e2e` against a dev server that has been up for more than ten minutes
  failed eleven of sixteen specs on `no seeded accounts returned` and `no seeded
crm_account — the demo seed did not load`. The seed had loaded. `e2e/global-setup.ts`
  signs **up** `e2e-admin@hotcrm.test`, which lands as a plain org member that owns
  nothing and holds no sharing grant, and every seeded row starts out owned by nobody —
  which under `sharingModel: 'private'` is the only reason it could read them at all.
  Once `demo_bootstrap` (or `pnpm demo:staff`) claims those rows for the first user, the
  suite reads zero, and reported it as a missing seed.

  Global setup now states that precondition instead of depending on it silently. Two
  `?limit=1` reads separate the two states that both look like "zero rows":
  `crm_account` is `private` and swept by `demo_bootstrap`, so it goes dark the moment
  the seeds are claimed; `crm_product` is `public_read` and in no sweep, so no ownership
  state can hide it. Products but no accounts means the seed is there and claimed — the
  run aborts with that sentence and `pnpm demo:reset`; neither means nothing seeded, and
  says so. The spec-level assertions, still reachable if the sweep fires mid-run, now
  carry the same cause rather than blaming the seed loader.

  What the suite proves is unchanged: no sharing grant, no permission set, no switch to
  the seeded dev admin. The guard also cannot turn a passing run red — it returns on the
  first readable row, and waits out a seed that is still loading rather than calling it
  absent.

- 33611bc: Make the end-to-end suite independent of who owns the seeded records.

  `pnpm test:e2e` could only ever assert anything while the demo book was owned by
  NOBODY. `e2e/global-setup.ts` signs **up** `e2e-admin@hotcrm.test`, which lands as
  a plain org member holding the positions `[org_member, everyone]` — no
  `viewAllRecords`, no sharing grant — and under `sharingModel: 'private'` such an
  account reads a seeded row only while that row is ownerless. `demo_bootstrap`
  claims every ownerless row for the org's first user, so the suite's green rested
  on an accident: on CI, `objectstack start` seeds no dev admin, the suite's own
  account is therefore the org's first user, and the sweep claims the seeds FOR it.

  Measured on 17.0.0-rc.5, that accident is now narrower than #665 recorded. The
  sweep no longer waits for the wall-clock ten-minute boundary: on a fresh
  `pnpm dev` database all nine seeded accounts carried the dev admin's `owner_id`
  25 seconds after boot, so a local run failed on its FIRST attempt rather than
  after ten minutes. And a `pnpm start` database whose first user is anybody else
  fails the same way, which is exactly how much of CI's green was luck.

  The specs now create the records they assert on. A `crm_account` fixture inserts
  an account per test, the platform stamps the caller as its owner, and the
  lifecycle and win/loss specs hang their deals off that. `demo_bootstrap` selects
  `owner_id: null`, so it never touches these rows, and `pnpm demo:staff`
  re-evaluating every sharing rule cannot take them away either. Verified: 16/16
  pass against a `pnpm dev` server whose seeds belong to `admin@objectos.ai`, again
  after `pnpm demo:staff` with no `demo:reset` in between, on a cold CI-shaped
  `objectstack start` boot, and on a `start` database where the suite is the org's
  SECOND user — the state that aborted the whole run before this change.

  `e2e/fixtures.ts` now states what the suite proves about access control, because
  the change moved it: every record assertion is about a record the caller OWNS,
  reached through the OWD baseline alone. `smoke.spec.ts` asserts that owner match
  explicitly rather than leaving it implied — a read that succeeds because the
  caller holds `viewAllRecords` proves something different from one that succeeds
  because it owns the row, and this suite proves the second. It follows that
  granting the e2e account org-wide read to make a future spec easier would quietly
  weaken every assertion here; specs should create what they need instead.

  Two consequences recorded rather than left implicit. The `#665` precondition
  guard (`e2e/seed-precondition.ts`) is gone with its unit test: it guarded a
  dependency that no longer exists, and its "claimed" branch had become
  unreachable. And the `afterEach` delete loops are gone because they never worked
  — `DELETE` answers 403 `PERMISSION_DENIED … for positions [org_member, everyone]`
  for this account — so records persist and every name the suite writes now carries
  a unique suffix, which is what keeps reruns against one database honest given
  that `crm_account.name` is unique per organization.

  The win/loss spec's seeded-sweep case retires with its claim carried elsewhere:
  `test/win-loss-capture.test.ts` already asserts every settled SEED supplies its
  reason, over the seed source rather than the first 200 rows one user can see, and
  a new case here asserts the seed's own write shape — an insert landing directly
  in a settled stage — is accepted and stores the reason, the positive counterpart
  to the rejection already tested.

- 3388d2c: Docs: rewrite the Email & Calendar guide against what the app actually writes.

  The "Log a Call" section still described the pre-event behaviour — a lone
  `sys_activity` row of kind _call_. Logging a call has written three things
  since the activity model landed: a real Event record, one attendee row per
  person (you as organizer, plus the contact/lead and anyone you picked), and a
  timeline entry that points at the event. The section now says so and hands off
  to **Meetings & Calls** for the full model instead of repeating it.

  Two further claims on the page were measured and corrected:

  - Activity metrics are counted on the **Sales Activity** dashboard
    (Interactions Logged, Customer Minutes, Activity by Rep, Activity Mix), not
    on the Sales / Service dashboards, which carry pipeline and case metrics and
    no activity tiles.
  - The inbox and calendar **connector** sections — connecting Gmail/Outlook,
    two-way email and calendar sync, open/click tracking, scheduled send,
    inbound case email, email templates — describe an integration the app does
    not ship. Each is now marked _(not shipped yet)_ and points at the roadmap,
    and the sections that do ship (Send Email, AI drafting, call/meeting
    logging, privacy) are restated from the metadata: Send Email exists on the
    contact record, moves through queued → sent / failed, and delivers only if
    the deployment configures an email transport; the AI skill drafts and stops.

  zh-Hans and zh-Hant pages updated with the same content.

- 4a739b0: Stop the Automation page from claiming HotCRM ships built-in email templates, in
  all three languages. The "Email templates" section closed with _"Built-in
  templates cover lead-routing, opportunity wins, case acknowledgments, contract
  activations, renewal reminders"_ — and this app authors no email template at all.
  Nothing under `src/` writes one, and the compiled artifact carries no
  email-template metadata (`dist/objectstack.json` has no such collection among its
  top-level keys).

  An admin who read that sentence went looking for a _Renewal Reminder_ template to
  reword, and the wording they were after was never there: the notifications behind
  those business events are sent by the **`notify` nodes** inside the flows the same
  page already tabulates, with the subject and body written inline in each flow.
  The section now says so, which is also what the sentence under the flow table has
  been saying all along — the page was contradicting itself across two sections.

  Contract activation is called out separately because it is not a flow at all: it
  runs as an object hook (`src/objects/contract.hook.ts`) that sends no message
  whatsoever (#805/#823), and the contract mail that does go out belongs to the
  **Contract Auto-Expiration** and **Contract Renewal Reminder** flows.

  The correction is scoped to what this repo can prove — that HotCRM ships no
  templates of its own. It makes no claim about the platform's template surface:
  **Studio → Integration → Email Templates** stays the place to author one when a
  templated outbound email is what you need, and the rest of the section (merge fields,
  conditional blocks, HTML + plain text, attachments) describes that platform
  capability unchanged.

  Documentation only — no metadata, behaviour or field changes. Fixes #834.

- f907156: Title the escalation follow-up task with the case number instead of the record
  id. Escalating a case creates an urgent task for the account owner, and that
  task was subjected `Escalated case EMtmaScoa3I-uYFG needs attention` — the
  primary key. On a demo org with nine seeded escalations, **All Tasks** opened
  on nine urgent rows, all due tomorrow, differing only in a 16-character opaque
  string that appears nowhere else in the product: case pages, list views and
  breadcrumbs all name a case `CASE-00039`. A support agent could not tell which
  customer was on fire without opening every one.

  The task now reads:

  ```
  Escalated: CASE-00039 · Login SSO failure after password reset
  ```

  Identifier first, so the task list's truncating Subject column still tells the
  rows apart; then the case subject for human context. The record id has not been
  dropped — it travels in the task's `related_to_case` relationship, where a
  relationship belongs, and the task still opens the right case.

  Both halves come from the case the hook already has in hand, so escalation
  performs no extra read. Composed titles are capped at 255 characters — the
  length `crm_task.subject` declares and the engine enforces — with the tail
  trimmed, so a maximum-length case subject can no longer push the insert past
  the limit and lose the escalation task to a swallowed validation error.

- dae3650: Let a contact, lead or colleague who attended a meeting be deleted again. This is
  the second half of the defect fixed for campaign members: `crm_event_attendee`
  has the identical construction, and anyone who had ever been logged as a meeting
  attendee was **permanently undeletable** — through the API and through the UI —
  with a refusal naming an object the caller had not touched:

  ```
  DELETE /api/v1/data/crm_lead/<id>
  → 400 {"error":"An attendee must point at a Contact, a Lead, a User, or name an
         external guest","code":"VALIDATION_FAILED","object":"crm_lead"}
  ```

  The cause was a default nobody wrote down. The three party lookups
  (`crm_contact`, `crm_lead`, `sys_user`) declared no `deleteBehavior`, so all
  three took `Field.lookup`'s spec default of `set_null`. Deleting the person made
  the engine's referential pass clear that column, the cleared row instantly
  violated `attendee_resolves` — the rule the same object declares — and the whole
  delete rolled back. The rule's `external_name` escape hatch rescued nothing,
  because the activity actions that create attendees always write a party
  reference and never an external name. Since logging a meeting is an ordinary
  part of the sales flow, ordinary use reached it, and a GDPR-style "delete this
  person" request could not be served at all.

  All three party lookups now declare `deleteBehavior: 'cascade'`. An attendee row
  is a junction row whose whole meaning is "this person was in this room"; once the
  person is gone the row denotes nothing, so deleting a contact, a lead or a user
  now removes their attendance with them.

  **What changes for you:** deleting a contact, lead or user silently removes their
  `crm_event_attendee` rows, so a meeting's attendee list loses that person and
  attendance-based counts drop accordingly — deliberately, since the person is
  gone. The meeting itself is untouched, as are attendee rows naming anybody else
  and external-guest rows, which name no CRM record at all. The `sys_user` lookup
  gets the same treatment on purpose: account erasure runs through better-auth's
  `delete-user` / `admin/remove-user` routes onto the same delete path, and every
  other user reference in the app already degrades on deletion, so this junction is
  not the place to start vetoing it — deactivation (ban / unban), not deletion,
  remains the ordinary offboarding path and is unaffected. Deleting a **meeting**
  that still has attendees is still refused, now visibly the only refusal left, and
  it names the real obstacle: a meeting's attendee list is its historical record.
  Refs #711, #696.

- d0aa956: Strip inert widget config and fabricated trend percentages from the Executive Overview dashboard.

  The dashboard's widgets are dataset-bound, and the console's dataset widget renders purely from `type`/`dataset`/`dimensions`/`values`/`filter`/`filterBindings`/`layout` plus the dataset's own field metadata. Everything else the widgets carried — `chartConfig` blocks (colors, axes, legends), `colorVariant`, widget-level `actionUrl`/`actionType`/`actionIcon`, and free-form `options` (icons, formats, table column specs) — was never read by the renderer and only suggested tunability that didn't exist. Worst among these were hardcoded KPI trends (`+12.5% vs last quarter`, etc.): static made-up numbers posing as period-over-period deltas. All of it is removed; real trend deltas need a comparison query (`compareTo`) once the renderer supports it for dataset metrics.

  The one piece of inert config with real intent — `options.dateGranularity: 'month'` on the trend charts — cannot be honored yet: the platform's supported mechanism (a dataset dimension's `dateGranularity`) routes the query through the ObjectQL aggregate bridge, which drops the caller's ExecutionContext and fail-closes the read scope (`id = '__deny_all__'`) on @objectstack 16.1, returning zero rows (verified in-browser and at the SQL layer). The trend widgets keep grouping by the raw date dimensions — unchanged behavior — and the datasets carry a note pointing at the upstream bug so the granularity can be declared once it's fixed.

- 60b5012: Write the "first-response SLA", the Lead reports section and two enumeration-free
  behaviour claims to source, in all three locales.

  **A measurable first-response target never existed.** Three pages presented one as
  if the app kept it: the setup checklist's §11 SLA matrix carried an entire _First
  response_ column (1 hour at Critical through 1 business day at Low), the reports
  page promised _"% first-response on time"_, and the Service Cube listed both a
  _First-response time (minutes)_ measure and an _SLA met %_. `first_response_date`
  does have a writer — `logActivityAction` in `src/actions/global.actions.ts` stamps
  it the first time a call or meeting that already took place is logged on a case —
  but nothing in the repo compares that stamp against a target: `case_metrics`
  (`src/datasets/case.dataset.ts`) declares no first-response measure, no report or
  tile reads it, and no flow alerts on it. The four numbers themselves appear
  nowhere, and `content/docs/service/sla-and-escalation`, which the checklist links
  to for them, does not mention a first response at all. All three pages now name
  the stamp, name what is absent, and state the first-response promise for what it
  is — the team's own service commitment. The SLA matrix keeps its resolution
  column, with Critical marked as the one row `case_sla_defaults` turns into a
  deadline. The cube's SLA measure is named as what `case_metrics` really declares:
  an **SLA Violation Rate**, not a compliance percentage.

  **The Service reports table listed six reports where `src/reports/case.report.ts`
  publishes three.** _Cases by Status and Priority_, the SLA report and _Cases
  Opened by Priority × Day_ are real; _Case Volume by Origin_, _Case Resolution
  Time_, _Top Accounts by Case Volume_, _Reopened Cases_ and _CSAT by Agent_ are
  not published anywhere, and most of them ask `case_metrics` for something it
  does not carry — there is no agent dimension, no account dimension, no reopen
  marker on the case and no measure over **Customer Satisfaction**, so three of
  those five cannot be built as custom reports either. The section now lists the
  three real reports with their real grouping, and says of each absent one why it
  is absent. Two subscription examples that named a report from that list now name
  a published one.

  **The Lead reports section listed three reports that do not exist**, and omitted
  the one that does. `src/reports/` publishes exactly one lead report — **Lead
  Engagement by Month × Source** (`src/reports/lead.report.ts`), a matrix of
  contacted-lead volume by source and month — while the page listed _Lead Conversion
  Funnel_, _Lead Source ROI_ and _Aged Leads_, none of which is published anywhere.
  Two of them also spelled a lead status that does not exist: _Working_ is a row in
  the import alias table (`src/mappings/lead_import.mapping.ts`) that maps a legacy
  value onto **Contacted** at import time, not a value of `crm_lead.status`, whose
  route is _New → Contacted → Qualified → Unqualified → Converted_. The section now
  lists the real report, names the three absent ones, and says what `lead_metrics`
  can and cannot answer.

  **Two behavioural claims outside any enumeration.** The setup checklist sent
  admins to a **Setup → Opportunity → Stages** screen that does not exist — the
  stages are the `stage` field's options in `src/objects/_picklists.ts` and the
  probabilities are the `STAGE_PROBABILITY` map in `src/objects/opportunity.hook.ts`,
  which re-derives probability from the stage on every save. And the state-machines
  page advised hanging automation off a transition because it is _"much more
  performant"_; there is no transition to hang it on (the table is a warning-severity
  validation rule that logs and emits nothing), and the comparison had no basis. The
  tip now describes what the app actually does — a `record_change` flow that narrows
  itself in its start condition, as `opportunity_won_alert` does.

  Documentation only; `src/` unchanged. Fixes #936, #951, #952.

- 3dcc301: Make record-change flow conditions TOTAL, so three automations stop silently
  failing to run on Mongo- and memory-backed installs.

  A flow's start/edge condition is bare CEL, and strict CEL aborts the whole
  expression on a key that is not present — not just on a null one. The
  record-change trigger builds the flow's `record` as the mutation payload with
  the **driver's post-write row** overlaid, and `previous` from the driver's prior
  row, so on a datasource that stores only the columns a row was written with
  (`driver-memory`, `driver-mongodb`; the SQL family is column-complete and
  unaffected) an unwritten field arrives genuinely MISSING. Three conditions read
  such a field with no guard, and were measured aborting end-to-end:

  - **`case_escalation_on_create`** — a case created critical is stored with no
    `escalated_date` column, so `record.escalated_date == null` aborted and a
    phone-in P1 was never escalated. That is the flow's core population.
  - **`contact_welcome`** — `owner`'s `os.user.id` default cannot evaluate on a
    write that carries no user (seed data, integrations, any system context), so
    the row has no `owner` column and `record.owner != null` aborted; no seeded
    contact ever produced a welcome prompt.
  - **`lead_assignment`** — `rating` is neither required nor defaulted, so
    `record.rating >= 4` aborted and an unrated lead got no SLA stamp and no
    alert at all.

  The failure was quiet because CEL's `&&` absorbs an error beside a `false`
  operand: these conditions answered correctly for every record they were meant
  to skip, and blew up only on the records they were meant to act on. The run is
  recorded as failed and logged at ERROR, but the write itself succeeds and
  nothing user-visible says the automation did not happen.

  Every `record.x` / `previous.x` read in a record-change flow condition now
  carries a `has(...)` guard, and every ordering comparison additionally carries
  `!= null` (an explicit null passes `has()` and then aborts with
  `no such overload: dyn<null> > int`). The rewrites are conservative — verified
  across the full cross-product of absent/null/valued shapes, they return the
  same answer as before wherever the original returned one at all. Two places
  needed a judgement call and say so in-file: `lead_assignment`'s two branches
  must PARTITION, so the standard branch absorbs an unreadable rating rather than
  both branches going false and dropping the lead silently; and
  `opportunity_won_alert` guards `previous.stage` fail-closed, because that term
  exists solely to stop a repeat congratulations blast to management.

  Adds `test/flow-condition-totality.test.ts`, which enforces the rule three
  ways: a structural sweep for the guards, a measured sweep that runs every
  condition through the real `AutomationEngine.evaluateCondition` across the
  shapes a sparse driver produces, and end-to-end tests that boot a real ObjectQL
  over `InMemoryDriver` with the real record-change trigger and reproduce each of
  the three defects. It also pins the counter-fact to
  `test/sharing-seeding.test.ts`: `has()` is correct here and is _rejected_ on the
  sharing surface, which compiles its conditions to pushdown filters instead of
  interpreting them — so neither conclusion can be carried across. Refs #633,
  #630.

- 44e0f5a: Make flow conditions actually evaluate (#562). Every `decision` node and
  conditional edge in `src/flows/` authored its condition as a bare string, and
  `AutomationEngine.evaluateCondition` only routes an `Expression` envelope
  (`{ dialect, source }`) to the CEL engine. A bare string fell through to a
  legacy template path that substitutes `{var}` braces and then compares both
  sides as strings — so no condition in the app was ever evaluated as an
  expression.

  The failure mode was not a uniform no-op, which is what made it dangerous.
  `existingStallTask == null` compared `'existingStallTask'` to `'null'` and was
  always false, so `opportunity_stagnation` selected the right stalled deals (once
  #489 was fixed) and then silently dropped every one of them at the idempotency
  gate — no notification, no follow-up task, and a `success` run record either
  way. In the other direction `record.rating >= 4` compared `'record.rating'` to
  `'4'`, and `'r' > '4'` is true, so `lead_assignment` pinned the Hot branch open
  and never took the Standard path.

  All 41 condition sites are now authored with the `P` tagged template from
  `@objectstack/spec`, which emits the envelope at authoring time. The condition
  sources are unchanged: they were already valid CEL — flow variables resolve by
  bare name and `record` is the triggering record, because the engine merges its
  variable map onto the CEL scope via `ctx.extra`. Only the envelope was missing.

  Note that `defineFlow()` would not have been enough on its own: it normalizes
  the typed edge `condition`, but a node's `config` is `z.record(z.unknown())`, so
  every start-node trigger gate would have stayed a bare string.

  A guard in `test/metadata-references.test.ts` fails on any condition that is not
  a CEL envelope, at either site, so the bare form cannot come back silently.

- 482d93e: Make the flow **node** labels say what those nodes do. #851 corrected the
  Automation page's flow table and the `opportunity_won_alert` description; the
  same three claims survived one layer further in — on the nodes themselves, which
  ship as authored metadata in `dist/objectstack.json`, and in a file-header
  comment that had started contradicting the description right above it.

  - **`Notify Management` → `Notify Owner`** (`src/flows/opportunity-won-alert.flow.ts`).
    The node addresses `{record.owner_id}` and nothing else. The comment directly
    above it already explained why there is no manager recipient —
    `{record.owner_id.manager}` cannot traverse a lookup on the raw trigger
    snapshot, so it interpolates to the literal `undefined` and the message goes to
    a phantom user — so the label was contradicted by its own header.
  - **`Assign to Senior Agent` → `Flag as Escalated`** (`src/flows/case-escalation.flow.ts`).
    The `update_record` node writes `is_escalated`, `escalation_reason`,
    `escalated_date` and `status`. It never touches `owner_id`; the comment inside
    it opens with _"No owner reassignment"_. The case stays with the agent who had
    it, exactly as the escalation notice already tells the recipient: _"It remains
    assigned to you."_
  - **`Notify Support Team` → `Notify Case Owner`** (`src/flows/case-escalation.flow.ts`).
    Same file, same class of claim: `recipients` is the single entry
    `{caseRecord.owner_id}`, not a team. The identical node in
    `src/flows/case-sla-monitor.flow.ts` — same `notify_team` id, same owner-only
    recipient — already carries the honest label `Alert Owner`; this one had been
    left behind.

  The file-header comment on `src/flows/opportunity-won-alert.flow.ts` still
  described the flow as _"notify the owner and their manager"_, the sentence #851
  removed from the `description` eleven lines below it. It now uses that same
  correction, so the two no longer disagree.

  Node **ids** are deliberately untouched — `notify_management`,
  `assign_senior_agent` and `notify_team` keep their original spellings because
  `edges[]` reference nodes by id and `CaseEscalationOnCreateFlow` rewrites the
  node list by id. Renaming one would be a behaviour change wearing a wording
  fix's clothes, so each node now carries a short note saying so, to keep the next
  reader from "tidying" an id that looks stale next to its corrected label.

  Labels and comments only. No flow behaviour changed: no recipient, condition,
  field set, edge or id differs, and this takes no position on whether escalation
  _should_ reassign or _should_ copy a manager — those remain open product
  questions whose answers would be behaviour changes with their own docs.
  Fixes #869.

- 5868728: Make two rows of the Automation page's built-in flow table describe what those
  flows actually do, in all three languages, and fix the same claim inside the
  flow's own metadata description.

  **Large Deal Won Alert** was billed as _"notify the owner and their manager"_. It
  notifies the owner and nobody else: the flow's single `notify` node addresses
  `{record.owner_id}` on inbox + email, and there is no manager recipient anywhere
  in it — not a `manager_id`, not a position or team target. The node header in
  `src/flows/opportunity-won-alert.flow.ts` explains why the manager was dropped:
  `{record.owner_id.manager}` cannot traverse a lookup on the raw trigger snapshot,
  so it interpolates to the literal `undefined` and the message is delivered to a
  phantom user. A sales director who read the old sentence expected an alert on
  every large win and received none. The flow's own `description` carried the same
  claim (_"notify owner + manager"_) — the table had faithfully copied it — so both
  now say the owner alone, not their manager.

  **Case Escalation Process** was billed as _"reassign to a senior agent, notify,
  create a follow-up task"_. Measured node by node against
  `src/flows/case-escalation.flow.ts`:

  - **No reassignment.** The `update_record` node writes `is_escalated`,
    `escalation_reason`, `escalated_date` and `status` — it never touches
    `owner_id`, for the same lookup-traversal reason as above. The case stays with
    the agent who had it, which the escalation notice already told the reader in so
    many words: _"It remains assigned to you."_ A service manager who believed
    escalation handed the ticket to a senior agent had no reason to build the
    manual hand-off that is actually required, and none of the three pages said so.
  - **The follow-up task is real, but it is not the flow's and it is not the
    senior agent's.** The flow carries no `create_record` node, deliberately — the
    escalation write flips `status` to `escalated`, which fires the
    `case_status_side_effects` hook in `src/objects/case.hook.ts`, the single owner
    of escalation follow-up tasks. That hook opens an **urgent** task for the
    **account owner**, due the next day. A task node in the flow too had produced
    duplicate, disagreeing tasks per escalation. So the row keeps the task and
    corrects who it lands on.

  Both rows name the mechanisms readers arrive looking for — _manager_, _senior
  agent_, _follow-up task_ — rather than deleting the words and leaving a reader to
  conclude the page simply forgot to mention them. They describe today's behaviour
  only, and take no position on whether escalation should reassign; that is an open
  product question, and a change there is a behaviour change with its own
  documentation update.

  Documentation plus one metadata description string. No flow behaviour, node,
  condition or recipient changed: the pages and the description now match the flows
  as they already run. Fixes #851.

- f227ed9: Fix two automations that could stop running mid-flow, and pin the property that
  prevents it.

  **Enroll Leads in Campaign** aborted whenever the campaign it was launched from
  had been deleted — or was hidden from the running user by a sharing rule —
  between clicking the action and the flow reaching its "Campaign Open?" gate. The
  gate read the campaign's status off a record that was no longer there, the run
  was recorded as failed, and not one lead was enrolled. It now reaches a verdict
  on every shape and simply enrols nobody when the campaign cannot be read.

  **Lead Conversion Process** aborted at "Create Opportunity?" whenever the
  conversion screen came back without an answer for that checkbox — the ordinary
  case when the user leaves it alone. The lead was never marked converted and no
  account, contact or opportunity survived the run. The flow now starts from the
  same default the screen shows ("no opportunity"), so an unanswered checkbox
  converts the lead exactly as leaving it clear was always meant to.

  Two scheduled automations were hardened against the same class of failure before
  it could bite: **Contract Renewal** (a contract whose renewal-notice days or
  auto-renewal flag were never written would have taken the whole 500-contract
  sweep down with it) and the **Large Deal Approval** tier gate.

- 398f300: Forecasts: the current quarter now has exactly one writer, so re-seeded orgs stop growing a phantom ownerless row

  On every boot the demo seeds are replayed, and until now they included a
  current-quarter `crm_forecast` row. Seeded rows arrive with no owner — a seed
  cannot name a user — while the nightly `forecast_snapshot` sweep looks for the
  current-quarter row **by owner**. The sweep therefore never saw the seeded row,
  concluded the period was missing, and opened a second row spanning the same
  quarter. Anything that groups forecasts by owner — the Sales dashboard's _Quota
  Attainment by Rep_ table above all — then showed a duplicate current-quarter
  entry with a blank Owner, after every re-seeded boot.

  The seeds now stop at that window's edge: they ship **settled quarters only**,
  plus the current month, which no automation writes. The current quarter belongs
  to `forecast_snapshot` alone — one producer per window, whichever order the two
  scheduled sweeps happen to run in.

  `demo_bootstrap` additionally claims `crm_forecast`, the one owner-scoped seeded
  object it had been skipping. Forecasts are `private` and sales reps read only
  their own, so an ownerless snapshot was not merely blank on the owner axis — it
  was invisible to every rep and editable by nobody. Settled demo snapshots now
  belong to the first user, like every other seeded record.

  What this changes for a demo org: on a freshly seeded database the _Quota
  Attainment by Rep_ table is empty until the 03:00 sweep opens the quarter's
  rows, and their **Quota** stays blank until someone sets one. Quota has no
  automated writer by design — it is the hand-maintained denominator of
  attainment — and an empty table is the same honest state that widget already
  shows at a quarter boundary. What it replaces is a row attributed to nobody,
  carrying a quota no rep was on the hook for.

  Existing databases: run `pnpm demo:reset` to drop the stale demo row, or delete
  the ownerless current-quarter forecast by hand. No user-authored data changes.

- f20637f: Forecast: a hand-filled Period End must now be the last day of its own calendar period

  A forecast row's window is supposed to be the calendar period its label names.
  Since #1008 the **start** was pinned to a calendar boundary, but **Period End**
  stayed editable on the record form and only had to be _after_ Period Start — so
  the same inconsistent row was still reachable from the other end. A quarterly
  forecast starting 2026-07-01 could be saved with a hand-typed Period End of
  2027-05-15 and stored under the label **Q3 2026**: a row that says one quarter
  and spans ten months.

  That row is not cosmetic. The _This Quarter_ forecast view and the Sales
  dashboard's _Quota Attainment by Rep_ table match Period Start by equality, and
  the nightly Forecast Snapshot sweep picks the current row with
  `period_start <= today <= period_end` — so an over-long window makes one row
  answer to "current" for months on end.

  **What changes for you.** A write that sets Period End by hand is now refused
  unless it is the last day of the period Period Start opens — 2026-09-30 for a
  quarter starting 2026-07-01, 2026-08-31 for Aug 2026. The Period End field's
  help text on the record form states the rule, in all four locales.

  Nothing else about the field changed: it is still editable, and leaving it
  blank still derives it automatically, so the nightly sweep and every other
  automated writer are untouched. Because the check is a record-level validation
  rather than a field constraint, it also applies to rows that were **already**
  stored with a bad window — such a row is refused on its next edit until the
  window is corrected, and correcting it is always allowed.

- 3d7e69a: A forecast may only start on a calendar-period boundary — a hand-filled `Period Start` in the middle of a month or quarter is now refused instead of quietly producing a window that outruns its own label.

  `forecast_derive_period` keeps a caller-supplied `period_start` as given, then
  derives `period_end` as "start + one period". That is a ROLLING window, not "the
  last day of the calendar period this start belongs to", so the window length was
  right and its POSITION drifted with whatever was typed, while `period_label`
  named the period the START fell in. Measured on the real handler:

  | period  | period_start | derived period_end | derived period_label    |
  | ------- | ------------ | ------------------ | ----------------------- |
  | quarter | 2026-07-15   | 2026-09-30         | Q3 2026                 |
  | quarter | 2026-08-15   | **2026-10-31**     | Q3 2026                 |
  | quarter | 2026-09-20   | **2026-11-30**     | Q3 2026                 |
  | month   | 2026-08-17   | 2026-08-31         | Aug 2026 (half a month) |

  The last three rows are internally inconsistent, and no consumer can tell:
  `this_quarter_forecasts` and the quota-attainment widget pin `period_start` by
  equality, and the nightly `forecast_snapshot` sweep selects the current row with
  `period_start <= today <= period_end`.

  Two object validation rules — `period_start_first_of_period` and
  `quarter_starts_on_quarter_boundary` — now refuse such a write on every path
  (record form, API, seed) with a `VALIDATION_FAILED` error, rather than a warning
  that lets the row land. `Period Start` remains free otherwise: any month start
  is a valid monthly forecast, and January 1 / April 1 / July 1 / October 1 open a
  quarterly one.

  Nothing this app writes changes: the snapshot flow sends only `period` and the
  hook derives a boundary start from it, and every seeded forecast already starts
  on a calendar boundary. Manual entry by a manager keeps working — with the start
  on the boundary of the period being forecast, which is what the label always
  claimed.

  Fixes #1008.

- 9652cbc: Add regression tests pinning forecast seed calendar alignment (#530).

  The "This Quarter" forecast view rendered empty because seeded quarterly
  snapshots carried relative `period_start` dates (`daysAgo(45)` →
  mid-month values like 2026-06-13) that an exact-match
  `period_start equals {current_quarter_start}` filter can never hit. The
  seeds were rewritten to real calendar periods in #516 and the view's
  unresolvable token filter removed in #515, but nothing in CI guarded the
  invariant — it had already regressed silently once.

  `test/forecast-seeds.test.ts` now asserts that every seeded forecast
  snapshot starts exactly on its calendar quarter/month boundary, that
  `period_end` closes the same period, that `period_label` matches the
  dialect `forecast.hook.ts` derives (`Q3 2026` / `Aug 2026`), that a
  snapshot exists for the current calendar quarter (the row any
  this-quarter filter must be able to match), and that `period_label`
  values stay unique since they are the seed upsert identity. Verified to
  fail 6/8 against the pre-#516 seed data.

- 29e6f0c: Forecast demo seeds no longer upsert on `period_label`, which stopped identifying a single row

  `crm_forecast` is a per-owner snapshot, and since the nightly `forecast_snapshot`
  sweep began writing one row per active opportunity owner per quarter, every one
  of those rows carries the same `period_label` ("Q3 2026"). The demo seed still
  used that label as its upsert key, so re-seeding an existing database matched
  whichever row the loader returned first and could overwrite a real
  freshly-computed snapshot with the demo numbers.

  `crm_forecast` gains a `seed_key` column that only the seed loader ever writes,
  and the demo seed now upserts on it. The field is `readonly` — seed writes run
  in system context and bypass readonly stripping, user and API writes do not — so
  a genuine forecast row can never carry a value there and can never be matched by
  a re-seed. It is also `hidden`, keeping a fixtures-only column out of forms and
  pickers.

  Existing demo databases are unaffected in place; the seeded forecast rows are
  re-keyed on the next reseed (`pnpm demo:reset`). No user-authored data changes.

- 02ebaf1: Stop the nightly Forecast Snapshot from overwriting a forecast someone entered
  by hand. A manual forecast for a period now **suppresses** the automated
  snapshot for that period.

  Before, the 3 AM sweep picked "this owner's current-quarter row" purely by
  window containment — and a manager's hand-entered row (**Source: Manual entry**,
  typed into the Snapshot block of the forecast form) sits in exactly that window.
  Since the period boundaries were pinned to the calendar quarter, the manager's
  row and the sweep's row became indistinguishable by construction, so the sweep
  adopted the manual one: all four amounts replaced with its computed totals,
  **Snapshot Date** restamped to today, **Source** flipped from Manual entry to
  Scheduled snapshot. **Quota** survived — the sweep never writes it — which is
  what made the loss easy to miss: attainment and coverage silently re-based onto
  the swept numbers while the row still looked plausible, and nothing recorded
  that the typed numbers had ever existed.

  What changes, per period and per owner:

  - **A manual (or AI-written) forecast exists** → the sweep stands down for that
    owner and period. It writes nothing and, just as importantly, opens no second
    row beside it, so _This Quarter_ and the Sales dashboard's _Quota Attainment
    by Rep_ still see exactly one row.
  - **A scheduled row exists** → refreshed in place, exactly as before.
  - **Nothing exists** → the sweep opens its own row, exactly as before.

  Deleting the manual row hands the period back to automation: the next sweep
  opens its own row again. That is the only way out, and it is an ordinary edit —
  no schema change, no second object, no view-precedence rule.

  Mechanically, the sweep now reads through two filters instead of one: the
  idempotency gate still asks "has this period been handled?" of _any_ row in the
  window, while the write target asks "which row do I own?" and matches only rows
  with `source: 'scheduled'`. Narrowing the single shared filter instead would
  have made the gate stop seeing the manual row and open a duplicate in the same
  window. Refs #1082, #702, #1008, #1093.

- aa6488d: The forecasting guide's **AI** source bullet now describes the Copilot skill
  that ships — a read-only analyst — instead of a record writer and a transcript
  store, neither of which exists.

  `content/docs/sales/forecasting.mdx`, under **How forecasts get created**, told
  admins that "the Copilot skill generates a forecast from current pipeline +
  recent stage moves + similar past deals. The conversation transcript is stored
  alongside the record." Measured against `src/`:

  - `revenue_forecasting` declares `tools: ['describe_object', 'aggregate_data',
'query_records', 'visualize_data']` — four read/visualize tools and no write
    tool at all. Its instructions tell the model to compute the forecast _in the
    answer_ ("Forecast by summing weighted value for open deals plus closed-won in
    the period"), and its header says outright that the skill declares no tool
    records.
  - Nothing else writes `crm_forecast` either: the only writer in `src/` is the
    nightly `forecast_snapshot` sweep, which stamps `source: 'scheduled'`.
  - There is no transcript field to store a transcript in. `notes` (text, 1000
    chars) is the object's only narrative column, and a person types it.

  So an admin reading the old bullet waited for rows to appear from Copilot
  conversations that will never appear, and looked for a transcript that has
  nowhere to live. It also read as a second automated writer of a current-quarter
  snapshot, one paragraph above the "exactly one automated writer" rule #702
  established and #627 documented.

  The rewritten bullet states what the skill does (composes the four read tools
  over live opportunity data and answers in the conversation) and what the `ai`
  value on `source` actually is today: a value nothing in HotCRM writes, reserved
  for a snapshot an agent or integration of your own creates. The field table's
  **Source** row carried the same claim in three words — "`ai` (Copilot-generated)"
  — and now says the same thing as the bullet, so the page no longer contradicts
  itself one screen apart. The picklist option itself is left in place — it is
  metadata surface, and whether HotCRM should grow the capability that writes it
  is a product question, not a docs fix.

  Both Chinese translations carry the same correction. Documentation only — no
  metadata, skill, flow or object changed.

  Part of #732.

- 627d4a0: The forecasting guide now documents the attainment field that ships, and stops
  contradicting where a current-quarter snapshot comes from.

  `content/docs/sales/forecasting.mdx` told admins that attainment "is computed in
  the report layer; no dedicated field". `crm_forecast.attainment_pct` has been a
  formula field on every snapshot — `closed_amount ÷ quota × 100`, guarded so a
  zero or missing quota reads `0.00` instead of erroring — and it is a column on
  all three forecast list views and a field on the record form. `coverage_ratio`
  sits beside it with the same shape. An admin
  following the old bullet rebuilt in a report something the object already
  computed per row, and was never told about the zero-quota guard.

  The rewritten bullet also states why the per-row field and the dashboard number
  are deliberately different: `attainment_pct` is per row on a 0–100 scale, while
  the `forecast_metrics` dataset's **Attainment** measure is `closed ÷ quota` as a
  0–1 ratio that sums both sides first, so a group of reps is weighted by the
  quota each carries rather than averaging per-row percentages. They also part
  ways on a missing quota — the field reads `0.00`, the ratio measure returns no
  value at all.

  Same-page corrections made while that bullet was being rewritten, all of them
  statements #702 left stale:

  - **Where the current quarter comes from.** The seeds ship settled quarters and
    the current month only; the nightly sweep is the sole automated writer of a
    current-quarter row.
  - **When rows appear.** On a freshly seeded org there are no current-quarter
    rows until the 03:00 sweep has run once, so _Quota Attainment by Rep_ is
    legitimately empty until then — stated on the roll-up bullet as well.
  - **Who writes quota.** Nothing does. Quota is the hand-maintained denominator
    of attainment and stays blank on every row the sweep opens.
  - The FAQ "Can a forecast roll up from opportunities automatically?" answered as
    though you had to build that flow yourself. The **Forecast Snapshot** flow has
    shipped since #590 and re-sums the four amount columns nightly; quota is the
    exception, and stored amounts are still never recomputed on read.

  Both Chinese translations carry the same corrections. Documentation only — no
  metadata, flow or dataset changed.

  Fixes #627.

- 4dfc8e0: Correct what the Forecasting page teaches about a `period_start` or `period_end`
  you supply by hand. In all three locales it said a supplied value "is kept
  exactly as you sent it" and that "nothing snaps it back", with a worked example:
  send `period_start` 2026-07-15 for a quarterly snapshot and get a row stored
  mid-quarter under a **Q3 2026** label.

  That write is refused. Three validations now pin a forecast's window to the
  calendar period it is labelled with:

  - `period_start_first_of_period` / `quarter_starts_on_quarter_boundary` — the
    start must be the period's own first day, and a quarterly forecast must
    additionally start on January 1, April 1, July 1 or October 1.
  - `period_end_matches_calendar_period` — a hand-typed end must be that period's
    last day; leave it blank and the derivation still fills it in.

  The page's _advice_ was already right — send the period's first day, or send no
  `period_start` at all. Its _reason_ was the pre-validation one: send it because
  the period-scoped filters will otherwise miss the row. A reader who reasoned from
  that reason got an error the page said could not happen, so both are corrected
  together. Being hard to find is now given as why the rules exist rather than as
  what happens instead of them.

  The rewritten paragraph also states the repair path, which the page never had:
  because these are record-level validations, a row stored before they shipped is
  refused on its next save — even a save that does not touch the period — until its
  window is corrected, and that correction is always accepted.

- bbe7859: Stop the forecasting page promising that a period boundary is "always computed,
  never typed" — a `period_start` you supply is kept exactly as you sent it.

  `content/docs/sales/forecasting.mdx` taught both halves of the derivation in two
  consecutive sentences: "Supply a `period_start` to snapshot a specific quarter or
  month", then "Because the boundary is always computed, never typed, every
  snapshot for the same quarter lines up exactly". Read together, those promise
  that whatever `period_start` you send gets snapped onto the calendar boundary.
  `forecast_derive_period` does no such thing — it fills blanks and never rewrites
  a value that arrived with the record:

  ```
  { period: 'quarter' }                             → period_start 2026-07-01  (computed)
  { period: 'quarter', period_start: '2026-07-15' } → period_start 2026-07-15  (kept as sent)
                                                      period_label 'Q3 2026'
  ```

  So a hand-written mid-quarter date is stored mid-quarter, labelled **Q3 2026**,
  and then missed by every surface that pins `period_start` to the quarter's real
  first day — the forecast list's _This Quarter_ tab and the Sales dashboard's
  _Quota Attainment by Rep_ table both do.

  The page now says what the hook does: the derivation lives in one place so the
  snapshots that leave `period_start` blank all line up (which is what every
  automated writer does — the nightly sweep sends `period` and nothing else), and
  a supplied value is stored verbatim, with the advice to send the period's first
  day or send nothing at all. Same edit on all three locale pages (`.mdx`,
  `.zh-Hans.mdx`, `.zh-Hant.mdx`).

  Documentation only — no metadata, hook or view behaviour changes. Both halves of
  the boundary contract are now pinned in `test/hooks-runtime-service.test.ts`, so
  the prose goes red with the handler if that behaviour is ever changed. Fixes #748.

- 768a94b: Retranslates the Chinese forecasting pages against the current English page, and
  adds a CI guard so a translation can no longer silently drop a callout.

  `content/docs/sales/forecasting.zh-Hans.mdx` / `.zh-Hant.mdx` carried drift that
  predates #627 — it survived both #735 and #742, which only touched the paragraphs
  those issues were about. Three of the divergences were wrong rather than merely
  stale, and every zh reader got the wrong model of how a forecast is built:

  - **The buckets were described backwards.** Both pages called pipeline / best case
    / commit "相互独立的桶 / 相互獨立的桶" — mutually independent buckets answering
    different questions. They are **nested**: `forecast-snapshot.flow.ts` sums
    best case as `forecast_category` in `['best_case', 'commit']` and commit as
    `forecast_category = 'commit'`, both inside the open-pipeline set, and
    `forecast.object.ts` states the ladder outright ("the buckets are CUMULATIVE —
    each is a subset of the one above it"). A reader who added the three numbers
    together — the natural thing to do with independent buckets — double- and
    triple-counted the same deals.
  - **The retired probability threshold was still there.** "承诺（按惯例 ≥ 80% 概率）
    / 承諾（按慣例 ≥ 80% 機率）" names a boundary no writer applies. #590 removed
    exactly this shape from the field descriptions ("Was 'probability >= 60%', which
    named a threshold no writer applied and which disagreed with the stage →
    forecast_category map that actually classifies deals") and the English page has
    not carried it since. The stored `forecast_category` column, derived from
    `stage`, is the single boundary — the same one the _Closing This Quarter_ view
    and the _Pipeline by Forecast Category_ chart use. The claim is deleted, not
    softened.
  - **The #614 warning box was missing entirely.** "Always scope a roll-up to one
    period" — the trap where a chart adds a quarter's quota to a month's to last
    quarter's, the defect that shipped on `quota_attainment_by_rep` — had no
    counterpart in either locale.

  Two smaller corrections came out of the same pass: the field table said
  `period_start` is something you supply (all three period fields are derived), and
  the derivation section had lost both the "leave `period_start` out and the
  snapshot lands on the calendar period containing its snapshot date" case and the
  paragraph on why a computed boundary is what makes "this quarter" filters work.
  The paragraph explaining that Forecast Category follows Stage automatically was
  absent too.

  Terminology follows the table #735 aligned (配额 / 達成率（%）/ 覆蓋倍數 /
  数据集 vs 資料集 / 快照), and the app's own zh labels for the bucket vocabulary
  (预测类别 / 預測類別, 最佳情况 / 最佳情況, 承诺 / 承諾). #742's AI-source paragraph
  and Source annotation are preserved word for word — they were measured against the
  runtime and are not part of this drift.

  The guard is the part that keeps the third divergence from recurring anywhere in
  the docs: `test/docs-drift.test.ts` now requires every translated page to carry
  the same number of callouts as its English page. A `> …` box is where a page puts
  the trap someone already fell into, so a translation that drops one drops the
  warning. The rule counts blockquote **blocks**, not `> ` lines — CJK text wraps at
  different widths, and a line-based count reports six other pages as drifted while
  they have every box. Measured across the tree: 2 mismatches before this change,
  both of them these two pages, and 0 after.

  Fixes #736. Follows #627 / #735 / #742, and mirrors #685 for the dashboards pages.

- 7e40ab0: A frozen record no longer makes the people it references undeletable. The three
  freeze/lock guards — the converted-lead lock, the closed-opportunity freeze and
  the accepted/expired quote freeze — now yield to the engine's reference-cleanup
  write, so a delete that has to clear a link on a settled record completes
  instead of being refused:

  ```
  DELETE /api/v1/data/crm_contact/<id>
  → was 400 "Opportunity … is closed (closed_won) and frozen, so its link(s)
             primary_contact cannot be cleared — which also blocks deleting the
             record(s) they point at."
  → now 200, with the closed deal's primary_contact cleared and nothing else
        about the deal touched.
  ```

  The engine implements `deleteBehavior: 'set_null'` by UPDATING the row that
  holds the lookup, so "delete this contact" reaches the holder's `beforeUpdate`
  looking exactly like a user editing a settled record — which is what these
  guards exist to refuse. The consequence was not cosmetic: a contact whose only
  referent was a **closed** opportunity could never be deleted, and because
  `crm_contact.crm_account` is a master-detail with `deleteBehavior: 'cascade'`,
  that contact's **account** could not be deleted either. The only ways out were
  destroying sales history or asking an admin for a system write. The same shape
  blocked deleting anything a **converted lead** or an **accepted quote** pointed
  at.

  The yield is deliberately narrow. A write passes only when **every** one of its
  non-system changes is a declared reference field going from a value to `null` —
  the shape measured from the engine on 17.0.0-rc.6, which is
  `{ id, <link>: null, updated_at, updated_by }`. Anything else is still refused,
  verbatim as before:

  - a business field changed alongside the cleared link;
  - a link repointed to a different record;
  - an ordinary edit to a frozen record's business fields;
  - a `null` written over a field that is not a declared link.

  What changes for a reader of the data: a settled record can now lose a link
  without anyone having edited it, because the record it pointed at was deleted.
  That is the accepted cost of being able to carry out a "delete this person"
  request. The refusal messages for cleared links are gone — nothing produces
  them any more — while every other refusal these guards raise is unchanged.

  Refs #720, #693.

- f6e269f: Five simplified-Chinese help bubbles now use the words the locale pack's own
  labels use. A help string explains a label, so where the two disagreed the help
  followed the label.

  `src/translations/zh-CN.ts` was internally inconsistent in three places, and each
  one sent the reader looking for a word the product never puts on screen:

  | field                          | help said                    | pack's label says                               |
  | ------------------------------ | ---------------------------- | ----------------------------------------------- |
  | `crm_account.name_normalized`  | 线索**转换**的匹配键         | `convert_lead` 转化线索 / `is_converted` 已转化 |
  | `crm_lead.company_normalized`  | 线索**转换**的匹配键         | 同上                                            |
  | `crm_opportunity.win_reason`   | 将商机关闭为"**赢单**"时必填 | `stage.closed_won` 成交                         |
  | `crm_opportunity.loss_reason`  | 将商机关闭为"**丢单**"时必填 | `stage.closed_lost` 失败                        |
  | `crm_opportunity.crm_campaign` | 带来此商机的**市场活动**     | 营销活动 (on the same line)                     |

  The two reason fields are the sharpest case: the help quotes a stage **by name**,
  and neither quoted word is in the stage picklist. A rep reading "将商机关闭为
  赢单时必填" then opens the stage dropdown and finds 成交. The campaign one is the
  starkest: 「市场活动」 was a zero-label word — this help string was its only
  occurrence left anywhere in the repository once the documentation moved to
  「营销活动」.

  **Only the words used as references moved; the pack's own outcome vocabulary did
  not.** 赢单/丢单 are what this pack calls a win and a loss — `win_reason` 赢单原因,
  `loss_reason` 丢单原因, `loss_details` 赢/丢单详情, 赢单数, 丢单数, 赢单概率 — so
  those labels are untouched, exactly as the Chinese documentation kept them. What
  changed is only the word each help string quotes as a **stage value**, which is a
  different fact from what the field is called.

  The other three locales were checked field by field and were already consistent,
  so nothing outside zh-CN changed. `ja-JP` in particular already writes what this
  change makes zh-CN write — `win_reason` is labelled 受注理由 while its help quotes
  the stage as 「成立」, the exact `closed_won` option label. `en` and `es-ES` build
  the campaign help from the label's own head word (`Campaign` / `Marketing
campaign that generated this opportunity`), and their lead-conversion help shares
  a lexeme with the convert action (`conversion` / `Convert Lead`).

  Display text only: no field, option value, label, view or behaviour changed, and
  no documentation page rendered any of these five strings.

  Fixes #846.

- 5891dcf: Field help text now names what the user sees on screen, instead of stored values, internal field paths, and implementation notes.

  #679 completed all four locales, and completing them made a second problem legible: several help strings in the object definitions are developer shorthand, and translating them faithfully propagates the shorthand into four languages. Fixing the English is the only fix that reaches every locale.

  **Raw stored values in user-facing prose.** `crm_forecast.best_case_amount` read "in the best_case or commit forecast category" — those are the `value`s of `crm_opportunity.forecast_category`, whose labels are "Best Case" and "Commit". A user reading the help text cannot match `best_case` to anything on screen. The zh-CN and es-ES translators had already silently corrected this ("最佳情况"或"承诺", `Mejor caso o Compromiso`); English and Japanese still leaked it.

  **Implementation notes.** `attainment_pct` ended with "Negative quota guarded" — a remark about the `quota > 0 ?` ternary, meaningless to a rep and close to untranslatable. It is replaced with the behaviour that guard produces: "Reads 0% until a positive quota is set." Likewise `coverage_ratio` now states that it reads 0 once the quota is met, which is what the `(quota − closed) > 0 ?` branch does.

  **Internal field paths.** `crm_opportunity_line_item.list_price` read "Auto-populated from product.list_price". zh-CN and ja-JP had already corrected it to the display label; es-ES still shipped the literal `product.list_price`.

  **Widget descriptions instead of content descriptions.** `crm_lead.notes` read "Rich text notes with formatting" — that describes the editor, says the same thing twice, and tells the user nothing about what belongs in the field. All three translated locales had faithfully reproduced the redundancy.

  ## Labels that disagreed with their own metadata

  Three cases where the bundles and the object definitions had drifted apart, resolved in whichever direction is right rather than uniformly:

  - **`crm_contact.department.hr`** — object said `HR`, all four bundles said "Human Resources". Four independent translators reaching for the expanded form is the answer; the object definition is corrected.
  - **`crm_forecast.closed_amount`** — object says `Closed Won`, the `en` bundle had truncated it to "Closed". Here the object is right: in a forecast table sitting next to Pipeline, Best Case and Commit, a bare "Closed" is ambiguous against Closed Lost. The bundle is corrected, and the prose in `attainment_pct` / `coverage_ratio` / `expected_amount` now names it consistently.
  - The other three locales keep their own shorter forms (已成交金额 / クローズ / Cerrado) — each is internally consistent with its own prose, which is the bar that matters inside a bundle.

  `expected_amount` also said "what the owner reasonably expects to **ship**" — a supply-chain verb for a sales forecast; now "land".

  No behaviour changes: every edit is display text or help text. The four bundles stay at zero i18n warnings.

- acc37e6: The home page's AI card no longer names a retired assistant persona, and it now
  sends you to the entry point the product documentation describes.

  The right-hand card on the Sales Home page read:

  ```
  Today with Copilot
  Ask the Sales Copilot
  Open the floating Copilot (bottom-right) and ask "what should I focus on
  today?" — it sees your live pipeline, schema, and accounts.
  ```

  Two things were wrong with that, and both were visible to a user today — this is
  interface copy, not documentation. **The persona does not exist**: the app's own
  `sales_copilot` agent was retired long ago, and AI capability is implemented by
  agents on the platform side while HotCRM contributes domain skills, so a card
  inviting you to "ask the Sales Copilot" names an entity this app does not
  contain. **The entry point was wrong too**: the card described a floating widget
  in the bottom-right corner, while the assistant is the chat panel the platform
  opens from the right edge of every page — the wording the `AI Copilot` docs
  section already uses. Whichever of the two was accurate, users were being given
  two different places to look.

  The card now reads:

  ```
  Today with the AI Assistant
  Ask the AI Assistant
  Open the assistant panel from the right edge of the page and ask "what should I
  focus on today?" — it sees your live pipeline, schema, and accounts.
  ```

  What the card _does_ is unchanged — same card, same position on the page, same
  suggested question, same statement about what the assistant can see. Only the
  name and the directions changed.

  This was the last live persona mention outside the documentation. The prose
  sweep shipped separately and its guard is scoped to the documentation tree, so
  this string sat outside every check: `os validate` and `pnpm lint` walk metadata
  shape and treat a card's `title` and `description` as free text. A pin in
  `test/metadata-references.test.ts` now holds this card to the platform-assistant
  wording. Note that card-level copy has no locale keys — the translation contract
  carries page `label` / `description` / `title` / `subtitle` only — so this card
  renders the English string in every locale, exactly as it did before (#1004).

  Fixes #1002.

- 75cc335: Fix the three pieces of scaffolding a sales rep sees on the Sales Home landing
  page: a greeting with no name in it, and two bordered boxes with nothing inside.

  The page header read `Welcome back,` with the name missing. It was authored as
  `Welcome back, {current_user.first_name}`, which mixes three vocabularies that
  do not compose. `subtitle` is an `I18nLabel` — a display string or an inline
  locale map — with no token pass and no expression pass of its own; the braces
  that _do_ resolve in a page header address the bound record's fields, and a home
  page has no record; and `current_user.first_name` is a CEL path, which is
  written bare, never inside braces. A greeting that names the user is not
  expressible on a translatable label, so the header now reads "Welcome back" and
  the four locale bundles carry the translation.

  The left sidebar's `Recent Items` card and the right sidebar's `Today's
Schedule` card each declared a title and no body, so the renderer had nothing to
  draw and each rendered as a heading over blank space. `Today's Schedule` is now
  bound to `crm_event`'s saved `upcoming_events` view — planned events, soonest
  first, read off the view rather than retyped — and is named `Upcoming Events`,
  which is what the panel actually shows. `Recent Items` is removed: "recent"
  means per-user access history across objects, the platform publishes no source
  for it, and binding the card to one object's list view would have made its title
  lie.

  `test/metadata-references.test.ts` now applies the empty-container rule to every
  region on every page, not only to tab panels, so the next card authored without
  a body fails in CI instead of in a demo. Two known-empty containers elsewhere in
  the app are exempted by name, each pointing at its own issue, and the rule fails
  if an exemption's container is no longer empty — so a fixed defect cannot leave
  its exemption behind as cover for the next one.

  Part of #734: the four placeholder component types on these pages
  (`nav:menu`, `global:search`, `global:notifications`, `app:launcher`) are
  untouched. They are members of the spec's `PageComponentType` enum with
  deliberate no-props rows, so the app is spelling them correctly and a console
  that renders them as `Component Placeholder` is an upstream renderer gap — that
  half stays open.

- fb48ab5: Sales Home's three tabs now show the work they are named after, and the
  Activities documentation describes the task views the app actually ships.

  **Sales Home.** _My Leads_, _My Opportunities_ and _My Tasks_ each held a single
  `page:section` with no properties. That is a legal page schema — it validates,
  it builds, and it renders `<section></section>`: three tab names over three
  blank panels, measured in a browser, with no diagnostic anywhere because there
  is no broken reference to catch. The three tabs now embed the objects' own saved
  views (**My Leads**, **My Open Deals**, **My Open Tasks**), which render as
  sortable, filterable grids on the landing page; `{current_user_id}` resolves on
  this path, so "mine" means mine. Two tabs were renamed to match the view behind
  them — _My Opportunities_ became **My Open Deals** and _My Tasks_ became **My
  Open Tasks**, because both views exclude closed/completed records and the old
  names promised more than they showed.

  The tab configuration is **read off** `src/views/*.view.ts` rather than retyped,
  so there is still exactly one definition of what "my leads" means; a page
  component cannot name a saved view on 17.0.0-rc.2, and retyping the columns and
  filters would have created a second definition free to drift from the first.
  A new guard (`no page tab renders an empty container`) fails the build for any
  future tab that promises content and binds none.

  **Activities documentation** (English, zh-Hans, zh-Hant). The page advertised a
  _home page activity widget_ offering _Today's Tasks_ and _Overdue Tasks_ — no
  such widget exists, and those two names belong to list views whose shipped
  labels and behaviour are different again. Its "Standard list views" roster named
  six views, of which four do not exist and two were described by the wrong
  filter: _Today_ was documented as "due today" when **📅 My Priority Tasks**
  filters on priority and status and never looks at a date, and _Overdue_ was
  documented as "past due date, not completed" when **⏰ Open Tasks · Most Overdue
  First** is the whole open backlog ordered oldest-due-first, not a past-due
  filter. Meanwhile the five views that make tasks the richest object in the app —
  All Tasks, Task Board, Task Schedule, Execution Plan and Worklog Timeline — went
  unmentioned. All eight views are now documented tab by tab against
  `src/views/task.view.ts`, including where each one is reached from.

- 01f084d: Fix every hook-side derived write: opportunity/quote rollups, the campaign
  completion snapshot, account promotion, the contract `signed_date` stamp, the
  case service rollup and the task activity bubble now actually update their
  parent record.

  All nine of them called `ctx.api.object(x).update(id, doc)`, but the repository
  facade the runtime injects as `ctx.api` takes `update(document, options)` — the
  second positional argument is the OPTIONS bag. Every invocation therefore threw
  `update('crm_opportunity') does not recognise option 'amount'` and, because
  these hooks are all `onError: 'log'`, the only symptom was a parent record that
  silently never moved: 96 such throws on one boot of a freshly seeded install,
  one per line-item write. Editing a line item did not move the opportunity's
  amount or the quote's totals.

  The cause was a type that described an API that does not exist:
  `src/objects/_hook-api.ts` declared `update(id: string, doc)`, so the compiler
  blessed all nine call sites, and both hook stand-ins implemented the
  declaration rather than the engine, so the suite stayed green. `HookObjectApi`
  now describes the real surface — `update({ id, …fields }, { where: { id } })`,
  `delete({ where })`, and no `updateMany` (a method neither injected shape has)
  — which makes the old spelling a compile error rather than a runtime one. The
  hook harness rejects the broken shape instead of quietly honouring it, and the
  new `test/hook-write-shape.test.ts` asserts the argument list that reaches the
  engine for all nine writes, running each hook's shipped body through the real
  QuickJS sandbox. Refs #616.

- 718f226: Stop hook reads from silently querying the wrong record. Seventeen hook-side
  `ctx.api` calls — across eight `*.hook.ts` files and the shared
  `_line-item-price-fill.ts` — passed their predicate as `filter:`, a key the
  ObjectQL kernel does not accept on every read path, and drops without raising:

  - `find` normalizes `filter` → `where`, so those calls were correct by luck.
  - `findOne` spreads the query into the AST (`{ ...query, limit: 1 }`) and never
    aliases, so the predicate vanished and the call returned **the object's first
    row** — for any argument, including one matching nothing. It never returned
    `null` and never threw.
  - `count` reads `query.where` explicitly, so the predicate vanished and the call
    counted **the entire object**.

  Confirmed against a real ObjectQL 16.1.0 engine, not the test harness. The
  mis-reads were load-bearing: line-item pricing defaulted `list_price` /
  `unit_price` from the first product in the catalog rather than the chosen one;
  quote acceptance and won-opportunity / contract-activation account promotion
  evaluated their "already in the target state?" gate against an unrelated record
  while writing to the correct one; case escalation assigned the follow-up task to
  the first account's owner; the account and product delete guards counted every
  row in the object, so they blocked deletes that had no real references and
  reported an invented number; and campaign ROI snapshots recorded whole-table
  opportunity and lead counts as campaign attribution.

  `HookQuery` no longer declares `filter?`, so the compiler now rejects the
  spelling at authoring time instead of leaving it to be discovered in the data.

  The suite could not have caught this: `test/helpers/hook-harness.ts` resolved
  its predicate as `q.filter ?? q.where ?? {}`, making the stand-in more
  permissive than the kernel it stands in for, so every affected hook tested
  green. The harness now throws on `filter`, and `test/hook-query-predicate.test.ts`
  pins the contract against a real in-memory kernel — including the kernel's
  silent-drop behaviour, so the trap stays documented — plus a source scan over
  `src/objects/**.ts` that fails any file reintroducing the key.

  That scan deliberately covers the whole directory rather than the `*.hook.ts`
  glob: merging `main` brought in the extraction of the two price-fill hooks into
  `_line-item-price-fill.ts`, which carried the `filter:` along with it. A guard
  keyed to a filename convention would have missed the one instance most likely to
  survive a refactor.

- 7667c9b: 🔥 Hot Leads now holds the leads new-lead routing actually calls hot: the view's
  cut moves from `rating >= 4.5` to `rating >= 4`, matching the `lead_assignment`
  flow.

  The two disagreed about what "hot" means, and `rating` is a **whole-star** field
  — `lead.hook.ts` rounds the computed score to whole stars, `Field.rating(5)`
  renders as a star widget that offers nothing finer, and the single seeded `4.5`
  was deleted for that same reason in #591. So `>= 4.5` meant `== 5` on every row
  that can exist, while the routing flow's hot branch fires at `>= 4`. A 4-star
  lead was therefore stamped with the 1-day follow-up SLA, its owner was alerted
  "Hot lead — assign within 24h" … and the lead never appeared in the 🔥 Hot Leads
  queue that alert points at. Four stars is not rare: a business-domain email, a
  phone number, a senior title and a high-value industry reach it.

  There is now one definition of hot, produced in one place — the flow's
  `check_hot` decision — and the queue mirrors it. **What changes for users:**
  4-star New/Contacted leads appear in 🔥 Hot Leads from this release; the queue
  is wider than before and matches the alerts already being sent. Nothing about
  routing, SLAs or alerts changes.

  Hot Leads and **High Priority** now cover the same population, which is the
  deliberate cost of having a single definition rather than an oversight. They
  differ in purpose: Hot Leads is the work order (sorted by next follow-up, with
  phone, email and owner on the row), High Priority is the scan list (rating-tinted
  rows, lead source, no SLA column). A five-star-only queue, if it is ever a real
  need, belongs in its own view under its own name.

  Also removed: the view comment crediting an `auto_flag_hot_lead` workflow, which
  has never existed in this repo — it named a producer nobody could open. The
  comment now cites the real one.

  `test/hot-lead-threshold-parity.test.ts` keeps the two honest. Both thresholds
  are derived from the shipped metadata (the view's filter clause and the flow
  edge's CEL source), and a truth table asks the real automation engine and the
  real view filter, for every rating a lead can carry, whether "routed hot" and
  "in the queue" agree. It also fails on a whole-star field cut at a half star,
  and on any view comment naming an automation the stack does not register.

  The user documentation (`content/docs/sales/leads.mdx` and its zh-Hans /
  zh-Hant siblings) described Hot Leads as the five-star queue with four-star
  leads over on High Priority; those two rows now describe the shipped behaviour.

  Fixes #766.

- 12e15dd: Add a CI step that fails the build when `objectstack lint` reports any
  `i18n/missing-*` issue, closing a gate blind spot (#1018).

  `objectstack lint` only fails its own exit code on rule-level _errors_ —
  warnings and suggestions are printed but never gate. Most `i18n/missing-*`
  findings are warnings (only a default-locale gap is an error), so a
  translation-coverage regression could merge with a fully green `Quality
Checks` run. PR #1080 did exactly that: it merged 25 enumerated
  `i18n/missing-page` warnings through green CI, and #1084 zeroed that debt the
  same day — which is what makes today the right moment to gate it, since the
  baseline is zero.

  `scripts/check-lint-i18n-gate.mjs` runs the real `objectstack lint --json`
  pass, counts issues whose rule starts with `i18n/missing-`, and exits
  non-zero when that count is not zero. It is wired into `pnpm verify` (new
  `lint:i18n-gate` script, run right after `lint`) and into both CI workflows
  (`ci.yml`'s `Build and Test` job and `code-quality.yml`'s `Quality Checks`
  job) as a dedicated step, plus a real end-to-end run in
  `test/lint-i18n-gate.test.ts` so a regression is also caught by `pnpm test`.

  Deliberately scoped to only the `i18n/missing-*` rule family: the other ~153
  pre-existing lint warnings/suggestions in this repo are untouched and remain
  out of gate. Making the underlying lint rule itself error-severity would be a
  `packages/lint` (upstream) change and is out of this repo's reach.

- 131daf9: Docs: restate the Import & Export guide against what the app actually does, and
  make it agree with `importing-your-data.mdx` instead of contradicting it.

  The page routed almost every step through a `Setup → Data → …` menu path. The
  Setup app's groups are Overview, Apps, People & Organization, Access Control,
  Approvals, Configuration, Diagnostics, Integrations and Advanced — there is no
  **Data** group and no **Privacy** group, so `Setup → Data → Import Wizard`,
  `→ Migrate from Salesforce`, `→ Migrate from HubSpot`, `→ Scheduled Exports` and
  `Setup → Privacy → Data Subject Requests` all sent the reader looking for
  screens that do not exist.

  Measured, and restated:

  - **The import wizard is real — it just lives somewhere else.** It is on the
    object's own list view (**Import** in the toolbar): Upload → Mapping →
    Preview, with drag-and-drop CSV / Excel or paste, a generated column template,
    auto-matched columns with a confidence reading, write mode (_Always create
    new_ / _Update existing (skip if no match)_ / _Update if matched, else
    create_) plus **Match on**, a **Validate data** pass that writes nothing, a
    background job with progress for large files, and **History** with **Undo
    import**. It reads HotCRM's own saved mappings — the wizard lists the mappings
    whose `targetObject` is the object you are on, so `crm_account_import`,
    `crm_contact_import` and `crm_lead_import` are the same three the API path in
    the `guides/importing-your-data` page names. The two pages
    now describe one feature from two ends and link to each other.
  - **No completion email.** Progress is on screen and the run lands in History;
    the platform email service is outbound-only and delivers nothing until a
    deployment configures a transport.
  - **External IDs replaced by matching keys.** No HotCRM object carries an
    `external_id` field, and a named mapping is a strict projection that drops
    every column it does not declare, so the advice to add one was inert. The
    idempotency it promised is real and comes from each mapping's business key
    (Account Name, Email, Email). Also corrected: _Update only_ skips rather than
    fails, matching is on fields you choose rather than "Email / External ID",
    and the 50 MB upload cap does not exist (the real ceiling is 50,000 rows per
    job).
  - **Salesforce migration marked _(not shipped yet)_**, design intent and object
    map kept. There is no migration wizard, no connector, and no action that
    reads Salesforce — every mention of Salesforce in `src/` is a comment citing
    it as a design reference. There is no outbound OAuth either: Setup's **OAuth
    Applications** registers clients calling _into_ ObjectStack, the opposite
    direction. Noted honestly that Salesforce migration is not on the roadmap,
    while **HubSpot import is** a named roadmap item — the two are not in the
    same state.
  - **Export restated on measurement**: the account, contact, lead and opportunity
    list views declare `exportOptions: ['csv', 'xlsx']`, the export carries the
    view's filter / sort / columns, and the same route is callable directly.
    `allowExport` is the opt-in gate (unset denies; `viewAllRecords` /
    `modifyAllRecords` do not substitute), with the per-role grants tabulated.
    Cases hold an export grant with no list-view surface behind it, which is
    called out rather than papered over. Scheduled warehouse export marked
    _(not shipped yet)_.
  - **GDPR section marked _(not shipped yet)_** and replaced with what can be done
    today — delete the contact (attendee rows go, meetings stay), delete the
    account (contacts cascade), clear identifying fields by hand. No Privacy
    group, no data-subject-request object, no anonymise action, no audit
    certificate (the audit capability is not among the ones this app enables).

  zh-Hans and zh-Hant pages updated with the same content.

- 6b0b37b: Docs: tell the reader of `guides/importing-your-data` that the import wizard
  exists. The page loads your own accounts, contacts and leads — and its only
  instruction was to write curl, for an action that takes three clicks on a list
  view.

  The wizard is real and it is the other end of the very mechanism this page
  documents: it reads HotCRM's saved mappings by target object, so the three the
  page tabulates — `crm_account_import`, `crm_contact_import`, `crm_lead_import` —
  appear under **Saved mapping** on exactly the Accounts, Contacts and Leads list
  views, where the renames, value transforms and type coercion then run on the
  server and the column mapping goes read-only. That is also what the page's own
  opening promise — "no column-by-column mapping" — is describing, and it had
  only ever been said in an API context.

  Added, in all three locales:

  - **A fork at the top** — wizard for a one-off file you want to eyeball before
    it writes, API for a scripted or repeatable load with the strict dry-run
    report, the per-row error codes and the undo call. Steps 1–4 are now named as
    the API route.
  - **One short section on the in-app route** — the **Import** toolbar button, the
    three steps Upload / Mapping / Preview, the saved mappings turning up there,
    and the mapping from the wizard's buttons back to this page's steps:
    **Validate data** is Step 2's dry run, a large file is Step 3's background
    job, **History** → **Undo import** is Step 4 with the same undo window.

  The click-by-click steps stay in `guides/import-and-export` and are linked, not
  repeated — the two pages divide the work rather than each describing the wizard
  in its own words: `import-and-export` carries the in-app route and the export
  picture, `importing-your-data` carries the API detail and the known limits. The
  API content is untouched: `runAutomations: false`, the per-row error codes, the
  50,000-row job ceiling and the 5,000-row undo ceiling are all things the wizard
  never shows, so none of it is duplicated either. Refs #799.

- 0683288: Docs: restate the Integrations guide against what the app actually exposes.

  The page listed ten connector families as **Built-in** — Slack, Teams, DocuSign,
  Stripe, Twilio, Aircall / RingCentral / Five9, Intercom / Zendesk Chat, Gmail /
  Outlook, Snowflake / BigQuery / Redshift, Zapier / Make / n8n — each with a
  `Setup → Integrations → X` path to configure it at. Measured against the source:
  `src/` carries no connector metadata of any kind, no platform package ships a
  connector for any of those vendors, and there is no `Setup → Integrations` menu,
  so every one of those paths sent the reader looking for a screen that does not
  exist. The table is kept as design intent, marked _(not shipped yet)_, pointed at
  the roadmap (whose own line already reads "More connectors"), and given a third
  column naming the closest thing that does ship for each row.

  The rest of the page was measured the same way:

  - **Webhooks** are the one real capability here, and the page was wrong in the
    other direction: `@objectstack/plugin-webhooks` genuinely ships an outbound
    webhook service, but HotCRM never enables it — `webhooks` is absent from
    `requires` in `objectstack.config.ts` and is not one of the always-loaded
    capabilities, and the app declares no webhook. Now stated as a deployment
    decision rather than a menu path, with the retry / payload / delivery-log
    specifics handed back to the platform's own docs.
  - **GraphQL** is removed: it is not in the product plan and the platform dropped
    the `/graphql` route from its service table. The invented `POST /api/v1/leads`
    example is gone too — objects are `crm_lead` and the route shape follows the
    runtime version.
  - **Event bus** (Kafka / EventBridge / Pub-Sub), the **secrets store**
    (Vault / AWS Secrets Manager / GCP Secret Manager, 90-day OAuth rotation) and
    the native **`*.connector.ts` plugin** shape have no counterpart in the
    platform's capability list; each is marked _(not shipped yet)_ with the real
    adjacent mechanism named (record-change flows, `secret` fields encrypted into
    `sys_secret` fail-closed, hooks / flows / action bodies).
  - A **What ships today** section was added: the HTTP data API, CSV / XLSX export
    from the account / contact / lead / opportunity list views, spreadsheet import,
    outbound Send Email, and the `notify` node's in-app notification.

  The Guides index rows for **Email & calendar** and **Integrations** were restated
  to match their corrected pages — the email row still advertised "Connect Gmail /
  Outlook, two-way sync, email tracking", which the page itself now marks as not
  shipped.

  zh-Hans and zh-Hant pages updated with the same content.

- 983019d: Docs: narrow two absolute claims on the Integrations guide from "this menu does
  not exist" to "nothing this app enables mounts anything under it".

  `content/docs/guides/integrations.mdx` (all three locales) stated that there is
  **no `Setup → Integrations` menu**. Measured against the platform packages, the
  group is real: `SETUP_APP` in `@objectstack/platform-objects` declares nine
  navigation groups — _Overview_, _Apps_, _People & Organization_, _Access
  Control_, _Approvals_, _Configuration_, _Diagnostics_, **Integrations** and
  _Advanced_ — and three packages contribute entries into `group_integrations`
  (`@objectstack/plugin-webhooks` → _Webhooks_ + _HTTP Deliveries_,
  `@objectstack/service-datasource` → _Datasources_, `@objectstack/mcp` →
  _Connect an Agent_). What is true is the narrower statement the page was
  reaching for: none of the ten vendor connectors it tables mounts anything
  under that group.

  The webhooks section made the same claim one level down — "no
  `Setup → Integrations → Webhooks` screen to find one under" — while the note
  directly beneath it tells the reader to add `webhooks` to `requires`. A reader
  who follows that advice gets exactly the screen the page said did not exist.
  It now reads as a not-enabled-here state: with `@objectstack/plugin-webhooks`
  unloaded its two Setup entries do not appear, and enabling the capability makes
  the plugin mount them itself.

  Nothing about the connector line-up changes: `src/` still carries no connector
  metadata, no platform package ships a connector for any of those ten vendors,
  and every `Setup → Integrations → X` path they used to print still points at a
  screen that does not exist. Only the menu-existence clause moved — _not shipped_
  (the connectors), _not enabled here_ (webhooks) and _exists but empty of
  connectors_ (the group) are now three distinct statements instead of one blanket
  "does not exist". See `/docs/guides/integrations`.

- 83a8dbd: Unify the `ja-JP` lead-conversion vocabulary onto 変換 (the 14:4 majority),
  fixing a self-inconsistency where the same conversion had two success
  messages in different words. Aligned 4 occurrences that used 取引開始:
  `crm_lead.status.options.converted`, `crm_lead.is_converted.label`,
  `messages['success.converted']`, and the executive dashboard's
  `open_leads` description. The action label (`リード変換`), the field it
  sets (`is_converted`), and both success messages now share the same verb
  root. Refs #858.
- 9b6b196: Filled the last 25 missing `ja-JP` page-component translation keys, closing out the i18n coverage gate that #1060 opened.

  `objectstack lint` (run without `--skip-i18n` since #1080) reported 25
  `i18n/missing-page` warnings, all `ja-JP`: page-component `label`/`title`/
  `description` strings on `app_launcher_page`, `case_detail_page`,
  `lead_detail_page`, `opportunity_detail_page`, `sales_home_page` and
  `utility_bar_page` that were defined in `src/pages/*.page.ts` and never
  mirrored into `src/translations/ja-JP.ts`. #1080 filled the same 25 keys for
  `es-ES`/`zh-CN` but deliberately left `ja-JP.ts` untouched — it was claimed by
  #858 (a verb-terminology pass) in the same batch. That claim is now merged, so
  this PR fills the remaining third.

  Translated each string against its English source in `src/pages/*.page.ts`,
  matching the nesting shape and register #1080 already established for
  `es-ES`/`zh-CN` (`pages.<page>.components.<component>.<label|title|description>`).
  Only additions — no existing `ja-JP.ts` lines were reordered or reformatted, to
  avoid manufacturing a conflict for #1061, which is queued behind this file for
  the `crm_opportunity` competitors options.

  Result: `objectstack lint` now reports **zero** `i18n/missing-page` warnings
  (down from 25; total warning count 178 → 153), across all three locales this
  card and #1080 together completed. `es-ES` and `zh-CN` were already clean and
  are untouched by this PR.

- c94a35c: 按元数据写实「HotCRM 内置四个 AI 知识库」这一整套说法（#808）：文档在 12 个页面（三语共 36 个文件）宣称本应用附带 **Sales Knowledge / Product Information / Support Knowledge / Competitive Intelligence** 四个知识库，而 `src/` 里这四个名字一个都不存在——没有任何元数据声明过知识库，没有任何技能绑定到其中之一，Setup 里也没有可供填充种子内容的地方。照着旧版 Day 5 清单操作的管理员，找不到任何一个可以 seed 的东西。

  四个名字**不静默删除**，改为写明「本应用不 ship 这样的独立知识库」并指向真实结构：唯一的知识面是 `crm_knowledge_article` 对象及其 7 个分类（入门指南 / 操作指南 / 故障排查 / 账务与价格 / API 与集成 / 版本说明 / 政策制度）。

  - `content/docs/ai-copilot/knowledge-bases.mdx`——整页按真实结构重写：四个旧名字逐一给出实际落点，文章对象的字段与检索面，唯一会读文章的技能是 `customer_360`（按已读工单的分类/标签查询已发布文章），以及**不存在**的那些东西（文档摄取、`/knowledge/support/` 目录、嵌入与分块、夜间重新索引、Confluence/Notion 连接器、按技能绑定知识库）。
  - `content/docs/service/knowledge-base.mdx`——「支持知识索引涵盖四种内容类型」与四库表改为真实的 7 个分类、4 个列表页签与发布/复核时间戳行为。
  - `content/docs/administration/setup.mdx`——Day 5 的三条 seed 步骤改写为真实可执行动作（按分类写文章、设置受众、发布）；产品目录一条不再说数据表「馈送产品信息知识库」。
  - `content/docs/ai-copilot/sales-copilot.mdx`——邮件撰写的输入列去掉两个知识库，并写明第二个独立事实：`email_drafting` 的 instructions 从不取任何知识来源（与 #860 / PR #865 在 service 页的口径一致）。
  - 另有 `content/docs/ai-copilot/skills.mdx`（每个技能的「知识库」行）、`content/docs/ai-copilot/index.mdx`、`content/docs/ai-copilot/service-copilot.mdx`、`content/docs/getting-started/introduction.mdx`、`content/docs/whats-new.mdx`、`content/docs/revenue/products.mdx` 六页的同源说法一并写实。

  「元数据跟文档」（真的把这四个知识库建成元数据）是产品扩展方向，本次不预判。三语同步；纯文档改动，未触碰 `src/**`。

- 434dd9f: Fix the PR Labeler workflow failing on every pull request opened from a fork.

  `labeler.yml` triggered on `pull_request`, which hands a **read-only**
  `GITHUB_TOKEN` to runs originating from a forked repository — the job-level
  `permissions: pull-requests: write` is silently downgraded, it is not an error
  GitHub reports up front. `actions/labeler` therefore got a 403 on
  `set-labels-for-an-issue` and the check went red on every contributor PR, while
  same-repo Dependabot PRs labelled fine and masked the problem.

  The trigger is now `pull_request_target`, which runs in the base repo's context
  where the requested write scope is actually granted. The `actions/checkout` step
  is gone with it: checking out under `pull_request_target` is the well-known
  privileged-code-execution footgun, and it was never needed — `actions/labeler`
  resolves `.github/labeler.yml` over the API at the base commit, so the label
  rules always come from the base branch and a fork cannot substitute its own.

- 14c94bf: Docs: every large-deal page now states the inclusive operator the gate actually uses

  #1128 converged every large-deal site on `>=`, so a deal at exactly $100,000
  requires manager approval and fires the won-deal alert. The value did not
  change; the operator did. 21 product pages (7 pages x 3 locales), the internal
  feature inventory and the `demo:staff` hint still described the old exclusive
  operator. This is that wording sweep — no number and no behaviour changes.

  The sentence that made it urgent, on **Revenue › Approvals**: _"Below $100K, no
  approval is needed."_ A rep quoting a hundred K flat was told to expect no
  approval and now gets a locked record. It now reads _"Under $100K, no approval
  is needed"_ followed by an explicit statement that the manager line is
  inclusive and a deal at exactly $100,000 **does** route for approval.

  Also corrected:

  - **Sales › Opportunities** and **Sales › Pipeline Management** quote the CEL
    start condition verbatim as the authoritative "where is this threshold
    configured?" answer. Both now read `record.amount >= 100000`, matching
    `src/flows/opportunity-won-alert.flow.ts` exactly — those two lines are a
    copy-paste surface for the next author, not only a user-facing claim.
  - **Administration › Automation** — the flow table's manager cell reads
    `≥ $100K` while the director cell stays `> $500K`, because those two
    operators genuinely differ; the won-alert row reads "$100K or more".
  - **Administration › State Machines**, **Sales › Index**, **Sales › Quotes** —
    the same operator, reworded in place.
  - The zh-Hans and zh-Hant editions of all seven pages. Chinese carries no
    word-for-word "or more": `超过` / `超過` is strictly exclusive, so the
    inclusive reading is carried by `$100K 及以上` and `达到` / `達到` rather
    than by swapping an operator character.

  `$500,000` is deliberately untouched everywhere. `HIGH_VALUE_DEAL_AMOUNT` is a
  matched `>` / `<=` pair whose two halves must partition — a different property,
  explicitly excluded from #1087's convergence.

- f68fa3a: Sales docs: rewrite the lead / contact "what a record stores" tables against the
  objects' field groups, and describe the new-contact prompt as the owner
  notification it is.

  The block tables at the top of the Leads and Contacts pages (and their zh-Hans /
  zh-Hant siblings) claimed a field layout the objects never declared, so a reader
  went hunting in the wrong section — or for a field that does not exist:

  - **Leads** listed a _tags_ field. `crm_lead` has no such field; it is removed,
    the same ghost-field class fixed in the previous pass. Annual revenue, number
    of employees and website were listed under **Company Information**; the first
    two are declared in `additional` and the third in `contact_info`, so all three
    rows move. `crm_lead` declares **10** field groups, not the 9 the page
    counted: the whole **Duplicate Management** group was missing from the table
    even though the same page teaches you how to work duplicates further down, and
    it is now a row of its own.
  - The lead intro no longer says the _detail screen_ has these collapsible
    sections. `crm_lead` is the one object with an authored record page, and its
    Details tab curates five sections of its own — so the table is now stated for
    what it is, the record's declared field groups, rather than as a map of a
    screen that groups them differently.
  - **Contacts** put the primary-contact flag under **Account & Role** and
    reports-to under **Additional Info**; `is_primary` is declared in
    `preferences` and `reports_to` in `account_info`. The contact owner, the
    profile picture and the last-contacted date were absent from the table
    entirely, and the mailing address row now names the five fields it holds.
  - The **Built-in rules** section promised a _contact_welcome_ email template
    sent to the new contact. Nothing of the sort ships: `contact_welcome` is the
    name of a record-change flow and of its notification topic, the notification
    goes to the contact's **owner** on the inbox and by email ("Reach out to
    welcome them"), and it is skipped entirely for a contact with no owner — the
    seeded and integration-written records — or with _Email Opt Out_ ticked. The
    admin tip pointing at "email-template settings" for the same non-existent
    template is corrected with it and now names `src/flows/contact-welcome.flow.ts`.

  Documentation only; no metadata, behaviour or field changes.

- 37cc8f8: Lead Conversion now declares its "Create Opportunity?" default once, instead of
  twice.

  The conversion flow used to seed that checkbox with a hidden **Default
  Conversion Options** step that ran before the conversion screen and assigned
  `createOpportunity = false`. It was there because the platform could not express
  "this flow variable starts as `false`" — a flow variable declaration had no
  `defaultValue`, so declaring a variable bound nothing at runtime, and an
  unanswered checkbox aborted the run outright (the lead was never marked
  converted). ObjectStack 17.0.0 supports declared defaults, so the step is gone
  and the default lives on the variable itself.

  Three things improve for anyone editing this flow:

  - **The default has one authority.** It used to be written twice — on the screen
    field and on the hidden step — with nothing keeping them in step, so editing
    one silently disagreed with the other. The screen field now derives its
    prefill from the variable, so there is a single place to change it.
  - **A caller-supplied value is respected.** The hidden step was unconditional and
    overwrote any `createOpportunity` passed in when the flow was invoked. A
    declared default defers to a supplied value and only fills in the blank.
  - **One less step in the diagram.** The flow shows the conversion screen first,
    which is what actually happens.

  No behaviour change for the ordinary path: a user who leaves the box alone still
  converts the lead without an opportunity, and a user who ticks it still gets one.
  Refs #1155, #651, #643.

- 8bef4e3: Guard the lead→account/opportunity picklist parity that lead conversion depends on (#531).

  The `lead_conversion` flow transplants `{leadRecord.industry}` and
  `{leadRecord.lead_source}` verbatim onto the Account/Opportunity it creates.
  When Lead and Account each declared their own `industry` picklist, half the
  Lead industries (`media`, `logistics`, `energy`, `hospitality`, `real_estate`,
  `other`, …) were illegal enum values on `crm_account`, so conversion of those
  leads always died in the create-account step with a server-side
  ValidationError (#531). The vocabularies were unified into canonical supersets
  in `src/objects/_picklists.ts` (#490), but nothing pinned the superset
  relation itself — editing either object's options directly would silently
  reintroduce the failure.

  A new metadata-contract test now walks every `create_record` node of the
  conversion flow, and for each field copied verbatim from the lead asserts that
  every source select value is a legal option on the target object's field. Any
  future drift between the two vocabularies fails CI with the exact offending
  values.

- c339c8d: Lead conversion now reuses an existing account when the company name differs only in capitalisation or spacing — converting a lead for `ACME  Corp` attaches it to your `Acme Corp` account instead of creating a second one.

  The flow used to dedupe on the raw `crm_account.name`, so every case or spacing
  variant produced its own account and the account list slowly filled with
  near-duplicates of the same company. Matching is now **normalize-then-exact**:
  both sides are lower-cased, trimmed and have runs of internal whitespace
  collapsed before comparison. It is deliberately not fuzzy — `Acme Corp` and
  `Acme Corporation` remain two different companies — because ranking candidate
  matches needs a human review step this app does not have.

  The comparison happens on two new derived columns, `crm_account.name_normalized`
  and `crm_lead.company_normalized`, maintained by the `account_protection` and
  `lead_duplicate_check` hooks. Both are read-only and hidden: nobody authors
  them, and the display values (`name`, `company`) are untouched, so the account
  created from a lead still carries the company name exactly as it was typed.

  Storing the keys is forced rather than preferred, and each alternative was
  measured against 17.0.0-rc.1 (the measurements are pinned in
  `test/account-name-normalized-match.test.ts`, so a platform upgrade that changes
  any of them fails loudly instead of leaving stale reasoning in a comment):

  - a flow template cannot fold a string — the automation engine's token resolver
    understands only `NOW()` / `TODAY()`, so `{LOWER(x)}`, `{TRIM(x)}` and
    `{x.toLowerCase()}` all resolve to nothing;
  - a formula field has no physical column, so nothing can filter on it;
  - `$regex` is not a case-insensitive equality on SQL at all — it compiles to a
    substring `LIKE`, which also matches `Not Acme Corp Ltd`, cannot collapse
    whitespace, and cannot use an index.

  `name_normalized` carries a plain index, **not** a unique one. Account-name
  uniqueness already lives, per organization, on `name` (#625); a unique
  normalized column would subsume that constraint and re-open a decision made one
  release earlier, for a guarantee this change does not need. It would also be
  impossible to add to any deployment that already holds both spellings, since
  creating a unique index fails on existing duplicates.

  **Upgrading an existing deployment.** Both columns start empty on rows written
  before this version. An account with no key is invisible to the lookup, so
  conversion would create _more_ duplicates than before, not fewer; a lead with no
  key stops its conversion outright, because the automation engine refuses to run
  a query whose filter resolved to nothing rather than widening it. A one-time
  backfill (re-save each account and open lead; the hooks derive the keys) is
  documented in `docs/MAINTENANCE.md` §3.3. Fresh installs need nothing: seed
  writes run lifecycle hooks, so every row is stamped as it is created.

  Fixes #626.

- 387d375: Make the lead-conversion screen completable.

  Pressing **Submit** on the `lead_conversion` screen did nothing — zero network
  requests, run paused forever (objectstack#3528). Two of that issue's three causes
  were in this repo's own metadata:

  - **`visibleWhen` was written in the wrong dialect.** On a screen field it is
    bare CEL over the screen's own field names, not the `{var}` template dialect
    this flow uses correctly everywhere else (filters, `update_record` fields,
    decision conditions). `'{createOpportunity} == true'` never resolved, so
    `opportunityName` — a field the author had made conditional — rendered
    unconditionally _and_ was enforced as `required`. Submit blocked on an input
    the user was never meant to see.
  - **`createOpportunity` was required with no default.** An untouched checkbox
    holds `undefined`, which the runner counts as unanswered. So "convert this lead
    _without_ an opportunity", the commonest path, blocked on a box the user had
    deliberately left clear. `defaultValue: false` makes "no" a real answer.

  Also: `.gitignore` now ignores `node_modules` without a trailing slash. The
  slashed form matches directories only, so a _symlink_ named `node_modules` is a
  plain blob to git and slips past the ignore entirely — one got committed that
  way, and CI failed with `ERR_PNPM_ENOENT … mkdir node_modules/@objectstack`
  because checkout restores a dangling symlink that pnpm cannot mkdir through.

  The third cause in objectstack#3528 — `crm_account.industry` holding fewer values
  than `crm_lead.industry`, aborting conversion mid-flow — was fixed separately by
  the shared `INDUSTRY_OPTIONS` picklist (#490).

- fa43181: Enforce `crm_lead.disqualification_reason`, group the campaign and task fields,
  and unify the `priority_rank` sentinel (#575 A2/A3/A4).

  **`disqualification_reason` promised required and enforced nothing.** The field
  description has read "Required when status is Unqualified" since it was added,
  with no validation, no hook, and no form that rendered the field at all — a
  lead could sit in `unqualified` with no recorded reason, and the seeded demo
  leads did. A `disqualification_reason_required` script validation now enforces
  it, modelled on `crm_case.escalation_reason_required`. Because a rule with no
  writer is worse than no rule — the save fails with an error the form gives the
  user no way to clear — the field is now on every `crm_lead` form that exposes an
  editable `status`, shown only when the status is `unqualified`, and on the lead
  detail page beside the status. The four generated `unqualified` seed leads
  carry a reason (rotated across four values, each with a matching note) instead
  of a budget-flavoured note and nothing else.

  **`crm_campaign` and `crm_task` had no `fieldGroups`.** They were the last two
  business objects with a full detail page and zero groups, so both rendered as
  one flat grid — the campaign's ROI formulas inline with its name, the task's
  five polymorphic `related_to_*` lookups and recurrence machinery inline with its
  subject. Both now declare groups mirroring the sections their forms already use,
  and every field is assigned to one. The two line-item objects stay ungrouped:
  they are edited inline in the parent's grid and have no detail page to section.

  **`priority_rank` diverged between the two objects that use it.** The ordinal
  exists because sorting on the `priority` select compares raw strings and inverts
  urgency. Its unknown-priority fallback was `1` on `crm_case` and `2` on
  `crm_task`, with field defaults to match, so the same unrecognised priority
  sorted differently on the two objects — and on each it was indistinguishable
  from a genuine priority (`low` / `normal` respectively). Both now use `0`, an
  unranked sentinel that sorts below every real rank on the `priority_rank desc`
  queues. The known ranks (1–4) are unchanged, so no seeded or stored row moves.

  The two rank maps stay hand-copied on purpose: L2 hook bodies run body-only in
  the QuickJS sandbox, so a shared module constant resolves at authoring time and
  arrives as `undefined` (see `_line-item-price-fill.ts`). Since the duplication
  is forced, `test/priority-rank-parity.test.ts` is what keeps the copies in
  agreement — it drives both hooks and asserts they rank an unknown priority
  identically and consistently with each object's field default.

  New guards live in three new test files rather than being appended to
  `test/metadata-references.test.ts`. Beyond the parity check above,
  `test/field-groups-coverage.test.ts` requires every detail-page object to
  declare groups and additionally catches the silent failures around them — a
  field pointing at an undeclared group key vanishes from the layout, and a
  declared group with no fields renders an empty section header.

- c9d5009: Translate `crm_lead.disqualification_reason` in all four locales, and guard the
  class with a test. The field had no entry in any bundle, so a `required` field
  sitting on eight lead forms rendered its seven raw stored values — `not_a_fit`,
  `no_budget`, `wrong_persona`, `unreachable`, `duplicate`, `competitor`, `other` —
  inside an otherwise fully translated form. `en` looked correct only by accident:
  a missing entry falls back to the English `label` in code, which is why the one
  locale a reviewer is most likely to open is the one where the bug cannot be seen.

  Adds a `select fields are translated in every locale` block to
  `test/metadata-references.test.ts`, extending the action-label coverage guard
  (#494) to select fields: every select field needs a label and a label for every
  option value, in every locale pack. The 34 select fields that were already
  incomplete when this landed are listed in a shrink-only `PENDING_SELECT_LABELS`
  ledger — a field added or extended from here on has nothing to hide behind, and
  the ledger cannot rot, because an entry that has since been translated fails as
  stale and an entry naming a field or locale that does not exist fails as a ghost.
  Fixes #631.

- 6bf8504: A lead flagged as a duplicate no longer makes the contact (or lead) it
  duplicates undeletable.

  `lead_duplicate_check` flags a new lead automatically whenever its email matches
  an existing contact, writing `duplicate_of_type` alongside the lookup that names
  the survivor. That pair is enforced by `requiredWhen` on `crm_lead`, and both
  lookups take the platform default `deleteBehavior: 'set_null'` — which the
  engine performs by updating the lead. So deleting the survivor cleared one half
  of the pair, left the discriminator behind, and the lead broke its own rule on
  the write the engine had just made:

  ```
  DELETE contact with an open duplicate lead → Duplicate Of Contact is required
  DELETE the account above that contact      → Duplicate Of Contact is required
  DELETE the survivor in a lead↔lead pair    → Duplicate Of Lead is required
  ```

  No conversion, no freeze and no user action were needed to reach it: a lead that
  merely re-used a contact's email was enough, which is exactly the case the
  dedupe exists to catch. Because contacts hang off accounts as master-detail, the
  account above the contact could not be deleted either — a "delete this person"
  erasure request with no way to carry it out, and an error naming a field on an
  object the caller never addressed.

  The lead now retires the claim whole: when a write leaves the named lookup
  blank, `duplicate_of_type` and `duplicate_status` go with it, so a lead that no
  longer duplicates anything stops saying it does. The pairing rule itself is
  unchanged and still refuses any record that names a type without naming a
  record, on create and on edit alike; the prior duplicate verdict remains
  readable in the field history of Duplicate Status.

  One case is deliberately unchanged: a lead already **disqualified** as a
  duplicate still blocks the delete, now via the separate rule that requires a
  disqualified duplicate to name its survivor. That needs its own decision and is
  tracked separately.

- 2342811: Let an erasure complete against a lead a reviewer already closed as a confirmed
  duplicate, without deleting the verdict they recorded.

  Deleting a Contact — or the Account above it, which cascades — was refused
  whenever any lead had been disqualified as a duplicate of that record:

  ```
  DELETE /api/v1/data/crm_contact/<id>
  → 400 "Disqualifying a lead as Duplicate requires naming the surviving record
          and setting Duplicate Status to Confirmed"
  ```

  This is the drain path of the Suspected Duplicates review queue, so every lead a
  reviewer ever closed as a confirmed duplicate held its survivor hostage, and a
  GDPR "delete this person" request against that contact could not be carried out.
  #1072 had cleared the same wall for leads still carrying the machine's
  `suspected` guess; the reviewer-closed case is the second, independent rule
  sitting on the same path.

  `crm_lead.duplicate_of_type` gains a third value, `erased` ("Erased Record"),
  labelled in all four locale packs. When the engine's reference cleanup nulls the
  pointer, `lead_duplicate_check` now splits on what the record already says:

  - `duplicate_status: 'suspected'` (or no opinion) — the claim is retired whole,
    exactly as before. A machine's guess about a deleted record is worth nothing.
  - `duplicate_status: 'confirmed'` — a person compared the two records and
    agreed, so the claim is **tombstoned** instead: the type becomes `erased` and
    the status stands. The lead goes on saying "confirmed duplicate of a record
    that has since been erased", which is a fact it could not state before.

  The disqualification, its reason and the status all survive the delete, and both
  delete paths — the contact directly, and the account cascading through it — now
  complete.

  No rule was relaxed to get there, which is the point rather than a detail. A
  validation is evaluated against `{...previous, ...data}` and cannot see a
  transition, so on the record "the pointer was erased" and "this claim never
  named anyone" were the same state — every predicate taught to tolerate the first
  also admitted the second, and `duplicate_disqualification_requires_survivor`
  (#598) would have died with it. A distinct value makes the two states different
  facts instead: the lookups' `requiredWhen` pairs only on `crm_lead` /
  `crm_contact` so it never fires on a tombstone, and #598's rule asks for a
  non-blank type plus `confirmed`, both of which a tombstoned lead still has. Both
  predicates, the form's `visibleOn` and the hook-free rig that proves the rule is
  declarative are all unchanged.

  `erased` is written, never authored: the lead forms offer only the two object
  types, so it cannot be picked, and it is stamped from exactly one line of
  `src/objects/lead.hook.ts`. Both properties are pinned, the second by a source
  scan that fails on a writer nobody thought to test. It is still labelled
  everywhere the record is read, so a tombstoned lead shows "Erased Record" rather
  than a raw enum value. Refs #1164, #1072, #1166, #598.

- f01027a: Retire two rules that could never fire, give `crm_case.first_response_date` its
  missing writer, and constrain the quote and contract lifecycles (#575 group B).

  `crm_lead`'s `cannot_edit_converted` validation is deleted. The code described
  it as the friendly, recoverable half of a two-layer converted-lead lock, but the
  `beforeUpdate` throw in `lead.hook.ts` aborts the write first, so the validation
  never produced that error on any field — the same dead-configuration shape as
  the `revenue_positive` rule removed in #571. The hook is now the single guard,
  and its message (which names the offending fields) is the one users see.

  `crm_opportunity.created_date` is deleted. It duplicated the platform's own
  `created_at` and had no writer at all, so it was null on every row while
  `deal_timeline` used it as `startDateField` — the timeline had no start dates.
  The view now reads `created_at` (the spelling the lead activity calendar already
  used) and the four locale packs no longer label a field that does not exist.
  `crm_case.created_date` is a different field with a real writer and is untouched.

  `crm_case.first_response_date` was the only member of the case SLA family with
  no writer — `sla_due_date` and `resolution_time_hours` come from `case.hook`,
  `is_sla_violated` from the `case_sla_monitor` flow — so the most standard
  service-desk metric was permanently null. It is now stamped by the shared
  `logActivityAction` body, on the first `sys_activity` a case receives: the
  industry definition (Salesforce `FirstResponseDateTime`, Zendesk first reply
  time) is when the customer first heard back, so a logged call or meeting is the
  event, deliberately NOT a status change — an agent can move a case to "in
  progress" and investigate for an hour while the customer hears nothing. The
  field drops `readonly`, which would otherwise silently discard the write
  (#2948), and the body reads the stored value rather than the dispatched record
  so a projected record cannot turn "first response" into "last response".

  `crm_quote` and `crm_contract` gain `state_machine` validations. Neither had a
  transition table OR a status guard in its hook, so `draft → accepted` on a quote
  (binding numbers nobody reviewed or sent) and `draft → activated` on a contract
  (which stamps `signed_date`, promotes the account to `customer` and starts the
  renewal clock) were both legal. Warning severity, matching the lead / opportunity
  / case machines. `crm_campaign` and `crm_task` deliberately get nothing — their
  status is descriptive, not a controlled lifecycle — and a new test pins that
  absence so it stays a decision rather than a gap.

  New guards live in `test/converted-lead-guard.test.ts`,
  `test/case-first-response.test.ts`, `test/opportunity-creation-date.test.ts` and
  `test/status-state-machines.test.ts`. The first-response tests run the shipped
  action body through the real QuickJS sandbox added in #575 A1, because the two
  things that can break the stamp — the `api.read` capability and the engine
  facade's `update(data, options)` signature — only exist there.

- 96f99fb: Let an opportunity or a quote that carries product lines be deleted again. Once a
  rep itemised a deal — which is the ordinary state of any deal priced from the
  product catalog — the parent record refused to delete, and the refusal handed the
  API caller an internal authoring instruction:

  ```
  DELETE /api/v1/data/crm_opportunity/<id>
  → 409 {"error":"Cannot delete crm_opportunity (<id>): 1 dependent
         crm_opportunity_line_item record(s) reference it via crm_opportunity
         (crm_opportunity is required, so it cannot be cleared). Delete or reassign
         them first, or set deleteBehavior:'cascade' on
         crm_opportunity_line_item.crm_opportunity.","code":"DELETE_RESTRICTED"}
  ```

  `crm_quote` produced the same sentence with the nouns swapped. The only way
  through was to delete every line by hand first.

  The cause was a default nobody wrote down. `crm_opportunity_line_item
.crm_opportunity` and `crm_quote_line_item.crm_quote` declared no
  `deleteBehavior`, so both took `Field.lookup`'s spec default of `set_null` — and
  the engine's referential pass escalates a `set_null` default on a **required**
  lookup to `restrict`, because a NOT NULL column cannot be cleared. Nothing in
  either object's source said "refuse to delete the parent"; the behaviour came
  entirely from the unwritten default.

  Both parent lookups now declare `deleteBehavior: 'cascade'`. A line item is
  subordinate by construction, and both objects already said so: their headers
  state that a line has no meaning apart from its deal, and the rollup hooks derive
  `crm_opportunity.amount` and the quote's subtotal/total **from** the line set. A
  line whose parent is gone denotes nothing and would keep a deleted deal's revenue
  alive in every line-level report.

  **What changes for you:** deleting an opportunity or a quote now also removes its
  product lines, so line-level revenue reporting drops accordingly — deliberately,
  since the deal is gone. Nothing else on these objects changed: the `crm_product`
  lookup stays on the restricting default, so retiring a catalog product that
  priced any line is still refused ("Set is_active=false to retire instead"), and
  lines belonging to other deals are never touched. This is deliberately _not_ the
  answer taken for campaign members and meeting attendees, whose parent lookups
  keep restricting — a campaign's member list and a meeting's attendee list are
  those records' historical evidence, while a price line is not. Refs #727.

- 0814d61: Fix the line-item expression authoring and de-duplicate the price-fill hook
  (#514 items 8, 3 and 15 — the two `*_line_item` objects only).

  `crm_quote_line_item.total_price` was `record.subtotal * (1 + tax_rate/100)`,
  and `subtotal` is itself a FORMULA — so the total depended on the platform
  hydrating another computed field first, the hazard written up at
  `lead.object.ts:61-64`. It is now composed from the same stored fields
  `subtotal` reads, with the tax multiplier applied on top. The arithmetic is
  unchanged (4 × 100 at 10% line discount and 8% tax is still 388.80); what
  changes is that it no longer depends on evaluation order.

  `crm_opportunity_line_item`'s `unit_price_positive` compared `record.unit_price
< 0` with no null guard. Strict CEL ABORTS on `null < 0` instead of evaluating
  it false, so the rule was inert on a blank price — it never fired at all. It now
  carries the same `!= null &&` guard its quote-side twin has always had. The
  guard only narrows the predicate, so no previously-accepted record starts
  failing; a blank price is still caught by the field's own `required`.

  Both line-item objects and `crm_campaign_member` also had their expressions
  authored with the wrong tag: formula fields used `P` (the predicate alias) and
  `campaign_member`'s validation used a raw `{ dialect: 'cel', source }` object
  because the file never imported `P`. `F`, `P` and `cel` are all aliases of the
  same tagged template, so this was invisible at runtime and only ever misled
  readers. Formulas now use `F`, conditions use `P`.

  Finally, `opportunity_line_item.hook.ts` and `quote_line_item.hook.ts` carried
  near-verbatim copies of the same price-fill handler, differing only in comments
  — the shape that lets a fix land on one object and silently skip the other. Both
  now build their hook from `_line-item-price-fill.ts`. The sharing happens at
  authoring time only: the handler body closes over nothing but its own `ctx`, so
  it still lowers to a body-only sandbox callable (the two lowered bodies in
  `dist/objectstack.json` are byte-identical). The rollup hooks next door look
  alike but compute genuinely different totals, so they stay separate.

  Guarded by a new `test/line-item-conventions.test.ts` — deliberately its own
  file rather than more surface on the high-churn `metadata-references.test.ts`.
  It pins all four: formula fields must use `F` and conditions `P` across every
  `*.object.ts` (a source-text check, because the tags are runtime-identical), no
  line-item formula may read another formula field, both `unit_price_positive`
  rules must be null-guarded, and the two price-fill handlers must remain one
  implementation — asserted both on handler source and on a shared behavioural
  scenario table run against each object.

- f71b535: Drop `--skip-i18n` from the `lint` script so translation coverage is enforced
  continuously instead of being silently skipped.

  Running `objectstack lint` without the flag at the current `17.0.0-rc.6` pin
  surfaced 75 real `i18n/missing-page` warnings — three page-scoped translation
  keys per locale, times 25 UI-component labels/titles that were never added to
  the `es-ES`, `ja-JP` and `zh-CN` bundles for `app_launcher_page`,
  `case_detail_page`, `lead_detail_page`, `opportunity_detail_page`,
  `sales_home_page` and `utility_bar_page`. Filled in the 50 keys for `es-ES`
  and `zh-CN` here (labels/titles for components like `key_metrics`,
  `ai_briefing`, `quick_create`, `notifications_panel`, etc., matching the
  English source in `src/pages/*.page.ts`). Previously these fell back to the
  raw English source string in the Spanish and Chinese UI.

  The 25 `ja-JP` keys are intentionally left out of this change: `ja-JP.ts` is
  being edited by a concurrent PR (#858) in the same batch, so touching it here
  would race that work. Those keys are enumerated in the linked issue for a
  follow-up.

- bbd5679: Fix `contract_renewal`'s notice-window gate, which throws instead of
  evaluating, and rewrite the two tests that #565 left red on main.

  **The live regression.** #565 correctly wrapped flow conditions as CEL
  envelopes so they finally evaluate. That exposed a second defect underneath, in
  `contract_renewal`:

  ```
  timestamp(currentContract.end_date) <= daysFromNow(int(currentContract.renewal_notice_days))
  ```

  `end_date` is a DATE field and arrives as `YYYY-MM-DD`, but CEL's `timestamp()`
  accepts only a full ISO 8601 datetime — it throws `timestamp() requires a
string in ISO 8601 format`. While the condition was a bare string it was never
  evaluated at all, so this sat latent; making the envelope real makes it throw
  mid-sweep. The sweep therefore still books nothing, having traded a silent
  no-op for an exception. Appending `T00:00:00Z` fixes it. Verified load-bearing:
  reverting just that change fails four `contract_renewal` tests.

  **The two red tests on main**, both introduced by #563 and both firing exactly
  as designed when #565 fixed the behaviour they pinned:

  - `flow-scheduled.test.ts` asserted the stagnation gate stays shut and failed
    with the message written for this moment — "gate now opens — rewrite this
    test". Rewritten to assert real behaviour: the nudge task and notification
    are created, repeated sweeps stay idempotent, and the sweep re-arms once the
    previous stall task completes. `contract_renewal` gets the same treatment
    (task, notification, `auto_renewal` opportunity, per-contract notice window,
    no duplicate renewal deal).
  - `flow-record-change.test.ts` asserted `typeof startCondition === 'string'`
    for `opportunity_approval`. #565 converted it to an envelope. That assertion
    was pinning the _notation_ rather than what matters, so it now accepts either
    form and checks a non-empty expression exists.

  **Guards added** so the class stays fixed: one pins the engine asymmetry that
  makes envelopes necessary (a bare string still evaluates `false` where an
  envelope evaluates `true`), and one walks every registered flow — including
  nested loops — failing if any loop body reintroduces a bare string condition.
  It also asserts the walk found something, so it cannot pass vacuously.

  `campaign_enrollment` gains a runtime suite (eligibility, opt-out, cross-campaign
  dedupe, closed-campaign refusal) and leaves `PENDING_FLOWS`, which is now down
  to `case_csat_followup` and `demo_bootstrap`.

- 2a03ca2: Write the marketing overview page's _Where to find things_ list to the app's real
  navigation. The **Marketing** group in `src/apps/crm.app.ts` has two children, not
  one: alongside Campaigns it carries **Products**, and that item is the product
  catalog's only sidebar entry anywhere in the app — the page had been telling
  readers the group held Campaigns alone, so anyone hunting for the catalog under
  Marketing would not have expanded it. The list now names both items with their
  real labels, points at `content/docs/revenue/products` for the catalog's own
  documentation, records that a product is otherwise reached only through global
  search or a quote/opportunity line item, and notes that this group — unlike
  Sales, My Work, Activity and Service — is collapsed by default. All three locales
  updated.
- 1e0dbad: Fix the "Update Stage" action on an Opportunity: choosing a new stage now
  actually moves the deal. Until this release the dialog accepted a stage, the
  request left the browser, and the server refused it with
  `update('crm_opportunity') does not recognise option 'stage'` — the deal stayed
  where it was and a red toast was all the rep got.

  The cause was the same one that hit the hook-side derived writes (#616): the
  action body called `ctx.api.object('crm_opportunity').update(id, { stage })`,
  but `ctx.api` is the engine repo facade, whose update takes
  `(document, options)` — the second positional argument is the OPTIONS bag, so
  the id landed in the `data` slot and the stage arrived as an unrecognised
  option. The body now writes `update({ id, stage }, { where: { id } })`, the
  spelling the rest of this app already uses and the only one live on both
  surfaces the runtime can hand a body (`updateById(id, data)` exists on
  `ObjectRepository` but not on the facade built when there is no scoped context).

  `test/action-sandbox.test.ts` used to pin this defect as a known break — it
  asserted the action was _rejected_ by the engine. That pin is now inverted into
  a contract: the shipped body is executed under the real QuickJS sandbox against
  a real ObjectQL kernel on the in-memory driver, and the assertion is that the
  STORED record's stage moved, read back from the driver rather than taken from
  the body's return value. Reverting the call to the old spelling turns four tests
  red, one of them reproducing the production error string verbatim.

  This is only the single-record half of #508. A multi-row selection still cannot
  reach any action in the console — the client rejects it before a request is
  sent, a top-level `selectedIds` is not delivered to the body, and
  `params.selectedIds` is refused as undeclared — so the "Update Stage" bulk
  button stays off the Opportunity list view until that ships upstream
  (objectstack-ai/objectstack#5568). The body's selection loop is covered by tests
  so nothing else stands in the way when it does. Refs #508.

- 8b45e44: Record the matrix reports' date-bucket intent and drop the empty `—` column
  (#523). The v9 single-form migration dropped `groupingsAcross[].dateGranularity`
  and never carried it to the dataset dimensions, so every date axis groups by the
  raw timestamp — one column per distinct value. Re-declaring it turns out to be
  blocked on the platform, not on us, and the blockage was measured rather than
  assumed: on the pinned @objectstack 16.1 a bucketed dimension does not bucket the
  axis, it EMPTIES the surface. A granular dimension is refused by
  NativeSQLStrategy, so the query falls to the auto-bridged `executeAggregate`,
  which calls `engine.aggregate()` with no ExecutionContext — sharing then
  composes `id = '__deny_all__'` for every private object (all of ours), and
  `lead_metrics` goes 21 rows → 0. A `Field.datetime()` column additionally buckets
  to a single NULL, because SQLite stores it as epoch millis and 16.1 formats it
  with a bare `strftime()`. Both are fixed in 17.0.0-rc.0 (#3602/#3597 and
  driver-sql's epoch normalisation), so the declarations belong with that upgrade,
  not ahead of it — which is also why #500 could not honour `dateGranularity`.

  So this ships what 16.1 can honour and pins the rest: the intended bucket for
  every date dimension (and for each matrix report's axis, including the dedicated
  quarter dimension `pipeline_coverage_by_quarter` needs — `close_date` is shared
  with the revenue trends, which want month) now lives in a new guard,
  `test/dataset-granularity.test.ts`. It fails today if anyone re-declares a bucket
  on 16.x, and flips to demanding every declaration the moment the platform pin
  crosses 17, so the upgrade cannot go green with the migration unfinished.
  `lead_inflow_by_month_source` and `cases_opened_by_day_priority` now exclude
  records with no date, which is what produced the headerless `—` column (the lead
  report loses it: 21 groups → 20, no null bucket). Three report comments that
  described a `dateGranularity` no dataset declares are corrected.

- 183b10d: Stop the CRM, Sales and Service dashboards showing invented period-over-period
  trends. Twelve KPI tiles across those three dashboards carried a hardcoded
  delta — `trend: { value: 12.5, direction: 'up', label: 'vs last month' }` and
  eleven more like it — that no query ever produced and nothing ever recomputed.
  They rendered the same "+12.5% vs last month" against every dataset, on every
  tenant, including a freshly seeded database where the claim was provably false,
  and they moved in the wrong direction as often as the right one.

  A period-over-period delta is a measurement: it can only come from comparing
  this period's result against the previous period's. Until the console can run
  that comparison for dataset metrics (widget `compareTo`), a tile now shows the
  number it actually measured and nothing else. This is the rule the Executive
  dashboard already followed — its own fabricated percentages were removed in
  #500 — so all four dashboards are finally honest in the same way.

  A new guard in `test/analytics-integrity.test.ts` walks every dashboard widget
  and fails on any `trend` carrying a literal number, at any nesting depth, so
  hand-typed deltas cannot reappear in metadata. Fixes #587.

- b0af232: Drop the hard-coded `$` from money display formats so amounts don't force a USD symbol.

  Currency measures and table/axis columns used the numeral format `'$0,0'`, which bakes a literal `$` into every rendered amount regardless of the actual currency. Combined with the platform's (now removed) default currency, the Executive Overview KPI showed `US$2,528,600` even though the `amount` field declares no currency of its own. All money formats are now plain `'0,0'` (grouped number, no symbol) across the opportunity/account/product datasets and the executive/sales/crm dashboards, so amounts render as plain numbers unless a currency is actually configured (a field code or a workspace default).

- 5d46177: Product docs: the _Standard list views_ section now describes the two views the
  catalog actually ships — **All Products** (the grid, grouped by category) and
  **Product Catalog** (the gallery) — in all three locales. It previously named
  _Active Products_, _By Category_ and _By Family_, none of which exists; the
  category grouping is a setting on the grid, not a saved view, and nothing groups
  by family. The same section on the campaigns page named six views that do not
  exist and is corrected the same way, and the cases page's roster gained the
  _Unassigned — triage_ view it had been omitting while claiming to list them all.

  The products page also stops promising that tax is applied. _Default Tax Rate %_
  is stored on the product and read by nothing: tax on a quote is an amount you
  enter on the quote itself, and a quote line item carries its own per-line rate.
  The sales-rep tip that said "pricing and tax are auto-filled" now says what is
  actually filled in — the list price, and the sales price on a new line.

  For maintainers: `pnpm scan:fields` prints an object-aware ledger of which
  declared field is read by what. The sweep it replaces matched field names across
  the whole source tree, so a field whose name is also used on another object read
  as consumed whatever it did — `crm_product.tax_rate` was invisible that way.

- 333259a: Upgrade the platform to ObjectStack 17.0.0-rc.5, and declare the matching
  `^17.0.0-rc.5` protocol range in the app config and manifest.

  **Nothing in this app had to change to absorb it.** That is the finding, not an
  omission — rc.5 ships three breaking changes and all three land outside what
  HotCRM authors:

  - **CSV `import` is no longer a `system-data` bucket default** (spec, #4671).
    Objects in that bucket now opt into the import wizard one at a time, so the
    three RBAC join tables that decide who can do what — user↔position,
    user↔permission set, position↔permission set — lose their bulk-grant entry
    unless a platform object asks for it back. HotCRM declares no `system-data`
    object of its own and no page of its admin documentation points an
    administrator at CSV for those bindings, so no HotCRM surface moves. The
    authorization boundary was never the thing being changed: import was only ever
    an affordance, and every row a CSV wrote already went through the same
    delegated-admin, RLS and permission-set adjudication as a row typed by hand.
  - **Transaction handles no longer leak across data sources** (objectql, #5351).
    A business write that crosses data sources inside one `transaction()` is now
    refused outright, and append-only system ledgers are carved out to commit on
    their own connection. This only bites deployments that register a second data
    source; HotCRM registers none — `Tenancy: single`, one
    `SqlDriver(better-sqlite3)` — so the path is unreachable here. Verified on a
    fresh boot: 242 `sys_audit_log` rows landed alongside the seed.
  - **`subscribeMetadata` narrowed its `type` parameter** (client, #4627). HotCRM
    does not depend on `@objectstack/client` or `@objectstack/client-react`.

  Also new and also inapplicable: `os migrate summary-nulls` backfills roll-up
  `count` / `sum` columns left `NULL` by pre-fix inserts. HotCRM has no platform
  roll-ups to backfill — its line items and campaign members reach their parents
  through `lookup`, not `master_detail`, and the aggregates it displays are plain
  number fields written by its own hooks. `docs/MAINTENANCE.md` §3.2 now records
  why, and what would change that answer.

  Verified on rc.5 rather than assumed: the full gate is green (validate,
  typecheck, lint, hygiene, build, and 1886 tests including the
  `parent-derived-reach` pins rc.4 established), and a reset-and-reseed boots the
  server clean and seeds all 17 objects with 342 rows.

- e9c4996: Upgrade every `@objectstack/*` dependency from `17.0.0-rc.5` to `17.0.0-rc.6`,
  and carry the app's metadata and pinned upstream expectations across with it.

  `objectstack.config.ts` (`engines.protocol`) and `objectstack.manifest.json`
  (`specVersion` + `engines.protocol`) move with the pin, per the #728 rule that
  config, manifest and build must not diverge.

  Six upstream behavior changes reached this app and are handled here rather
  than left to fail:

  - **`filter-empty-node` is a new author-time error.** An empty filter node
    (`{}`) reduces to TRUE and matches every row, so it is indistinguishable from
    an absent key — and `forecast_snapshot`'s "find every user" query declared
    one. The key is deleted, which is what the rule prescribes and what the node
    already meant.
  - **`$regex` is retired** (never declared by the Filter Protocol; it compiled
    to a substring `LIKE` on SQL and a real `RegExp` in memory). No app metadata
    used it — only the premise block in
    `test/account-name-normalized-match.test.ts`, which now measures the
    retirement and pins the same conclusion through `$icontains`, the declared
    replacement: still a substring match, so still no way to express
    normalize-then-exact. The stored normalized column remains the answer.
  - **The restrict-delete message speaks in display labels** ("… 1 Event Attendee
    record(s) through “Event” …") instead of API names. The behavior is
    unchanged — the delete is still refused — so the two assertions follow the
    wording while still pinning that the message names the blocking object and
    field.
  - **`ctx.permissions` now enumerates the platform baseline set
    `member_default`** alongside the app-declared profile. It is the set every
    member already carried, so the reach assertions are untouched; the
    negative control now pins the absence of `admin_full_access` directly
    instead of an exact one-element list.
  - **The approvals plugin relabelled the `my_pending` view in zh-CN**, 我的待办
    → 待我审批. The docs that quote it follow, and the #973 guard that retired
    待我审批 as "a sidebar label, not a view" is released: the string now occurs
    exactly once in the shipped bundle, as that view's label.

  - **The `ReportInput` type export is retired**, and the bare name `Report` now
    carries the authoring shape it used to name (ADR-0122: `X` is the input type,
    `XParsed` the post-parse one). The five `src/reports/*.report.ts` annotations
    follow; the underlying type — `z.input<typeof ReportSchema>` — is unchanged.
    Worth knowing on any other app making this jump: on rc.5 the name `Report`
    meant the OPPOSITE (`z.infer`), so an annotation that already said `Report`
    changed meaning silently, and only the removed `ReportInput` announced
    itself. `Action`, `Dashboard` and `Page` swapped the same way. Nothing but
    `tsc --noEmit` catches this class of change — `objectstack build` does not
    typecheck app sources.

  Docs that state the installed platform version (`docs/STATUS.md`,
  `content/docs/whats-new.mdx` and its zh-Hans / zh-Hant twins) move to rc.6.

- 9e832d2: Upgrade the ObjectStack platform to 17.1.0 across all `@objectstack/*` packages
  (from 17.0.0). `specVersion` and `engines.protocol` follow to `^17.1.0` in
  lockstep (the docs-drift guard requires the two manifest fields to state one
  version).

  The build compiles unchanged: 17.1's 33 parse-time accept-set narrowings all
  target declared-but-inert keys, and this app authors none of them. Two runtime
  behaviours changed and are green in the suite — objectql no longer strips a
  hook-derived value on a `readonlyWhen`-locked field (#9107), and automation
  answers 409 for a disabled trigger with per-retry input validation. The new
  `ActionSchema.onSuccess` action navigation is available but not adopted.

- 7cccf86: Upgrade the platform to ObjectStack 17.0.0-rc.4, which changes who can see a
  record whose sharing is Controlled by Parent — Contacts, Quote and Opportunity
  Line Items, Event Attendees and Campaign Members.

  Through 17.0.0-rc.3 those objects were readable, and writable, by every user
  whose profile granted the object at all. The engine resolved "which parents can
  this caller reach" from the parent object's row-level security policies alone,
  and HotCRM authors almost none — so the parent set was every record and the
  derivation restricted nothing. In practice a sales rep who could open exactly
  one account read every account's contacts, and a rep who could open no quote at
  all still read every quote's line items, per-line pricing and discounts
  included.

  From rc.4 the derivation resolves parent access the same way opening the parent
  directly would: ownership, sharing rules and manual shares are all folded in. A
  rep now sees the contacts of the accounts they can see — their own plus anything
  a territory rule or manual share put in reach — and the line items of the deals
  and quotes they can see, and nothing else. Writes narrow with reads: changing a
  row whose parent you cannot edit is refused, naming the parent that stopped it.

  **What this means for you.** Nothing to migrate, but expect related lists to get
  shorter for non-administrator users, because they were previously showing rows
  those users were never meant to have. If a persona genuinely needs the wider
  view, grant it deliberately — _View All_ on the parent object, or a sharing rule
  that names the parent — rather than relying on the old derivation. Administrators
  and any profile holding _View All_ are unaffected.

  Also in this upgrade: `crm_account` name uniqueness is now enforced on
  single-organization and untenanted installs. The per-organization index used to
  be NULL-distinct, so where no organization was set it enforced nothing and
  duplicate account names went straight in; rc.4 keys it NULL-safely and rejects
  them. And `crm_forecast`'s record title now renders — its formula called a
  coercion function that does not exist (`text()` rather than `string()`), so it
  faulted and left the title blank; rc.4's author-time expression check caught it.

- c55aaf5: Rewrite the Opportunities documentation's list-view section against the views the
  app actually ships.

  `content/docs/sales/opportunities.mdx` (and its zh-Hans / zh-Hant siblings) listed
  six "standard list views", and five of them do not exist: **My Opportunities**,
  **Closing This Month**, **At Risk**, **Top Deals by Amount**, and **Pipeline
  Kanban**. The sixth introduced a **third** name for a view everything else agrees
  on — the docs called it _Pipeline This Quarter_, while the metadata label and all
  four locale bundles say **Closing This Quarter** / 本季度待成交商机 / Cierres de
  Este Trimestre / 今四半期にクローズ予定. A reader looking for any of those names
  in the product found nothing under it.

  The section is now the real roster of nine saved views — Open Deals (the landing
  view), My Open Deals, Sales Pipeline, All Opportunities, Forecast Calendar, Deal
  Timeline, Deal Cards, ⚠️ Stale Opportunities · Longest in Stage First, and
  Closing This Quarter — each with what it filters, how it sorts, and where it is
  reached from. Two consequences worth calling out:

  - **Closing This Quarter is documented as it behaves after #743/#746**: open
    Commit and Best Case deals whose **close date falls inside the current
    quarter**, with both quarter bounds computed each time the list runs. Summing
    the Amount column is therefore this quarter's commit, and a deal closing next
    March waits on Open Deals. The page also says that an empty list here is a real
    answer — the view explains itself in place of the grid — so a quarter whose
    commit has slipped out does not read as a broken view.
  - **The rep tip no longer points at a view that does not exist.** "Don't move the
    close date — the **At Risk** view surfaces slippage" now says what really
    surfaces a stalled deal: time in the current stage, on **Stale Opportunities**,
    with the daily Stalled Deal Alert acting on it at 14 days.

  Also corrected: the kanban board's sidebar entry is **Pipeline** (the English
  label on the navigation item), not "Sales Pipeline" — that is the view's own
  name.

  Fixes #752.

- 983f465: Restore the opportunity list's bulk "Update Stage" button, and move a whole
  selection in one dispatch.

  Selecting several deals and moving them to a new stage has not worked in this
  app since the button was pulled from the list in #588. It was pulled for a good
  reason — it reported success and wrote nothing — and the failure was then
  attributed to the platform: no REST shape appeared to deliver a multi-row
  selection to an action, and the console refused a multi-row selection in the
  browser without issuing a request. Both readings were wrong in the same small
  way. The declared channel is `params._selectedIds`, a built-in action param with
  a **leading underscore**, and every probe had spelled it without one. A
  top-level `selectedIds` is never merged into the params bag; a
  `params.selectedIds` is correctly refused by the strict params gate as
  undeclared. The
  platform verified the declared channel end to end and closed its mirror issue as
  works-as-declared (objectstack-ai/objectstack#5568).

  The console's own "This action runs on a single record" toast was the clearest
  evidence of the real cause: it fires exactly when `_selectedIds` was **not**
  injected, and nothing injects it for a list that declares no bulk action. So all
  three symptoms trace to one missing declaration in this repo.

  `src/views/opportunity.view.ts` now declares the action as an aggregate bulk
  def — `{ name: 'mass_update_stage', operation: 'custom', execution: 'aggregate' }`
  — which dispatches it **once** for the whole selection rather than once per row,
  and `src/actions/opportunity.actions.ts` reads `input._selectedIds`. The
  single-record path (`ctx.recordId`) is unchanged; the write signature it depends
  on was fixed separately in #777. `execution: 'aggregate'` is not decoration: an
  `operation: 'custom'` def without it has no dispatcher, and the spec refuses that
  shape at parse time.

  The body no longer counts iterations, either. An id matching no row resolves to
  `null` instead of throwing, so the previous loop would have counted a stale or
  deleted id as updated and toasted success for a write that never happened —
  re-introducing #588's silent failure through a different door. It now counts only
  rows the engine returned and rejects a run it cannot cover in full, which is what
  the aggregate contract requires: there is no per-row retry, so a partial result
  must be an error. Rows already moved keep their new stage, and re-running the
  action over the selection is the retry (setting a stage is idempotent).

  Verified against a real dev server: the same request that answers
  `400 mass_update_stage: no opportunity selected` before the change answers `200
{"stage":"proposal","updated":2}` after it, with both rows re-read from the store
  at the new stage.

  The guard in `test/metadata-references.test.ts` that forbade this wiring is
  inverted rather than deleted — its premise expired, but the risk it named is real
  — and moved to `test/bulk-action-dispatch.test.ts`, since the old file sits one
  edit from the repo's 100KB source-hygiene ceiling. The new pins cover the
  declaration, the underscore, and a hole nothing else saw: an aggregate def naming
  an action that does not exist parses cleanly and dispatches nothing.

  Fixes #508.

- 9c61532: Sales docs: the two "when you open an opportunity, you'll see" bullets that describe the deal page's side column now match the page metadata.

  `content/docs/sales/opportunities` promised a **Competitors & Notes** side panel and an **AI
  Reference Rail** of _Sales Copilot suggestions (Customer 360, Revenue Forecast, related signals)_.
  Measured against `src/pages/opportunity_detail.page.ts`, that page declares three regions — a header,
  a main column carrying the tab strip, and one narrow `aside` — and the `aside` holds exactly one
  component: a `record:reference_rail`. There is no second side panel, and no component on the page is
  AI-driven.

  - **Competitors & Notes** — no such panel, and nothing on the page renders talking points. The
    bullet now points at where those two things actually are: **Competitors** is an ordinary
    multi-select field on the opportunity whose options are still the placeholders _Competitor A_ /
    _B_ / _C_ (`src/objects/opportunity.object.ts`), authored in the edit form's _Sales Strategy_
    section rather than shown on this page at all; the nearest thing to notes is the _Details_ tab's
    collapsible **Description** section, carrying **Description** and **Next Steps**.
  - **AI Reference Rail** — unlike the case page, the rail here is real; what is wrong is its
    contents. Its three entries are snapshots of records already linked to the deal — **Quotes**
    (`crm_quote` via **Opportunity**), **Products** (`crm_opportunity_line_item` via the same lookup)
    and **Open Tasks** (`crm_task` via **Related Opportunity**), each a total-count badge, at most
    three records and a _View all_ link, with empty entries folded into a _+ N empty_ chip. No
    suggestion of any kind is produced here or anywhere else on the page: Customer 360 and revenue
    forecasting are skills you reach by asking, which the section below the list already describes.
    The bullet also now records that the rail's **Open Tasks** entry carries no status filter — rail
    entries declare none and the rail queries on the relationship alone — so the filtered
    not-_Completed_ list is the one on the _Related_ tab, ten at a time.

  Each name is kept and answered rather than silently deleted, following the same approach as the case
  detail passage. Whether the deal page _should_ grow a competitor panel, and the "Copilot" wording
  itself, are product questions this leaves open. English, Simplified Chinese and Traditional Chinese.
  Documentation only — no metadata changed.

- 484425f: Show the Needs Analysis stage on the opportunity path and tint its rows in Open
  Deals, and guard stage coverage against the canonical picklist.

  `crm_opportunity.stage` has **seven** canonical values
  (`OPPORTUNITY_STAGE_OPTIONS` in `src/objects/_picklists.ts`), but two pieces of
  UI metadata enumerated only six, and both dropped the same one:
  `needs_analysis`. On the detail page's `record:path` a deal sitting in Needs
  Analysis lit up **no step at all**, so the strip read as though the deal had
  skipped straight from Qualification to Proposal; in the Open Deals list its rows
  got no stage tint while every neighbouring stage did. Needs Analysis is an
  ordinary mid-funnel stage — 40% default probability, `best_case` forecast
  category, reachable from Qualification by the object's own state machine and
  offered by `mass_update_stage` — so this was six-sevenths of a working feature
  presenting as corrupted data on the seventh.

  Both sites now carry the stage: the path gains a step between Qualification and
  Proposal (funnel order; the two terminal stages stay last), and `rowColor` gains
  teal `#14b8a6`, which sits between the cool qualification blue and the warm
  proposal amber. The colour is deliberately **not** the `#FFD700` the option
  carries in `_picklists.ts` — that map is a separate Tailwind palette, and gold is
  one hue step from proposal's `#f59e0b`, so reusing it would have left the two
  adjacent stages tinting rows indistinguishably and re-created the bug in a form
  harder to see.

  `test/metadata-references.test.ts` already checked these two surfaces in one
  direction — every value written there must be a real option. That subset check
  passes happily on a map that lists six of seven, which is why nothing caught
  this. Four assertions add the converse: every value of
  `OPPORTUNITY_STAGE_OPTIONS` must appear in every `record:path` bound to
  `crm_opportunity.stage` and in every stage-keyed `rowColor`, no two stages may
  share a row colour, and the object field must still be built from that same
  constant. The expectation is **derived** from the picklist rather than
  hand-copied, so an eighth stage cannot ship half-covered — a copied list would
  need the same edit as the metadata it guards, and would be forgotten in the same
  commit.

  Fixes #759.

- 9aac752: Let the opportunity detail page's reference rail take its card headings from the
  translation bundle, and stop one of them claiming a filter the component cannot
  apply.

  The three entries in `src/pages/opportunity_detail.page.ts` each declared a
  literal English `title` — `Quotes`, `Products`, `Open Tasks`. The rail resolves a
  heading as `entry.title || i18n.objectLabel({ name: objectName, … })`, so a
  literal does not supply a default: it wins, and the locale bundle is never
  consulted. `objects.crm_quote.label`, `objects.crm_opportunity_line_item.label`
  and `objects.crm_task.label` are translated in all four locales this app ships,
  yet the rail printed English into every one of them. Dropping the three literals
  hands the heading back to the translation bundle, so the cards now read 报价单 /
  商机产品明细 / 任务 in Simplified Chinese and follow any locale added later
  without a page edit.

  Two consequences worth knowing before you look at the page:

  - The English headings change with it, from the plural nouns the literals spelled
    to the objects' own singular labels — **Quote**, **Opportunity Line Item**,
    **Task**. The rail reads `label`, never `pluralLabel`, so a plural heading is
    not reachable from metadata today.
  - The task card loses the word _Open_, which it was never entitled to. A rail
    entry carries no filter and cannot be given one — the rail queries
    `{ $filter: { [relationshipField]: parentId }, $top: limit }` and reads nothing
    else off the entry — so that card has always counted and listed this deal's
    tasks whatever their status. The genuinely filtered view is the **Open Tasks**
    related list on the _Related_ tab, which does carry `status neq completed`.

  The `sales/opportunities` page in all three doc languages is updated to match,
  and three new guards pin the behaviour: rail entries must resolve to real objects
  and relationship fields, must declare no literal title, and must declare no
  filter — the last one so that an author reaching for the _Related_ tab's
  predicate gets a red test instead of a key that parses, ships and does nothing.

- 42a1d33: Make the stalled-deal sweep actually fire (#489). `crm_opportunity.days_in_stage`
  was a plain number column that nothing ever incremented — the lifecycle hook
  reset it to 0 on a stage change and no sweep raised it — so
  `opportunity_stagnation`'s `days_in_stage > 14` filter matched only the rows the
  seed had hardcoded, and real deals could rot in a stage forever without a nudge.

  Opportunities now carry `stage_entry_date`, a stored date stamped by the
  lifecycle hook on insert and on every stage change. `days_in_stage` becomes a
  formula counting from it, correct on every read with no nightly full-table pass.
  Because a formula is evaluated after the query and is not a real column, the
  sweep now predicates on `stage_entry_date < TODAY() − 14` — the same test,
  against something the data engine can see — and the "Stale Opportunities" view,
  which can express neither a formula predicate nor a relative date, becomes an
  open-deals list ordered longest-in-stage first with `days_in_stage` on show.

  Two guards in `test/metadata-references.test.ts` keep the class from returning:
  no list view may filter or sort on a formula field, and no flow data node may
  filter on one. The second instance they caught is fixed here too — the quarterly
  forecast view's `attainment_pct` tiebreaker was a dead sort key, now
  `closed_amount`.

- d50df72: Stop the Opportunity record title from rendering the raw `stage` value, and guard the whole picklist-rendering class in CI.

  `crm_opportunity.nameField` pointed at a `display_title` formula composed as `record.name + " - " + record.stage`. A formula sees the stored select VALUE, never the translated label, so every deal titled itself "Enterprise Deal - closed_won" in lookup pickers, related lists, breadcrumbs and search results — in every locale. The ADR-0079 migration inherited this from the render-time template `'{name} - {stage}'`, which could resolve the label; a formula cannot. `nameField` is now the plain `name` column (a real, indexed field — so `$search` resolves on it directly) and `stage` still leads the highlight strip, translated.

  Three guards were added to `test/metadata-references.test.ts` so this class fails at PR time instead of during dogfooding: option translations must be keyed by option value (not English label); translated object/field keys must name real objects and fields; and no formula may render a select field into its output string (branching on a select stays legal). The existing zh-CN navigation-label guard looked up `translations.find(t => t.locale === 'zh-CN')`, but the app ships one bundle keyed by locale — the lookup matched nothing and the test returned early, asserting nothing. It now resolves the locale pack correctly and asserts the pack exists.

- 69319b6: List **Event Attendee** in the Org-Wide Defaults table on Sharing & Security, in
  all three locales, and correct the count in the section under it.

  `crm_event_attendee` ships `sharingModel: 'controlled_by_parent'` — it arrived
  with the activity model (#592) and never reached the OWD table, so an admin
  reading `content/docs/administration/sharing-and-security.mdx` (or its zh-Hans /
  zh-Hant siblings) to find out how attendee rows are secured found nothing at all,
  and the paragraph right below the table went on addressing "the four
  parent-derived objects above" while the app shipped five: Contact, Opportunity
  Line Item, Quote Line Item, Campaign Member and Event Attendee. The new row names
  Event as the parent and points at _Controlled by Parent, in practice_ for what
  that derivation actually reaches in this release, the same way the Contact and
  Campaign Member rows have since #699 — nothing about the shipped access changes
  here, only what the page says about it.

  The class is now guarded. `test/sharing-coverage.test.ts` derives the OWD table's
  parent-derived row set from the compiled stack and checks it against all three
  pages in both directions: every `controlled_by_parent` object must have a row,
  no row may claim Controlled by Parent for anything the stack does not derive, and
  the number word in the prose must equal the number of such objects the app ships.
  A sixth parent-derived object now fails CI until all three pages document it,
  instead of shipping undocumented for four releases.

- a98ddaa: Make the Org-Wide Defaults table on Sharing & Security the app's registered-object
  list — in all three locales — and bring the two Chinese pages up to what
  Controlled by Parent actually reaches in this release.

  The OWD table disagreed with the app in two directions at once. It listed
  **Competitor**, an object that no longer exists: `crm_competitor` went with the
  demo-only competitor module, taking four dangling profile grants with it, and the
  row stayed behind sending admins into Setup to look for a baseline they cannot
  find. And it had no row for **Event** at all, even though `crm_event` has shipped
  `private` since the activity model landed — so the one place an admin goes to
  learn how meeting records are secured answered nothing. Both are fixed here, and
  the same stale Competitor battlecard wording is gone from the Profiles page in all
  three locales.

  The Chinese pages were also six weeks behind the English one on a load-bearing
  claim. Both still promised "读：你能看到其父记录你能看到的那些行" — you see the rows
  whose parent you can see — which is the intent of Controlled by Parent, not what
  this release computes. As measured against the shipped stack, the derivation
  resolves accessible parents from the parent object's row-level policies alone, so
  a rep who can read one account reads both accounts' contacts, and a rep who can
  read no quote still reads every quote's line items. Every place the two pages
  carried the old promise now says what the English page has said since that
  measurement: the reach section, the OWD rows for Contact / Campaign Member /
  Event Attendee, the related-list table, the manual-share section, the layer
  summary, and the user tips. The related-list tables also gained the `Events` row
  the English page has had since the activity model shipped.

  Guards, both widened rather than added alongside: `test/sharing-coverage.test.ts`
  now derives the whole OWD row set from the compiled stack instead of only its
  parent-derived subset — every registered object must have exactly one row stating
  the `sharingModel` it really ships, and no row may name an object the app does not
  register, on each of the three pages. Two further rules cover what the Chinese
  pages were missing: their related-list tables must name the same account children
  the English one does, and all three pages must state the same measured reach and
  point at `test/parent-derived-reach.test.ts`, which is what pins that reach
  against the engine. A page that drifts on any of it now fails CI naming both the
  object and the locale.

- f7be38d: `crm_forecast.period_start` now states its calendar-boundary constraint on the
  field itself, in the record form's Snapshot section, instead of only surfacing
  it when a bad write is refused.

  #1081 (#1008) made a hand-filled `period_start` off a calendar-period boundary
  a rejected write, enforced by two rules that are unchanged by this PR:

  - `period_start_first_of_period` — "Period Start must be the first day of the
    period — e.g. 2026-08-01 for Aug 2026."
  - `quarter_starts_on_quarter_boundary` — "A quarterly forecast must start on a
    quarter boundary — January 1, April 1, July 1 or October 1."

  `period_start` now carries a `description` echoing those same two messages, and
  a matching `help` entry lands in all four locale packs (`en`, `zh-CN`, `es-ES`,
  `ja-JP`), which is what `test/i18n-references.test.ts` requires for any field
  that carries a `description`.

  `period_end` is also editable on the Snapshot section (measured — it is not
  readonly, and `forecast.hook.ts` only derives it when a write leaves it unset),
  so it gets its own `description` + four-locale `help` too — but for the rule
  actually bound to it, `period_end_after_start` ("Period End must be after
  Period Start."), not `period_start`'s calendar-boundary rules, which do not
  apply to it.

  No validation rule changed.

- b359fac: Write the pipeline board's column total to what a kanban can actually show, and
  name the two non-object Sales sidebar entries the app really ships.

  **A kanban column carries one total, and it is unweighted.**
  `content/docs/sales/pipeline-management.mdx` (and both zh pages) told a rep that
  the top of every board column shows two numbers — an unweighted total and a
  weighted one. A board cannot show two: `KanbanConfigSchema` in
  `@objectstack/spec` declares `summarizeField` as a single optional string
  ("Field to sum at top of column"), so one column total is the shape of the
  feature, and `pipeline_kanban` in `src/views/opportunity.view.ts` binds that one
  field to `amount`. The weighted half of the promise therefore never existed, and
  a rep looking for it on the board read the unweighted sum of Amount as though
  the probability coefficient were already in it — the same class of error the
  page's _How expected revenue is calculated_ section was just corrected for, one
  screen higher. The page now states the single column total for what it is and
  sends the weighted forecast to where it genuinely lives: the _Expected Revenue_
  column sums on **Open Deals** and **All Opportunities**.

  **Two Sales sidebar entries were named by names the sidebar does not carry.**
  `content/docs/sales/index.mdx` listed _Sales Pipeline_ and _Sales Dashboard_
  under "Where to find things" — a section whose whole job is to say what a reader
  will see in the nav. `src/apps/crm.app.ts` labels those two entries **Pipeline**
  and **Sales Performance**. _Sales Pipeline_ is real, but it is the label of the
  kanban _view_ (`pipeline_kanban`), not of the sidebar entry that opens it;
  _Sales Dashboard_ is neither, and is the same phantom already removed from the
  pipeline page's roll-up list and its forecast paragraph. Both bullets now carry
  the nav label, with the view's own label named beside it, the way
  `content/docs/sales/opportunities.mdx` already describes the pair. The third
  occurrence of the same mix-up — the pipeline page's "sidebar shortcut **Sales
  Pipeline**" — now names the view and the sidebar entry separately too.

  Docs only, all three locales — no `src/` change.

- aaaed20: Write the sales pipeline page's remaining dashboard and report references to what
  the app actually ships — one phantom capability, four wrong report names, and a
  tile that cannot exist.

  `content/docs/sales/pipeline-management.mdx` (and both zh pages) carried three
  separate drifts, all of which sent a reader looking for something that is not
  there.

  **The weighted forecast is a list-view total, not a dashboard number.** The page
  told a sales manager that a _Sales Dashboard_ "sums Expected Revenue across the
  open pipeline". Neither half held. There is no dashboard by that name — the real
  one is `sales_dashboard`, labelled **Sales Performance**, the same phantom #985
  removed from the roll-up list one section further down. And no dashboard widget
  can sum expected revenue at all: the `opportunity_metrics` dataset in
  `src/datasets/opportunity.dataset.ts` declares no measure over
  `expected_revenue`, and every amount measure it does expose (**Total Amount**,
  **Avg Deal Size**, **Won Revenue**, **Lost Revenue**) reads the raw `amount`
  field. The **Total Pipeline** tile is therefore the _unweighted_ open pipeline,
  and a reader who took the page at its word was reading a number short of a
  probability coefficient while being told it was the weighted forecast. Where the
  weighted sum genuinely lives is the opportunity list views: **Open Deals** and
  **All Opportunities** each declare
  `{ field: 'expected_revenue', summary: 'sum' }` in
  `src/views/opportunity.view.ts`, which is how
  `content/docs/sales/opportunities.mdx` already describes them. The page now says
  that, and says plainly why the dashboard cannot match it.

  **The reports table named a sidebar group that does not exist and four reports
  by names nothing carries.** The group is **Insights**
  (`src/apps/crm.app.ts`), not _Reports_, and it pins three reports — Pipeline
  Coverage, Lead Inflow, SLA Performance — beside the CRM Overview dashboard and
  Forecasts, so only the first row of the table is reachable from the nav at all;
  the rest open from the reports screen. The four drifted rows now carry the
  labels `src/reports/opportunity.report.ts` declares — **Pipeline Coverage by
  Forecast × Quarter**, **Opportunity Funnel by Owner → Stage**, **Won
  Opportunities by Owner** — and the coverage row's axes are stated the way #985
  just landed them one section below (forecast category down the rows, close
  quarter across the columns) instead of the transposed _quarter × stage_. The
  same truncated names in the cadence table and the manager tips were completed to
  match, including the zh pages' invented Chinese report names, which no
  translation file backs.

  **There is no _top deals_ tile, and there cannot be one.** The roll-up list
  named three Sales Performance widgets; two are real (**Pipeline by Stage**,
  **Win Rate (12M)**) and the third was removed on purpose. A dashboard `table`
  binds to an analytics dataset and can only aggregate — it cannot list raw
  records (ADR-0021) — so the old **Top Open Opportunities** table produced one
  summary row rather than a deal ranking and was replaced by **Open Pipeline by
  Owner**. The Row 5 comment in `src/dashboards/sales.dashboard.ts` records the
  swap; the page now states it and points a reader wanting a deal-by-deal ranking
  at an opportunity list view.

  Docs only — no `src/` change.

- 541e134: Name the dashboard and the report that the sales pipeline page's "Forecasting
  roll-up" list actually points at.

  `content/docs/sales/pipeline-management.mdx` told a sales manager the forecast
  view is built from a **Sales Dashboard** and a **Pipeline Coverage** report
  holding a _quarter × stage_ matrix. Neither was findable as written. There is no
  dashboard called _Sales Dashboard_: the identifier is `sales_dashboard`, but the
  label it renders under — and the label on its Sales sidebar entry — is **Sales
  Performance**. And the Pipeline Coverage report's matrix has neither of the axes
  the page named: `pipeline_coverage_by_quarter` puts **forecast category** down
  the rows and **close quarter** across the columns, with amount and deal count in
  each cell; `stage` appears only in the runtime filter that drops closed deals, so
  it is not an axis at all. A reader who took the page at its word was reading the
  matrix transposed and against the wrong dimension.

  Both lines now carry the real label plus the metadata identifier behind it, in
  all three locales, and the report line is worded the same way as the entry on
  the reports page so the two pages no longer contradict each other. The Pipeline
  Coverage line also states the report's own label, **Pipeline Coverage by
  Forecast × Quarter**, which is how the report library lists it — the sidebar
  shows the shorter **Pipeline Coverage**.

- 7df2978: Move the platform baseline from ObjectStack 17.0.0-rc.2 to 17.0.0-rc.3. Every
  `@objectstack/*` dependency is bumped together, and `specVersion` /
  `engines.protocol` in `objectstack.manifest.json` follow.

  Unlike the rc.1 → rc.2 window, this one migrates nothing: rc.3 carries exactly
  one substantive platform change, and it is a loosening. `BulkActionParamSchema`'s
  `options[]` entry became `.passthrough()` (upstream #4001), so keys beyond
  `label` / `value` on a bulk-action param option — `color`, `icon`, `disabled`,
  `visibleWhen` — are preserved at parse instead of being silently removed. Every
  other `@objectstack/*` package in this release is a version-bump republish whose
  changelog entry is `Updated dependencies` alone.

  HotCRM authors two bulk-action params with options, both on
  `src/views/account.view.ts` (`update_tier`, `transfer_owner`), and both spell
  their options with exactly `label` and `value`. Nothing was being stripped here,
  so the loosening is a no-op for this app today — it is now simply possible to
  give a bulk-action option a colour or an icon and have it survive to the
  renderer.

  The full suite was re-run against the installed rc.3 with `dist/` deleted first:
  `validate`, `typecheck`, `build`, `test`, `lint` and `hygiene` are all green with
  no source, metadata, test or documentation change required. The pre-existing
  author-time warnings (four approval-approver warnings on the two opportunity
  approval flows, one shadowed field group on `crm_campaign_member`) are unchanged
  in number and wording.

  Version-string references elsewhere in the repo are deliberately untouched. Every
  remaining `17.0.0-rc.2` in `src/`, `test/`, `content/` and `.changeset/` is a
  record of when a behaviour was measured ("measured on 17.0.0-rc.2", "from
  17.0.0-rc.2 the engine rejects the write"), not a declaration of what this app
  depends on; rewriting them to rc.3 would falsely claim a re-measurement that did
  not happen.

- cc25f6d: Brings the two Chinese `profiles` pages to the reach the platform actually
  computes, and puts a guard on the sentence that says so. Prose and tests only —
  every profile grant, OWD, sharing model and sharing rule is byte-identical, and
  the English page is untouched: it is the baseline the two translations were
  measured against.

  PR #699 rewrote the Sales Representative block on
  `content/docs/administration/profiles.mdx` after
  `test/parent-derived-reach.test.ts` measured what the ADR-0055 derivation does on
  17.0.0-rc.2. `profiles.zh-Hans.mdx` and `profiles.zh-Hant.mdx` did not follow, so
  for six weeks they told their readers the opposite of what the English page told
  theirs — not merely stale wording, but a promise the platform does not keep:

  - **Contacts** read "跟随客户 / 跟隨客戶" — the rep sees contacts under the accounts
    they can see. Measured, a rep who can read exactly one account reads **both**
    accounts' contacts. Now: every contact in the org, because Contact is
    Controlled by Parent and that derivation resolves org-wide rather than per
    account, with the same cross-reference the English bullet carries into
    _Controlled by Parent, in practice_ on the sharing page.
  - **Opportunity and quote line items** read "对自己的交易和报价拥有完整权限 /
    對自己的交易和報價擁有完整權限" — control scoped to the rep's own deals. Measured, a
    rep who can read **no** quote at all still reads every quote's lines. Now:
    every deal's and every quote's lines, not only the rep's own.

  Both pages now use the vocabulary the corrected sharing pages settled on
  (“由父级控制”/「由父層控制」, 派生/衍生), so a reader moving between the two admin pages
  meets one set of terms.

  Nothing was red while this drifted: every rule in `test/sharing-coverage.test.ts`
  read `sharing-and-security`, the OWD and related-list rules parse tables this page
  does not have, and `docs-drift.test.ts` compares callout counts, which #699 did
  not change. That file now also pins the profiles claim in all three locales, on
  the parsing infrastructure PR #811 left behind — a bullet-list reader beside the
  existing table reader, an authored-per-locale claim ledger, and the same
  anti-vacuum discipline. What it pins is co-movement: the truth stays measured by
  `test/parent-derived-reach.test.ts`, which goes red the day the platform narrows
  the derivation (objectstack-ai/objectstack#5386) — the signal to rewrite all six
  pages and re-take the OWD decision (#549). The three objects the block describes
  are checked against the compiled stack, so the claim cannot outlive the
  derivation it describes.

  Refs #807, #791, #699.

- 9305252: Forecast "This Quarter" list view now actually shows this quarter

  Opening **Forecasts → This Quarter** returned every quarterly snapshot ever taken — every settled quarter of every year — with the current one merely sorted to the top. All four locales named it "This Quarter" / 本季度 / Este trimestre / 今四半期, so anyone who trusted the heading and read the Quota column down was adding one quarter's target to another's.

  The view is now filtered to the current quarter (`period = quarter` **and** `period_start = {current_quarter_start}`), which is the same period key the Sales dashboard's _Quota Attainment by Rep_ table pins. Both halves are needed: the period type alone spans years, and the start date alone merges the quarter row with the month row that opens the same quarter.

  The restriction had been removed on the ground that the list data path could not resolve a date macro. That was true on ObjectStack 16.1.0 and is no longer: filter placeholders have been resolved on the server's read path since 17.0.0-rc.0, which is what this app has been running for several releases.

  **What you will notice:** the view is empty until the nightly forecast sweep has opened the current quarter — the same honest-empty state the quota table already shows at a quarter boundary. It now says so, in every language, instead of showing a blank grid. Settled quarters are on the **All** tab.

- 86f754e: Rewrite the quick tour's opening section against the dashboard **Home** really
  opens. `content/docs/getting-started/quick-tour.mdx` — the first paragraph a new
  user reads — described a dashboard that does not exist: its name came from one
  dashboard and its five bullets from three others.

  The name was wrong. `nav_home` binds `executive_dashboard`, whose label is
  **Executive Overview**. **CRM Overview** is a real dashboard, but it hangs off
  `nav_crm_dashboard` under **Insights** — a group that ships collapsed — so a new
  user neither lands on it nor can click it without opening the group first. The
  same page's navigation table already said Home opens **Executive Overview**
  (PR #968), so the page contradicted itself, with the wrong half first.

  Of the five bullets, one was right (**Open Leads**), one was half-right, and
  three named tiles that are on other dashboards entirely. The section now lists
  all nine **Executive Overview** tiles with what each measures, names the three
  dashboard-wide controls, and re-points every retired claim instead of deleting
  it: cases are counted on **Service Overview** (**Open Cases**, **Critical
  Cases**, **SLA Violations**), interactions on **Sales Activity**
  (**Interactions Logged**, **Meetings Booked**, **Customer Minutes**), and a
  count of open deals is **Active Deals** on **CRM Overview**. "Top accounts by
  pipeline value" is not a tile in this app at all — the nearest ranking anywhere,
  **Pipeline by Owner**, ranks sales reps rather than customers.

  Two corrections beyond the reported ones. The pipeline bullet was half-right
  rather than wrong: **Pipeline by Stage** _is_ on this dashboard, arriving from
  the shared widget factory rather than an inline literal, so a title grep over
  `executive.dashboard.ts` finds eight tiles where the dashboard ships nine. The
  section now says what that tile actually measures — open opportunity value per
  stage, not a count of deals. And the closing promise of "team-level rollups for
  managers" describes something this app does not do: positions are flat, so
  visibility never rolls up a reporting line, and the **Sales Manager** permission
  set grants `viewAllRecords` outright, which makes a manager's totals org-wide
  rather than a team slice.

  All three locales updated; `src/` untouched. The guard added in PR #968,
  `test/docs-quick-tour-navigation.test.ts`, only ever read the navigation table
  and so stayed green through all of this — it now also compares this section
  against `ExecutiveDashboard.widgets` at runtime (which is what counts the
  factory-produced funnel), pins the source side of each negative claim, and
  fails in all three locales when a tile is added, renamed or removed.

- 02fb379: Rewrite the quick tour's left-navigation table against the app's real navigation.
  The table in `content/docs/getting-started/quick-tour.mdx` — the first thing a new
  user reads, and a table whose entire job is "here is what the sidebar holds" — had
  drifted in every one of its eight rows. Four of the groups it named do not exist in
  `src/apps/crm.app.ts` (_Products_, _Activities_, _Analytics_, _AI_), three groups
  that do exist were absent altogether (**My Work**, **Activity**, **Insights**), and
  the four rows whose group was real each dropped items or used a label the app never
  shows: **Sales** was missing **Account Workbench**, **Pipeline** and **Sales
  Performance**; **Service** spelled _Knowledge Base_ for the entry actually labelled
  **Knowledge** and omitted **Service Overview**; **Marketing** listed _Campaign
  Members_, which is not a sidebar item at all; and **Approvals** listed two items
  where the group has exactly one, **Inbox**.

  The table now carries the pinned **Home** entry and all seven groups with their real
  children, in source order, and says which groups are collapsed when the app loads
  (**Marketing**, **Insights**, **Approvals**) — the failure mode that makes a reader
  conclude something is missing. Every retired name is re-pointed rather than deleted:
  the catalog is the **Products** item under **Marketing**, tasks are **My Tasks** and
  **All Tasks** under **My Work**, the Copilot is the right-side chat panel, campaign
  membership is reached from the campaign detail page, and the approval audit trail is
  real data (`sys_approval_action`) that no navigation entry opens. All three locales
  updated; `src/` untouched. A new guard, `test/docs-quick-tour-navigation.test.ts`,
  compares the table against `CrmApp.navigation` group-for-group and child-for-child in
  all three locales, so the next navigation change cannot leave the tour behind.

- 814dc37: Scope the Opportunity "Closing This Quarter" list to deals that actually close this quarter.

  The view was labelled "Closing This Quarter" in metadata and in all four locales while its
  filter carried no condition on `close_date` at all, so it returned every open commit and
  best-case deal whenever it was due to close — a deal slated for next March sat under the
  heading, and a rep who summed the Amount column got a number that was not this quarter's
  commit. The filter now windows `close_date` to the current quarter, using the platform's
  own date macros (`{current_quarter_start}` … `{current_quarter_end}`), which the ObjectQL
  read path substitutes server-side.

  Scoping the list makes an empty result reachable — near the end of a quarter, or in an org
  whose commit has slipped — so the view now carries an empty state explaining what it lists
  and where the later deals are, translated in all four locales. The labels are unchanged:
  they were right all along; the filter was the part that lied.

- f4241d6: Fix the Sales dashboard's **Quota Attainment by Rep** table, which showed every
  rep a quota several times larger than their real one. `crm_forecast` stores one
  snapshot per owner **per period** — a current quarter, a current month and every
  settled period before them — and the table aggregated all of them at once, so it
  added a quarter's quota to a month's quota to last quarter's quota and labelled
  the total "Quota". On the shipped seed data a rep with a real 1,500,000 quarterly
  quota was shown 7,940,000, and attainment read 90% where the truth was 55%.

  The table is now pinned to the current quarter
  (`period` = `quarter` **and** `period_start` = the current quarter's first day),
  so Quota, Closed and Attainment are the numbers for the quarter in progress. Both
  halves of that key are needed: the period type alone still sums every quarter
  ever snapshotted, and the start date alone still merges the quarter row with the
  month row that opens the same quarter. Its description now says "current-quarter"
  in all four locales, and the Forecasting guide spells out the rule for anyone
  building their own roll-up.

  For the few hours between a quarter boundary and the 03:00 snapshot sweep that
  opens the new quarter's row, the table is empty rather than showing the previous
  quarter's attainment under a header that says this one.

  A new guard (`test/forecast-period-scope.test.ts`) fails the build for any widget
  or report that aggregates `forecast_metrics` without either grouping by period or
  filtering to a single one, and runs the shipped widget through the real analytics
  path to check the number it produces. Fixes #614.

- d57124d: Accepting a quote that is missing a link no longer breaks the rest of the
  acceptance chain.

  `quote_on_accepted` read the ids it copies onto the drafted contract with
  `(typeof input.x === 'string' && input.x) || (typeof previous?.x === 'string' &&
previous.x)`. When neither operand held — a quote with no contact, or no
  opportunity, both of which `crm_quote` allows by design — that expression is not
  `undefined`, it is boolean `false`, and `false` went to the engine as the
  _content_ of a lookup. A lookup column takes a record id or nothing at all, so
  the write was wrong in every deployment, in one of two ways:

  - with strict value shapes on (after `os migrate value-shapes --apply`), the
    insert was refused — `Primary Contact has an invalid lookup value: Invalid
input: expected string, received boolean` — and the refusal aborted the whole
    handler, so the **close-won step below it never ran either**. A rep accepting a
    quote that carried its opportunity but no contact got no contract _and_ an
    opportunity still sitting open, while the accepting save answered `200`: the
    hook is `async` with `onError: 'log'`, so the only evidence was a server log;
  - with the warn-first default, nothing was refused at all — `false` was
    **stored** in the reference column, which is a row the value-shape migration
    scan later cannot convert.

  An absent link is now an absent key. The contract is drafted with only the
  lookups the quote actually carries, so an opportunity-less quote drafts its
  contract normally instead of being rejected for a link it never had. The two
  consequences of acceptance are also independent now: a contract that will not
  draft no longer decides whether the deal is won, and each leg that fails is
  reported by name (`could not draft the contract for quote …`) so the log says
  what happened instead of nothing.

  One behaviour is unchanged and worth restating, because it is the reason this
  looked like a total failure: `crm_contract.crm_contact` is required, so a quote
  accepted with no contact still produces no contract — now refused honestly with
  `Primary Contact is required` rather than as a shape error, and no longer at the
  cost of the opportunity. This is what the Quotes page already tells reps ("put
  both on the quote before you mark it accepted").

- 62f0d78: An accepted quote's payment terms now reach the contract it drafts. Until now
  they did not: `quote_on_accepted` built the draft contract from the quote's
  account, contact, opportunity, owner, value, term months and dates — but never
  its `payment_terms` — so every auto-drafted contract took
  `crm_contract.payment_terms`'s own option default of **Net 30**, whatever the
  customer had negotiated. A deal closed on Due on Receipt, Net 15, Net 60 or
  Net 90 produced a contract quietly saying 30 days, with nothing on the record
  marking the value as a default rather than a decision.

  The value does not stay on the contract, either: the billing hand-off sends the
  contract's `payment_terms` to the billing system when the contract is activated,
  so the wrong term became the invoicing term. And the rep who negotiated it could
  not correct it — Sales Reps have no edit right on contracts, so every occurrence
  needed a manager or an administrator.

  Quote and Contract have shared one payment-terms vocabulary since #490,
  including `due_on_receipt`, specifically so that an accepted quote's terms could
  be carried over intact. That was the stated reason for sharing it; the copy that
  justified it had never been written.

  Nothing changes for a quote that never chose a term: the field stays absent on
  the draft and the contract's own Net 30 default applies, exactly as before.

- 8a90449: Require a **Contact** on a quote from `presented` onward, so the sentence the
  schema has always carried — _"Recipient is nailed down by the time a quote is
  presented"_ — finally has a mechanism behind it.

  `crm_quote.crm_contact` was optional in every state while
  `crm_contract.crm_contact` is `required` + `notNull`. A quote accepted without a
  recipient therefore could never draft its contract. Since #1013 that failure is
  honest and no longer swallows the close-won leg, but `quote_on_accepted` is
  `async: true` + `onError: 'log'`: the accepting write still answers 200, and the
  only evidence is a server log with no human in front of it.

  `crm_contact` now carries
  `requiredWhen: has(record.status) && (record.status == "presented" || record.status == "accepted")`,
  which moves the same refusal forward to the write that turns the quote outward —
  synchronous, reported against the field, with the quote still editable:

  ```
  PATCH /api/v1/data/crm_quote/<id> {"status":"presented"}
  → 400 VALIDATION_FAILED  "Contact is required"   (quote stays draft)
  ```

  Drafting is unchanged: a `draft` or `in_review` quote still needs no recipient,
  which is what lets `quote_generation` quote a contact-less opportunity. The two
  states a quote can reach _without ever being sent_ are deliberately not gated —
  `expired`, written by the nightly `quote_expiration` sweep over never-sent
  drafts, and `rejected`, legal straight out of `in_review`.

- a7aaf87: Quote line items now carry the same 60% discount ceiling as the quote itself.

  The hard ceiling shipped for **Discount %** on a quote constrained only one of the two percentages that decide a quote's total. A quote's price applies them in sequence — each line is discounted, the lines are summed, and only then does the quote's percentage come off that sum — so a quote sitting at 0% with every line at 90% off priced 90% below list and cleared the quote-level rule outright. The rule read as a guarantee it did not deliver.

  A line whose **Discount %** exceeds 60 is now refused on save with _"Line discount cannot exceed 60%"_. It is an invariant, not a checkpoint: it is evaluated on every save of the line, so a line stored above the ceiling before this release is refused on its next edit until its discount comes down — lowering it is always allowed. The wording differs from the quote-level _"Discount cannot exceed 60%"_ so a refused save says which of the two numbers to bring down, and both come from the one `QUOTE_DISCOUNT_CEILING` constant, so the two ceilings cannot drift apart.

  Nothing HotCRM ships is affected — the deepest discount in its demo data is 20%.

  Not changed, and worth knowing: 60% per line **and** 60% on the quote still compounds to roughly 84% off. Each rule caps one multiplier; whether the ceiling should be read against the effective discount is an open product question tracked separately.

- 7e20966: Write the "what happens when a quote is accepted" step against the hooks, in all
  three languages. `content/docs/sales/quotes.mdx:71` (and its zh-Hans / zh-Hant
  twins) listed four consequences of marking a quote _Accepted_; two of them are
  not on that chain at all, and both fail in the quiet direction — nothing errors,
  the reader simply believes the system already did it.

  **The account is not promoted at acceptance.** Moving an account from _Prospect_
  to _Customer_ is a write in `contract_on_activation`
  (`src/objects/contract.hook.ts`), an `afterUpdate` hook that runs only when a
  contract's status _becomes_ `activated`. What `quote_on_accepted` inserts is a
  **Draft** contract, so after an accepted quote the account is still a _Prospect_
  and stays one until somebody activates that contract. The page now says which
  step owns the promotion, and that the contract acceptance produces is a draft.

  **There is no 60-day renewal task.** The activation-time task that hardcoded a
  60-day notice was deleted — the comment at `src/objects/contract.hook.ts:121-124`
  records why: renewal reminders belong to the `contract_renewal` scheduled flow,
  which reads `activated` contracts only and honours each contract's own
  `renewal_notice_days` (`src/objects/contract.object.ts`, default **30**). A
  contract sitting in _Draft_ is invisible to that sweep and gets no reminder at
  all. The page now points at the daily sweep and the per-contract notice window
  instead of a fixed 60 days, and links to `content/docs/revenue/contracts.mdx`
  for the full description of both.

  The two consequences that do hold are kept and written out at the level of detail
  the Contracts page uses: the drafted contract's status, type, 12-month term from
  today, and the account / primary contact / related opportunity / owner / total
  price copied off the quote; and the close-won write on the linked opportunity,
  dated today, stamping `quote_accepted` as the win reason only when the rep
  recorded none. The old "with the quote's terms" is replaced by that explicit
  list rather than restated.

  The closing note tells a rep to put the contact and the opportunity on the quote
  before accepting it, because the drafted contract requires a **Primary Contact**
  and the close-won step acts on the quote's opportunity — the links are copied,
  never invented. Matching the Contracts page, acceptance is described as the
  action that drafts a contract, not as a guarantee that one always appears.

  Documentation only — no metadata, hook or flow changes. Whether accepting a
  quote should activate the contract outright remains a product decision and is
  untouched here.

- 67bf947: The Traditional Chinese quotes page now names the `expired` quote status the way
  the shipped locale pack does.

  `content/docs/sales/quotes.zh-Hant.mdx` called the status 「已到期」 in its status
  table and again in the daily-sweep bullet, while `crm_quote.status.options.expired`
  in `src/translations/zh-CN.ts` is 「已过期」 — 「已過期」 in traditional script. The two
  are not the same word (到期 is a deadline arriving, 過期 is having lapsed), so a
  reader following the page looked for a status the screen never shows. Same defect
  class as the `presented` alignment shipped earlier, on the one status that survived
  it.

  Both status-name occurrences now follow the locale pack. The page's third mention —
  the standard-list-view section explaining that the nightly sweep flips a quote to
  已過期 — already used the pack's wording, so the page had been contradicting itself
  as well as the product.

  Verb and field usages are deliberately left alone, because they are not the status
  name: 「自動到期」 in the frontmatter describes the expiry mechanism, 「每日到期掃描」
  names the nightly sweep, and 「到期日期」 is the shipped label of the
  `expiration_date` field (`src/translations/zh-CN.ts`).

  Docs follow the locale pack rather than the other way round, so nothing under
  `src/` changed.

  Fixes #793.

- f1f075c: State HotCRM's positioning claim as the two measured numbers the gate prints,
  and hold the README to them (#1187).

  The README banner sold the app as "~170k tokens of typed ObjectStack metadata
  (~18,000 lines)". Both figures were a hand measurement of a tree that had since
  moved, and nothing anywhere could have noticed — the number a reader meets first
  was the one number in the repo with no source. It now reads as the two layers
  the maintainer asked customers to be shown, each taken from
  `scripts/check-source-token-ratchet.mjs`:

  - **business semantics** ~81k tokens — objects, flows, actions, hooks: every
    business rule an agent must hold to change behavior safely;
  - **interaction layer** ~39k tokens — views, pages, dashboards, app shell.

  Translations and seed data stay outside the count, by the maintainer ruling that
  set the accounting basis (「translations + seed 肯定是不需要算 token 的」): a fifth
  locale is healthy growth, not business logic, and must never compete with it for
  the budget. The banner says so, so a reader comparing the figure against the size
  of `src/` is not quietly misled.

  The claim is now self-defending. `test/docs-drift.test.ts` parses both figures
  out of the banner and compares them against a live `--json` run of the gate, so
  the next drift fails CI instead of surviving to the next audit. The band is the
  maintainer's already-ruled 5% working buffer (「给 5% 缓冲」) rather than a fresh
  tolerance invented for the README — the same 5% the ratchet's ceilings carry. That
  is what keeps this a fix and not a recurring chore: the measurement moved
  80,411 → 80,356 → 81,233 → 80,767 in one working day as four ordinary PRs landed,
  crossing the ~80k/~81k rounding boundary twice, and a rule demanding the banner
  equal today's rounded reading would have required a README PR for each. Under the
  ruled buffer the banner and the ratchet ceiling go stale at nearly the same
  reading, so re-stating the claim is a maintainer decision rather than merge
  overhead.

- 252723a: Run action and hook bodies through the REAL QuickJS sandbox in tests. The
  action side had no sandbox harness at all — `test/global-actions.test.ts` ran
  each `body.source` through `new Function`, which proves what a body computes
  and is structurally blind to everything the runtime imposes on it: no module
  scope, a JSON-only boundary, a capability gate, and a `ctx.api` the engine
  builds rather than the author. `test/helpers/action-sandbox.ts` now hands the
  same bodies to the runtime's own `QuickJSScriptRunner` +
  `actionBodyRunnerFactory` / `hookBodyRunnerFactory`, over an ObjectQL-shaped
  recording engine whose update contract is pinned against a real kernel on the
  in-memory driver. `test/action-sandbox.test.ts` executes all seven script
  action bodies, asserts the capability gate denies an undeclared capability, and
  turns `src/objects/_line-item-price-fill.ts`'s comment-only constraint — the
  shared factory is safe only while the handler body never reads a factory
  parameter — into an executable guard, with a negative control that fails when
  it is violated. Refs #575.
- 5928289: Give the record-change flows the execution identity the scheduled ones already
  had, so system-driven writes stop silently losing their automation — including
  an approval gate that a machine-created deal could walk straight through.

  A flow's `runAs` decides who its data operations execute as. Under the schema
  default `'user'`, a run that resolved **no trigger user** has no identity to
  scope to, so the engine refuses its data operations rather than run them
  unscoped. The part that was missed here is that "no trigger user" is not a
  schedule-only condition: a record-change flow is fired by a **write**, and a
  write made without a session — seed loading, an integration or webhook, or
  another `runAs: 'system'` flow's own write — carries no user into the run it
  triggers. Ten scheduled flows had already been given `runAs: 'system'`, each
  with an authored comment saying exactly that; all seven record-change flows
  were left on the default. The platform's build-time lint cannot close the gap,
  because whether a record-change trigger carries a user is only knowable at run
  time.

  Measured on `@objectstack/*` 17.0.0-rc.2, driving the real automation engine
  with no trigger user:

  - **`case_escalation`** (and its insert-time twin) died at its first data node
    with `[runAs] refusing a data operation`. A case raised by the seed loader or
    an integration kept its critical priority forever — a freshly seeded org had
    never once run this automation over its own data.
  - **`opportunity_approval`** (and its twin) died the same way, at
    `get_opportunity`, before the approval request was ever opened. A $150K
    renewal created by the `runAs: 'system'` contract_renewal sweep therefore sat
    at `approval_status: 'not_required'`, unlocked, with no approval on record.
    An approval control that engages only for logged-in writers is not a control.
  - **`lead_assignment`** died at its SLA stamp, so a lead arriving from
    web-to-lead, a CSV import or a partner integration got no follow-up date and
    no alert at all.

  All seven record-change flows now declare `runAs: 'system'` with a per-flow
  rationale in source. The declaration elevates the **user-driven** runs too, so
  that is argued per flow rather than assumed: every data node in these flows is
  keyed to `{record.id}` — the row that just fired the trigger — so user scope
  adds no restriction that matters while adding a failure mode (a rep who may
  create a lead, or an agent who may raise a case, is not thereby granted edit
  rights on it), and for `opportunity_approval` the submitter's own scope is
  positively the wrong identity for a gate that exists to constrain the
  submitter. No flow in this set relies on the triggering user's restricted scope.

  The issue's premise held for three of the seven; the remaining four
  (`contact_welcome`, `task_urgent_alert`, `opportunity_won_alert`,
  `case_csat_followup`) were measured **not** refused, and that measurement is
  recorded rather than papered over. They are notify-only, the refusal covers
  `get`/`create`/`update`/`delete` record nodes, and `notify` dispatches through
  the messaging service without a run data context — so a user-less run of those
  completes and delivers today. They carry the declaration anyway because the
  decision worth recording is "record-change automation runs as the platform",
  not "this flow currently happens to have no data node": the day one gains a
  data node it inherits an elevation that was reasoned about, instead of
  discovering a refusal in production.

  Pinned two ways so the gap cannot return. `test/actions-flows-integrity.test.ts`
  enumerates record-change flows **from the compiled stack** — not a hand-kept
  import list — and requires each to declare `runAs: 'system'` with an authored
  rationale beside it. `test/flow-record-change.test.ts` runs the real engine
  with no trigger user and asserts the writes land, with the pre-fix shape
  reproduced on demand (`runAs` stripped) so the assertions cannot pass by
  producing nothing. Refs #684, ADR-0049.

- 549e038: Business refusals now reach REST as refusals, not as server faults. Every guard
  in this app threw a bare `Error`, and the platform's error mapper reads exactly
  two properties off a thrown error — `code` and `status`. With neither set, a
  deliberate refusal ("this quote is frozen", "this account still has open
  opportunities") was classified `500 / INTERNAL_ERROR`. A REST consumer could not
  machine-distinguish a business rule from a crashed server; the only signal was
  the message string, which is prose, is localised in places, and is precisely the
  part of a refusal that is meant to change.

  Seventeen guard sites across ten `*.hook.ts` files now carry an envelope, drawn
  from one declared vocabulary in `src/objects/_refusal.ts`:

  | class               | code                | status | guards                                                                                                                                                    |
  | ------------------- | ------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `invalid_value`     | `VALIDATION_FAILED` | 400    | website format, non-negative revenue, campaign date order, campaign `in_progress` dates, contract term vs range, list price vs cost, reminder vs due date |
  | `duplicate`         | `DUPLICATE_VALUE`   | 409    | contact email within an organization                                                                                                                      |
  | `locked`            | `RECORD_LOCKED`     | 409    | converted lead, closed opportunity, accepted/rejected quote, activated contract end-date                                                                  |
  | `delete_restricted` | `DELETE_RESTRICTED` | 409    | customer account with open opportunities, referenced contact, referenced product                                                                          |
  | `prohibited`        | `FORBIDDEN`         | 403    | Do Not Call, on tasks and on events                                                                                                                       |

  The codes are the platform's own `ErrorCode` members, not an app dialect: the
  mapper only echoes a code it recognises, and demotes anything else to
  `declaredCode` while deriving the branchable `code` from the HTTP status. `403`
  rather than a `409` for Do Not Call is deliberate — a conflict invites a retry,
  and a compliance flag must not be auto-retried.

  Refusal wording is unchanged. The phrasing is a contract in its own right and
  every existing pin on it still holds; the envelope is added alongside, never
  instead. One throw is deliberately left bare: `quote_on_accepted` reports a
  failed close-won cascade the user neither caused nor can act on, and `500` is
  the right answer for it.

- 4705aed: Correct what `src/views/event_attendee.view.ts` claims a detail-page related
  list reads, and pin the metadata that actually curates one.

  The file header justified the attendee grid and form with a mechanism it stated
  as fact — "the related list renders THIS view's columns, and the quick-create
  modal renders THIS form … for the same reason `crm_campaign_member` has them" —
  and it was the only written account of that rendering path in this repo.
  `crm_campaign_member` has no view metadata at all, so the cited precedent was a
  counter-example, and #944 asked which half was wrong. Measured against the
  shipped Console (17.0.0-rc.3), the answer is the mechanism:

  - **A related list never reads the child's `list` view.** It takes its columns
    from the child's lookup field (`relatedListColumns`, authored nowhere in this
    app), then falls back to the child object's `highlightFields` minus the lookup
    the panel is scoped by, capped at six, with columns that are empty on every
    fetched row dropped. Only an object with no `highlightFields` reaches a
    heuristic over the whole field map — which is title-ish names first and audit
    columns last, not "every column in declaration order".
  - **The `form` half is real.** The Console merges a view bundle's `form` onto
    the object definition, and the drawer a related list opens renders its
    sections. What it buys is the section split and the field order: with no form
    the drawer already drops `autonumber`, `formula` and `summary` fields in
    create mode and sections the rest by the object's own `fieldGroups`, so the
    raw autonumber was never on offer.

  So the campaign detail page's **Campaign Members** panel is not degraded and
  never was: it renders Lead / Contact / Status / Response Date off
  `crm_campaign_member.highlightFields`. Adding a member view would not have
  changed one column of it. Nothing user-visible changes here — the header is
  rewritten to what was measured, and `test/view-references.test.ts` now pins the
  load-bearing metadata for every object reached only through a parent (the two
  junctions and the two line items): `highlightFields` must exist, resolve, and
  survive dropping the panel's own scope field, so that deleting it — the one
  change that really would leave a panel leading with `CM-00001` — fails a test
  instead of shipping.

  Refs #944.

- b8a0568: Remove legacy string `rowActions` entries that duplicated `list_item` auto-injection.

  Actions declaring `locations: ['list_item']` (`convert_lead`, `schedule_followup`, `generate_quote`, `escalate_case`) auto-inject their row-menu entries. Naming them again as `rowActions` strings went through objectui's legacy path, which dispatches the string as an action _type_ — producing a second, dead menu item (zero network requests plus a green success toast on click). The lead, opportunity, and case list views now keep only the built-in `edit`/`delete` affordances in `rowActions`, and a metadata guard test fails CI if a `rowActions` string ever shadows a `list_item` action again.

- 5d1e422: Move the copyright header back to line 1 in `src/objects/case.object.ts`,
  `src/objects/product.object.ts` and `src/objects/opportunity.object.ts`,
  where the `import { F, P } from '@objectstack/spec'` line had ended up
  above it.

  No behavioral change: `F` and `P` (the `cel`-tagged-template aliases for
  formula/predicate expressions) are used productively in all three files —
  `` F`...` `` for computed-field formulas, `` P`...` `` for validation
  conditions and `visible`/`requiredWhen` predicates — so the import itself
  is untouched, only its position relative to the header moves.

- cdbd863: Re-publishing an archived knowledge article no longer moves its original publish
  date, so a 2024 article put back on the shelf this year stops jumping to the top
  of the article list as if it were newly written.

  `knowledge_article_publish_timestamps` decided "is this the first publish?" by
  looking at the status the write arrived from — `previous.status === 'published'`
  — which recognises only the published → published edit as a re-publish. The
  documented article lifecycle is `draft → in_review → published → archived`, so
  the ordinary re-shelving move `archived → published` arrives with
  `previous.status === 'archived'`, fell into the first-publish branch, and
  overwrote `published_at` with the current time. The `all_articles` view sorts
  `published_at desc` and `published_articles` reads the same field, so the
  re-shelved article surfaced everywhere as the newest thing in the knowledge base.
  Archiving and re-shelving is routine content operations, not an exotic path.

  The criterion is now the existence of the date rather than the previous status: a
  write that leaves the article `published` stamps `published_at` only when the
  record does not already carry one. The date is read as
  `input.published_at ?? previous?.published_at` — the value the record would end
  up with if the handler stamped nothing — because both halves of a write can
  legitimately carry it. `previous` is the full stored row (the engine's
  `sys_fetch_previous_update` builtin fetches it unprojected), and `input` carries
  the date whenever the write supplies one — on an insert that supplied value is
  what gets stored, so an import or migration publishing records with their
  historical dates was having that history rewritten by the same branch.

  `last_reviewed_at` is unchanged and still refreshes on every write that leaves
  the article published, including a re-publish — re-shelving an article is itself
  a review, and the admin "stale article" reports depend on that stamp.

  The behaviour was already asserted, and already named correctly: the existing
  test carried `'republishing must not move the original publish date'`. It fed
  `previous: { status: 'published' }` — the one arrow the old implementation
  handled — so it stayed green while the invariant it names was broken on the
  other one. The suite now pins every arrow that ends on `published`, including
  the archived article that never shipped (no original date to keep, so publishing
  it really is a first publish).

  This is the single-record path only; the bulk (`multi: true`) path, where the
  engine hands hooks no `previous` at all, is tracked separately in #779. Two
  adjacent engine behaviours found while measuring this are filed as #788 and
  deliberately not papered over here: `readonly: true` is not enforced on the
  insert path, and on the update path the read-only strip removes the
  caller-supplied key along with anything a hook wrote there. Both behave
  identically before and after this change.

  Fixes #780.

- 0437c9f: Require a changeset on every PR, and make `pnpm changeset` actually runnable.

  `CONTRIBUTING.md` has always asked for changesets, but nothing enforced it and
  nothing installed the tool: `@changesets/cli` was absent from `devDependencies`,
  so `pnpm changeset` failed outright, and `.changeset/config.json` still carried
  `ignore` and `linked` entries for `@hotcrm/core` / `@hotcrm/server` / `@hotcrm/*`
  — none of which resolve now that #502 made this a single-package repo. Changesets
  treats an unresolvable entry as a hard validation error, so `changeset status`
  could not run at all.

  Now: the CLI is installed with `changeset` / `changeset:version` /
  `changeset:status` scripts, the stale config entries are gone, and a
  `Changeset Check` workflow fails any PR that adds no `.changeset/*.md` file
  (diffed against the PR base, so entries already awaiting release can't mask a
  missing one). PRs that genuinely ship nothing carry the `skip-changeset` label;
  Dependabot applies it automatically.

- 1713fb7: Retired the `crm_opportunity.competitors` placeholder picklist — the field whose
  entire option set was the invented `Competitor A` / `Competitor B` /
  `Competitor C`, shipped as production metadata and translated into all four
  locale packs.

  Measured before removing it: the field had no reader anywhere in the app — no
  list-view column, filter, detail-page section, dashboard, report, dataset, flow,
  hook, validation rule or AI skill named it — and no seed row ever set a value.
  Its only surface was one slot on the opportunity edit form, so a rep could fill
  it in and never see it again. Re-spelling the options would have kept a
  write-only field alive; giving it a display surface would have been new
  capability, which the ruling on #1061 excluded.

  What competitive data the app keeps is unchanged and now honestly documented:
  the `Lost to Competitor` closed-lost reason with the free-text `Loss Details`
  beside it.

  Also in this change:

  - The `competition` field group ("Competition & Campaigns") held nothing but
    `competitors` and the campaign lookup, so it is now `campaign` / "Campaigns"
    in the object and in all four locale packs.
  - The docs no longer claim the Copilot consumes competitor data: two pages said
    the AI reads this field to surface win strategies, and `src/skills/` never
    named it.
  - New guard `test/placeholder-picklist-options.test.ts` fails on any option
    label shaped like a serial placeholder (`Vendor A`, `競合 A`), in the object
    metadata or in any locale pack, and pins the retired field out of both.

- 18d0284: Point the Approvals docs at the approval centre, the screen the Inbox entry now opens.

  The **Approvals › Inbox** sidebar entry was re-pointed away from the
  `sys_approval_request` object list — a read-only table with no Approve/Reject — to
  the platform's approval centre (`componentRef: 'approvals:inbox'`). The label and
  the entry id did not move, only the destination, so six documentation pages kept
  describing a screen the sidebar had stopped opening:

  - `content/docs/revenue/approvals.{mdx,zh-Hans,zh-Hant}` said the item "pins no
    view of its own, so it opens the object's list", and tabled the four built-in
    views as the filters a reader would meet there.
  - `content/docs/revenue/index.{mdx,zh-Hans,zh-Hant}` introduced the entry as "the
    approval requests waiting on you (`sys_approval_request`)" — a parenthetical
    naming the object the entry used to open.

  All six now describe the approval centre: its three tabs (**My Pending** /
  **Submitted by me** / **All**) and its separate **Status** filter over _All
  statuses_, **Pending**, **Approved**, **Rejected**, **Recalled** and **Returned
  for revision** — each label verified against the shipped console bundle rather
  than paraphrased.

  The four built-in views are **not** deleted. They are real and still shipped by
  the approvals plugin on the object; they are simply no longer what **Inbox**
  opens, so they keep a section of their own, and the pages now carry a collision
  table — because **My Pending** and **All** appear on both sides verbatim, and a
  half-right table is worse for a reader than a plainly wrong one. The centre's
  **Submitted by me** tab is called out against the phantom _Submitted by Me_ it
  differs from by one capital letter.

  `test/docs-revenue-approvals-navigation.test.ts` gains the pin that would have
  caught this: the sentence each page must carry is keyed on the nav entry's own
  shape, read off `src/apps/crm.app.ts`, so re-pointing the entry without rewriting
  the pages fails loudly instead of shipping quietly. The centre's labels are pinned
  against the installed console bundle, and `revenue/index` — previously pinned by
  nothing at all — is covered too.

- 9db63a3: Write the approvals page's _Where to find pending approvals_ section to the app's
  real navigation, so it stops contradicting the overview page next door.

  `content/docs/revenue/approvals.mdx` carried the same phantom sidebar the revenue
  overview carried until #943: an **Approval Requests** item with three filter views
  and an **Action History** item. The **Approvals** group in `src/apps/crm.app.ts`
  holds exactly one child, labelled **Inbox** (待我审批 in Simplified Chinese), and
  the group is collapsed by default. Each wrong name is now recorded rather than
  quietly deleted, because they were wrong in three different ways:

  - **_Approval Requests_** is not a navigation entry — but the name is not
    invented either: it is what the approvals plugin calls the **object**
    (`sys_approval_request`, plural label _Approval Requests_). The section says
    where the name really lives instead of claiming nothing carries it.
  - **_Pending My Approval_**, **_Submitted by Me_** and **_Recently Approved_**
    match nothing in `src/` and nothing in the installed approvals plugin, under
    any spelling — they never existed. What does exist are the four built-in list
    views the plugin ships on the request object, which the **Inbox** item pins
    none of and therefore opens all of: **My Pending**, **I Submitted**,
    **Completed** and **All**. The section now names those, so a reader looking for
    "requests waiting on me" finds the tab that does it.
  - **_Action History_** names no sidebar item anywhere in the app. The audit trail
    itself is real — every action is stored as `sys_approval_action`, with its own
    **Recent** / **By Actor** / **All** views and a `request_id` lookup back to its
    request — so what is missing is only the way in.

  All three locales updated; `src/` untouched. `test/docs-revenue-approvals-navigation.test.ts`
  pins both halves: the section must name every list view the plugin ships (so a new
  view cannot land while the prose goes stale) and must keep all five wrong names
  with their denial, while the source side pins the single **Inbox** child, its
  absent `viewName`, the zh-CN label, and the zero-hit status of the three phantom
  view names — so a future plugin release that ships a view by one of those names
  fails a test instead of silently making the page right again by accident.

- 2b750ff: Write the revenue overview page's _Where to find things_ section to the app's real
  navigation. `src/apps/crm.app.ts` has no **Products** group at all — the catalog's
  only sidebar entry is `nav_product`, labelled **Products**, under **Marketing** —
  and `group_approvals` carries exactly one child, labelled **Inbox**, not the three
  items the page listed. So the section now sends readers hunting for a Products
  group to **Marketing** (linking `content/docs/marketing/index.mdx`), keeps
  **Contracts** where it really is under **Sales**, names the approvals item by its
  real label, and records what happened to the two phantom entries instead of
  deleting them silently: no sidebar item anywhere is called **Action History** (the
  audit trail exists as the plugin object `sys_approval_action`, reachable from no
  navigation entry), and **Processes** was removed on purpose because no
  `sys_approval_process` object exists in any installed plugin, so its
  `requiresObject` guard hid it on every install. It also notes that **Marketing**
  and **Approvals** are collapsed by default, unlike Sales, My Work, Activity and
  Service. All three locales updated; `src/` untouched.
- 23dacc9: **Ten documentation pages promised a permission this app does not grant.** They taught the "role hierarchy" as a visibility mechanism — _"only the owner and people above them in the role hierarchy can see them"_, _"managers see their team's records"_, _"all service managers and their subordinates"_ — while ADR-0090 D3 removed the parent links between positions. Positions are flat: **nothing rolls up**, and every rung that needs a record is named by its own sharing rule. That is why `opportunity_executive_sharing`, `case_director_sharing` and `campaign_leadership_*` exist beside the manager-rung rules instead of inheriting from them.

  The failure mode is what makes this worse than stale naming: an admin who puts a user in `sales_manager` expecting them to pick up their reps' accounts gets no error and no records — the list is simply empty. `administration/sharing-and-security` has said the truth since it was written, so the two pages contradicted each other and a reader had no way to tell which one to believe.

  Every page now says what the app does, in all three locales. `reference/glossary` gains a **Position** entry and rewrites _Hierarchy_, _Role_, _Sharing rule_ and _User_ around it — _Hierarchy_ now separates the account hierarchy, which is real, from the reporting hierarchy, which is not. `reference/security-and-compliance`'s authorisation table lists **Positions** instead of a role-hierarchy layer. `sales/accounts`, `sales/opportunities`, `service/cases`, `service/sla-and-escalation` and `sales/forecasting` name the rules and positions that actually grant the access — including the paired rules, which only make sense once the reader knows nothing rolls up. `sales/forecasting` also corrects _why_ a sales manager sees every forecast: the Sales Manager profile holds _View All_ / _Modify All_, so the reach is org-wide, never a territory slice. `administration/setup`'s day-two checklist stops asking admins to confirm an "Executive → Directors → Managers → Reps" hierarchy that does not exist.

  A new wording guard (`test/docs-role-hierarchy.test.ts`) holds the docs there. It bans the term and — separately — the rollup promise written without it (_subordinates_, _below them in the hierarchy_, 「层级中位于其之上」), because the issue's own inventory was a grep for `role hierarchy` and three locales of `service/sla-and-escalation` were invisible to it. Bare _hierarchy_ stays legal: account hierarchy is a real feature. The platform's `in role hierarchy` filter operator is exempt as a quoted token, not as a page.

- ea11514: Correct the skill count on two pages, and stop attributing the four forecast
  buckets to the revenue-forecasting skill.

  **Skill count (#897).** `src/skills/index.ts` registers six skills — Live Data
  joined the registry and the docs never caught up. The capability table in
  `content/docs/index.mdx` still said "5 skills" and its parenthetical list omitted
  Live Data entirely, which is the odd one to lose: Live Data is the skill behind
  Wow #1. It now reads six, with live data named first, matching the order in
  `content/docs/ai-copilot/skills.mdx`. The Sales Copilot / Service Copilot names in
  that same table cell are untouched — they belong to a separate open question about
  persona naming.

  On `content/docs/ai-copilot/sales-copilot.mdx` the "Where the personas went" note
  said the capability "lives in five skills registered through `src/skills/`". The
  subject there is the registry, which holds six, but the page itself documents five
  sales-side skills and numbers them 1–5, so writing "six" would have replaced one
  mismatch with another. The sentence now carries no count at all, which is exactly
  what the parallel note on `content/docs/ai-copilot/service-copilot.mdx` already
  says in all three languages.

  **Forecast buckets (#898).** The forecasting section presented **Closed / Commit /
  Best Case / Pipeline** as what the skill returns, with probability thresholds
  attached to two of them (Commit above 80%, Best case 40–80%). None of that is the
  skill. `src/skills/revenue-forecasting.skill.ts` groups by stage, computes weighted
  value as amount × probability, names at-risk deals with the signal behind each, and
  gives the forecast as a range from commit-only to full weighted pipeline, optionally
  with a chart. It never reads `forecast_category`.

  The four names are real and the page now says where they live rather than dropping
  them: they are options of `crm_opportunity`'s **Forecast Category** field, and the
  amounts carrying those names are written onto **Forecast** records by the scheduled
  forecast snapshot in `src/flows/forecast-snapshot.flow.ts`. The probability
  thresholds had no source anywhere — the snapshot buckets by forecast category, not
  by probability band. Two smaller claims in the same section go with them: "missing
  close dates" was never one of the skill's risk signals, and the manager tip asking
  _"Which reps need coaching?"_ described a per-rep rollup the skill does not do —
  stage and the user's period are its only groupings, so that tip now asks for
  slipping deals and says plainly what the skill will not answer.

  Documentation only, all three locales. This brings the page into line with the
  skill rows already written in `content/docs/ai-copilot/skills.mdx`, which had been
  describing the same skill differently since those rows landed. Refs #897, #898.

- 881dd67: Sales docs: describe the contact opt-out flags, the lead score and the Chinese
  `presented` quote status as they actually ship.

  Three sections of the sales pages (and their zh-Hans / zh-Hant siblings)
  described a product surface that does not exist, so a reader following them went
  looking for fields and behaviour they could never find:

  - **Contacts** advertised a fax field and a _Fax Opt-out_ flag. `crm_contact`
    has neither `fax` nor `fax_opt_out`; both rows are removed rather than
    answered with new fields, since whether HotCRM should carry a fax number is a
    product decision and not something a docs page gets to settle. The two flags
    that do exist are now split by how far they are actually enforced:
    `email_opt_out` hides the **Send Email** action and suppresses the
    contact-created welcome prompt to the owner, while `do_not_call` is a marker
    that nothing in the product reads — the
    page had claimed it blocks logging a _Call_ task. The "admin-only, reps can
    only request a change" sentence is gone too: no profile declares field-level
    permissions on either flag, so every rep who can edit the contact can clear
    them.

  - **Leads** described a 0-100 score plus `budget` and `timeline` fields. There
    is one quality field, `rating` — labelled _Lead Score_, a 1-5 star rating —
    and the scoring section is rewritten against `computeRating` in
    `lead.hook.ts`: the real weights (email domain, phone, senior title, industry,
    headcount, revenue), rounding to whole stars, and the two limits the old text
    hid — it runs on **create only** and never overwrites a rating the caller
    supplied. The SLA table now matches `lead-assignment.flow.ts`: four stars or
    better is due **tomorrow** (`TODAY() + 1`) with an inbox **and** email alert,
    everything else in three days with an inbox alert. Nothing extra happens at
    five stars, and no lead ever scores 0.

  - **Quotes (zh)** translated the `presented` status as 「已呈现」/「已呈現」
    while the shipped `zh-CN` locale pack calls it 「已提交」, so a Chinese reader
    could not match the word in the docs to the word on screen. The pages follow
    the locale pack, on the status table and in every sentence that names the
    status.

- 440db01: Rewrite the "Standard list views" section on the Accounts, Leads, Contacts and
  Quotes documentation against the views those objects actually ship.

  Same defect as the Opportunities page fixed in #757, on four more pages (and
  their zh-Hans / zh-Hant siblings): the rosters were invented. Accounts listed
  _All Customers_, _Top Accounts by Revenue_, _Inactive Accounts_, _By Industry_
  and _Recently Updated_ — none of which exist — while never mentioning the five
  views that do: **Account Cards**, **Accounts by Location**, **Enterprise
  Accounts**, **🔄 Upcoming Renewals** and **⚠️ At-Risk Accounts**. Contacts and
  Quotes each advertised five views where only three exist. Leads advertised five,
  of which one was real, and hid three working queues plus the kanban, calendar
  and gallery views. A reader looking for any of those names in the product found
  nothing under it, and the queues with the most business value were the ones
  nobody was told about.

  Each page now carries the real roster measured against its `*.view.ts`
  declaration — what the view filters on, how it sorts, and where it is reached
  from — plus the behaviour that makes an empty list readable:

  - **Accounts** — seven views. The two customer-success queues get their own
    note: both are scoped to **Type = Customer** before anything else, and both
    read hand-maintained fields (Health Score has no default, Next Renewal Date
    can be blank), so an empty _At-Risk Accounts_ is missing data rather than a
    broken filter. Also corrected: **Enterprise Accounts** is a revenue cut
    (Annual Revenue ≥ $10M), _not_ the Customer Tier field — an account tiered
    _Enterprise_ at $5M is not in it; and the map plots **Office Location**, not
    the billing address.
  - **Leads** — eight views, the full switcher. **🔥 Hot Leads** is documented as
    it behaves: its cut is 4.5 stars against a whole-star rating, so it is the
    5-star queue, and a 4-star lead is on **High Priority** — the old page called
    Hot Leads "rating ≥ 4 stars", which is the other view's filter. The rep tip
    that pointed at a nonexistent _Today's Follow-ups_ view now says what the
    Next Follow-up Date really drives: the sort order of Hot Leads, stamped
    automatically on intake (tomorrow at 4+ stars, three days otherwise) and
    re-stamped by **Schedule Follow-up**.
  - **Contacts** — three views, with the account-grouped default explained and a
    plain statement that no owner-filtered view exists, since contact visibility
    follows the account anyway.
  - **Quotes** — three views, none of them filtered, and why that works: status is
    the filter (the nightly sweep keeps _Expired_ honest) and Expiration Date is
    sortable. A fresh org has no quotes at all until the first **Generate Quote**,
    and these views declare no empty-state text, so the page says an empty grid is
    expected there.

  English pages use the metadata labels; the zh pages use the names from the
  zh-CN locale bundle.

  Fixes #758.

- e6e43be: Declare the write depth `sales_manager` actually means on `crm_contract`, so
  the permission table stops describing a reach the metadata never asked for.

  `crm_contract` is private with an owner, so editing one takes two doors. The
  object-level `allowEdit: true` opened the first. The second is record-level: the
  sharing layer asks whether the record's owner falls inside the caller's write
  DEPTH, and with `modifyAllRecords: false` and no `writeScope` authored, that
  depth defaults to `own`. So a Sales Manager could edit only the contracts they
  had created themselves — while the contract that matters most belongs to a rep,
  because accepting a quote drafts a contract and copies the quote's owner onto
  it.

  `sales_manager` now carries `writeScope: 'own_and_reports'` on `crm_contract`,
  with the matching `requires: ['hierarchy-security']` on the stack. The two are
  one declaration: `defineStack` refuses the grant outright without the
  capability, so they move together or not at all. `own_and_reports` rather than
  `unit_and_below` because the two resolve through different data — `unit*`
  through business units, `own_and_reports` through the manager chain — and the
  reporting line is what "a manager reaches their team" means here.

  **What this changes per edition.** The depth is an ADR-0057 hierarchy scope,
  resolved by the `hierarchy-scope-resolver` service that ships in ObjectStack
  Enterprise:

  - **Enterprise** — the resolver is present, and a Sales Manager can change a
    contract standing in a rep's name: its dates, value or status, termination
    included.
  - **Open edition** — no resolver, so the scope narrows safely to owner-only and
    a Sales Manager still cannot edit a rep's contract. Those changes remain a
    System Administrator's job, exactly as before this change.

  Nothing about an open-edition deployment's behaviour moves, so no existing
  install changes what it permits. Read access is untouched (the profile already
  held _View All_), delete is untouched (Sales Manager still cannot delete a
  contract), and this is deliberately not `modifyAllRecords: true`, which would
  also skip row-level security and reach ownerless rows.

  `content/docs/revenue/contracts.mdx` and both localised siblings gain a _Who can
  edit which contract_ section stating the per-edition answer, and the three
  places that previously promised a Sales Manager could make these changes flatly
  now say which edition that holds on. Pinned by
  `test/contract-write-depth.test.ts`, which asserts the declaration, both
  directions of the spec gate, and the open-edition owner-only behaviour. Fixes
  #880.

- a920fc7: Write the pipeline board's kanban section to the board the app really ships, and
  put the Sales group's ninth sidebar entry back on the page whose job is to list
  them.

  **The board cannot show seven stages' worth of deals.** The kanban section of
  `content/docs/sales/pipeline-management.mdx` (and both zh pages) opened with "7
  columns — one per stage". `crm_opportunity.stage` does carry seven options, but
  this board declares its own filter — `stage not_in [closed_won, closed_lost]` in
  `src/views/opportunity.view.ts`, whose source comment says the exclusion is what
  "keeps all five active stages visible" — so _Closed Won_ and _Closed Lost_ can
  never hold a card here. A reader counting seven and finding two of them
  permanently empty had no way to tell a filter from a bug. The page now says what
  the metadata proves: one column per stage, **open deals only**, five active
  stages, with closed business named where it does live (**All Opportunities** and
  the **Sales Performance** dashboard). Whether the console draws the two closed
  stages as empty columns or leaves them off is the renderer's choice, not this
  app's declaration, and the page now says that rather than guessing a number —
  the conservative shape `content/docs/sales/opportunities.mdx` already uses.

  **There is no owner avatar on a kanban card.** The card list ran to five items,
  ending in _Owner avatar_. Cards are bound by `kanban.columns`, which names four
  fields — name, account, amount, close date. `owner_id` is in the view's
  top-level `columns`, which is what the grid renderings read, and it is nowhere
  on the card. The list is now four, and the owner is re-pointed to the two
  surfaces that genuinely carry it: the _Owner_ column on **All Opportunities**,
  and the **Deal Cards** gallery, whose `visibleFields` include it.

  **The stage rules are advice, not a gate.** The page told a rep "the system
  enforces the stage rules, so you can't drag from _Prospecting_ directly to
  _Closed Won_". `opportunity_stage_progression`
  (`src/objects/opportunity.object.ts`) does declare that transition illegal, but
  at **warning** severity: the move writes one line to the server log and **the
  save still goes through**. `content/docs/administration/state-machines` has said
  exactly that — naming this very transition — since the state-machine sweep; the
  two pages contradicted each other and this was the one that was wrong. Its
  wording now matches, and it links there.

  **The cadence table's _Open Pipeline Kanban_** named nothing in the product.
  `Pipeline Kanban` is a camel-case reading of the identifier `pipeline_kanban`;
  the view's label is **Sales Pipeline** and the sidebar entry that opens it reads
  **Pipeline**. The daily row now sends a reader to **Pipeline**, matching the
  correction the same section's opening paragraph already carries.

  **Account Workbench was missing from the sales index.** The _Where to find
  things_ section of `content/docs/sales/index.mdx` listed eight of the Sales
  group's nine entries. The missing one is **Account Workbench**
  (`src/pages/account_workbench.page.ts`) — an interface page sitting third in the
  group, with a real label in every locale bundle — so the page told a new reader
  it does not exist, or that the sidebar they were looking at was broken. The same
  question was already answered correctly one page over, in
  `content/docs/getting-started/quick-tour.mdx`, which lists all nine. The section
  now names it, says what it is (a curated way into the same account records,
  reusing the **All Accounts** view with three quick filters and no view
  management), and states the group size.

  Two guards now hold both pages to their source, because nothing else can — `os
validate` and `pnpm lint` never open `content/docs`:
  `test/docs-sales-index-navigation.test.ts` compares the section against the
  Sales group in all three locales, and `test/docs-pipeline-kanban-section.test.ts`
  pins the kanban section's card fields, filter, active-stage count and advisory
  wording, plus the source facts each rests on. Bind an owner onto the cards, drop
  the board's filter, raise the rule to `error`, or add a Sales nav entry, and the
  docs go red with the metadata.

  Docs and tests only — no `src/` change.

- 744ba73: Scheduled sweeps now declare which organization the records they create belong
  to. The nightly renewal, stalled-deal and forecast sweeps opened tasks,
  opportunities and forecast rows with no organization set, because a scheduled
  run has no acting user and no organization for the platform to infer one from.
  In a deployment that partitions data by organization, such a row lands outside
  every partition: reports and list views scoped to an organization never show it,
  and uniqueness rules that include the organization stop constraining it.

  Each sweep now takes the organization from the record that caused the work — a
  renewal task belongs to the organization of the contract that triggered it, a
  stalled-deal nudge to the organization of the deal, and a forecast snapshot to
  the organization of the pipeline it summarises.

  No effect on single-organization deployments, where these rows correctly have no
  organization either way, and no change to any existing record.

- 71a755b: Give the _Built-in vs personal vs shared_ bullet in `guides/search-and-navigation`
  examples that exist, in all three locales.

  The bullet that teaches what a **built-in** view IS held up two names, and neither
  was a view:

  - **_All Open Opportunities_** is a splice of two real ones. The opportunity view
    set in `src/views/opportunity.view.ts` ships **Open Deals**
    (`open_opportunities` — the default, pinned tab) and **All Opportunities**
    (`all_opportunities` — the unfiltered book). A reader who went looking for the
    spliced third name found nothing and had no way to tell that the two halves
    were both there under other spellings.
  - **_Pending My Approval_** is the phantom PR #969 removed from
    `content/docs/revenue/approvals.mdx` and #960 from
    `getting-started/quick-tour`; this page was its last landing place. The
    approvals plugin ships **My Pending** / **I Submitted** / **Completed** /
    **All** on `sys_approval_request`.

  The zh pages were each wrong in their own way, so neither was fixed by
  translating the English: zh-Hans said 「待我审批」, which is real but is the
  **navigation** label of `nav_approval_requests` rather than a view; zh-Hant said
  「待我審核」, which no surface can show at all — this app ships en / zh-CN /
  ja-JP / es-ES and no Traditional Chinese pack. Both now name the real views and
  quote the zh-CN labels the console actually resolves (「进行中商机」,
  「全部商机」, 「我的待办」).

  The names were swapped without adding a denial: unlike the approvals page, this
  bullet is an _example_, not a navigation roster, so there is no wrong list for a
  reader to reconcile. `src/` is untouched.
  `test/docs-search-navigation-views.test.ts` pins it from both ends — every
  emphasised name in the bullet must be a label some view in this app or its
  plugins really carries (bold or italic, since the phantoms were italic), every
  「…」 gloss must be a string a locale pack really ships, and the source side pins
  **Open Deals** as the default tab, **All Opportunities** as unfiltered,
  **My Pending** on the plugin, and the zero-hit status of the two retired names —
  so a future release that ships a view by one of them fails a test rather than
  making the page accidentally right.

- 14d43d1: Name and translate the 66 form/detail section headings that declared only a
  `label`, so they resolve through `objects.*._sections.<name>.label` instead of
  rendering their raw English text in every locale (13 objects: account, case,
  contact, contract, event, event_attendee, forecast, knowledge_article, lead,
  opportunity, product, quote, task). Adds a structural test —
  `test/i18n-references.test.ts`: "every section with a label carries a name" —
  that walks the page/view tree directly and fails on any `sections[]` entry that
  declares a `label` with no `name`, independent of the existing translation-
  completeness assertions, which cannot see this class at all (a section with no
  `name` has no key for them to check). Refs #1100, #1018.
- dd6c732: Section headings are translated in all four locales, and the guard no longer takes its list of surfaces from a linter.

  `_sections` holds the headings above every form and detail-page group — "Basic Information", "Ownership & Status", "SLA & Priority". The metadata declares **85 of them across 15 objects**. Before this change `ja-JP` and `es-ES` carried **2 each**, so a Japanese or Spanish user read English headings on essentially every record page and form, under an otherwise fully translated UI. `en` carried 2 as well; `zh-CN` had 66 and was missing 19, including every section on `crm_event` and `crm_event_attendee` — objects added in #592 whose headings no locale had ever translated.

  ## Why a completed sweep missed an entire surface

  #679 reported all four locales complete, and `objectstack lint` agreed: zero i18n warnings. Both were wrong in the same way.

  The guard added in #679 chose its surfaces by reading off lint's warning categories — missing-option, -field, -navigation, -page, -action, -view, -widget, -object. **There is no `_sections` category.** Sections were never considered, so the guard inherited the linter's blind spot exactly and then certified the result. A locale could ship 83 English headings and report a clean bill of health from every tool pointed at it (#683).

  The correction is in how the new assertion derives its work, not just that it exists: it walks the metadata and asks what that declares, from two sources that must both be collected —

  1. every distinct `group` across an object's fields (the fields are the authority for which sections _exist_; `fieldGroups` only supplies each one's English heading), and
  2. every `sections[].name` in the page and view tree **at any depth** — detail pages nest them inside `page:tabs` → components → `properties.sections`, and a shallow walk misses precisely those. A first pass at this derivation under-counted by nine for that reason.

  A companion assertion fails if the derivation ever returns a trivially small set, so a broken derivation cannot masquerade as a passing check — the failure mode this suite already has one historical example of.

  ## Consistency the sweep forced

  Where two section keys on one object share the same English text — `crm_case.basic` and `crm_case.info` are both "Case Information", one on the form and one on the detail page — every locale now renders them identically. Where the same key carries genuinely different English across objects, the locales diverge deliberately: `assignment` is "Assignment" on `crm_lead` but "Ownership" on `crm_campaign`.

  Two metadata inconsistencies surfaced and are left for the object definitions rather than papered over in translation: `crm_opportunity`'s `crm_forecast` section is labelled "Forecast & Metrics" by the object and "Stage & Forecast" by the detail page, so one translation has to serve both screens; and `crm_event_attendee.response` means "Invitation" while `crm_campaign_member.response` means "Response Tracking".

- adeadd2: Give the nine demo accounts a billing address, so the two territory sharing
  rules match real records instead of an empty set. `north_america_territory` and
  `europe_territory` filter on `crm_account.billing_country`, and until now not
  one seeded account carried a `billing_address` for that column to be projected
  from — both rules installed correctly and then covered zero accounts, so Setup
  showed two territories with nothing behind them. The addresses partition the
  set deliberately across all three outcomes the rules can produce: six in North
  America (five US, one CA), two in Europe (DE, UK) and one outside both (SG),
  with the account phone numbers moved to match their new countries. A rule with
  no matching record is indistinguishable from a rule that never seeded, so
  `test/territory-seed-coverage.test.ts` now walks the whole chain — seed record →
  the real `account_protection` projection → the seeder's own CEL compiler → which
  accounts each territory covers — and fails when any bucket empties out.

  `billing_country` is deliberately still not authored in the seeds: hooks DO run
  over seed writes (the loader's `skipTriggers` suppresses record-change
  automation, not lifecycle hooks), so the projection is computed at seed time,
  and the seed doctrine block that claimed the opposite has been corrected.

  The seed fixtures are now split by object family — `catalog`, `sales`,
  `service`, `marketing` and `revenue` `*.seed.ts` modules with `src/data/index.ts`
  reduced to the aggregating `CrmSeedData` export. The single file was 1.5KB under
  the 100KB source-hygiene cap, so this change would not have fit; the split makes
  where-to-add-a-record follow from the object, and a new test fails if a family
  module's dataset is never wired into `CrmSeedData`. Fixes #638. Refs #635, #617,
  #621.

- eee5151: Seed the CPQ and marketing surfaces that shipped empty. A fresh install had no
  opportunity line items, no quote line items and no campaign members at all, so
  the Products related list was blank on every one of the seeded opportunities,
  no quote had a breakdown, and every campaign reported `num_sent` 0 with a 0%
  response rate and 0% ROI — the exact screens a marketplace evaluator opens
  first. This adds 65 opportunity lines across all 20 deals, 16 quote lines
  across all 5 quotes, and 51 campaign members across all 7 campaigns.

  The parent totals are now DERIVED from the child rows rather than typed in:
  each opportunity's `amount` and `expected_revenue` are computed from its line
  items with `opportunity_amount_rollup`'s own arithmetic, and each quote's
  `subtotal` / `discount_amount` / `total_price` with `quote_total_rollup`'s —
  so a seeded deal cannot disagree with its own breakdown, and editing a seeded
  line item recomputes the same figure instead of visibly correcting it. Every
  seeded currency figure is unchanged from before; they are just no longer
  independent of the rows that justify them. Campaign metrics are derived the
  same way, from membership plus the opportunities now attributed via
  `crm_campaign`, so the completion snapshot is a no-op rather than a rewrite.
  Campaign members stick to the `sent` / `responded` / `unsubscribed` lifecycle —
  the states an actual writer produces.

  Also fixes seed values that contradicted a field contract or were too thin to
  demo: a lead rated `4.5` against a whole-star field the hook rounds to integers,
  a campaign marked `in_progress` with a start date twelve days in the future, a
  four-product catalog with no costs (widened to thirteen priced products with
  margins, SKUs and billing terms), and a three-row forecast history (widened to
  eight, all additions in settled past periods so a current-period snapshot sweep
  cannot collide with them). A new `test/seed-consistency.test.ts` re-derives each
  hook's computation from the seed data and fails when a seeded parent drifts from
  its children.

- 6f6ed9a: Teach the selection key the platform can actually deliver, and drop the one
  remaining limb in the app that read the key it cannot.

  `docs/developers/code_examples.md` is the copy-paste surface for the next author
  of an action — human or AI — and its "Add An Action" example was a bulk
  enrolment body reading `input.selectedIds`. No underscore, and therefore
  undeliverable: a top-level `selectedIds` is never merged into the params bag, so
  the body reads `undefined` and the author's own "nothing selected" guard fires;
  a `params.selectedIds` is refused by the strict params gate (ADR-0104) with
  `400 Unknown action param "selectedIds" — not declared on this action`. Both
  refusals are correct, and together they read as proof that the platform has no
  multi-select channel. It has one — `_selectedIds`, a built-in action param with
  a leading underscore — and this example is where the wrong conclusion kept
  getting re-derived. It cost #508 two release candidates and a bulk button that
  shipped removed.

  The example now reads `input._selectedIds`, and — because a handler is only half
  the contract — it also shows the view-side declaration that injects the key:
  `bulkActionDefs: [{ name, operation: 'custom', execution: 'aggregate' }]`. A new
  section sets the two dispatch contracts side by side, since they are not two
  spellings of one thing: a bare-string `bulkActions: ['x']` entry is a per-record
  fan-out (N rows, N requests, each carrying that row's `recordId` and no
  selection array), while an aggregate def is ONE dispatch carrying every id in
  `params._selectedIds` and no `recordId`. The underscore trap is written up as an
  explicit callout with both 400s quoted, and the section points at the live
  reference implementation landed for #508 — `mass_update_stage` in
  `src/actions/opportunity.actions.ts` plus its def in
  `src/views/opportunity.view.ts`.

  Two further corrections the example needed to be runnable at all: it was
  `type: 'modal'` carrying a `body`, and a modal action has no server dispatch —
  the renderer just opens its `target` and the runtime refuses it over REST, so
  that body could never have executed. It is now `type: 'script'`, and the
  now-redundant `target` is gone.

  `create_campaign` in `src/actions/lead.actions.ts` carried the same
  no-underscore read as a selection-first branch with a `ctx.recordId` fallback
  behind it. That branch never executed: the lead list wires the action as the
  bare-string form, and the per-record fan-out delivers a `recordId` and no
  selection array on every dispatch. Its comment nevertheless promised, in the
  present tense, that the bulk path would "light up" once the runtime started
  passing `selectedIds` — it would not have, under that spelling, on either
  contract. The dead limb is removed and the body now reads `ctx.recordId` alone,
  which is exactly what its wiring delivers. **No behaviour change**: multi-lead
  enrolment worked before and works now, one lead per dispatch. Whether it should
  instead move to the aggregate contract is a product decision (one audit entry
  and one dedupe read per run instead of per lead, plus all-or-nothing failure
  semantics) and is deliberately left open.

  New pins: `test/docs-drift.test.ts` guards the teaching surface — the example
  must show `input._selectedIds`, must not show the no-underscore spelling, must
  show both view-side declarations, and must keep the trap callout. Text-matched
  deliberately, because a fenced code block is prose to `os validate`, `pnpm lint`
  and every metadata assertion in this repo. `test/bulk-action-dispatch.test.ts`
  pins the lead half as one contract: the body reads `ctx.recordId` and no
  undeliverable key, AND the lead list keeps the bare-string wiring that makes
  that read correct — flip either half alone and the button breaks silently, so
  either half alone turns it red. `test/action-sandbox.test.ts` gains the positive
  behaviour nail that was missing: a dispatch carrying only a `recordId` writes
  exactly one `crm_campaign_member` row for that lead.

- 9f748ab: A contact's timeline names the sender again: `send_email` now writes a
  human-readable `sys_activity.actor_name` instead of the acting user's raw id.

  This is the twin of the defect fixed for `log_call` / `log_meeting` /
  `schedule_meeting`, on the same column and with the same one-line cause. The
  body stamped `actor_name: ctx.user?.name ?? null`, and on the dispatch path the
  Console uses that key is not a display name: `@objectstack/runtime` 17.0.0-rc.2
  builds the REST action context's user as `{ id: ec.userId, name: ec.userId, … }`
  (`dist/index.js:5397`), so the key is present and carries the id — a
  plausible-looking string no `??` fallback could ever catch. Every logged email
  therefore rendered "grDEyLoIgnunJ2M7Y2muLgcuQbDUT0s2" where the sender's name
  belongs.

  The resolution block the activity actions already use is now shared source text
  spliced into both bodies at authoring time, rather than copied: an action body
  runs body-only inside QuickJS and cannot call an imported helper, so the sharing
  happens while the metadata is built and what ships is one self-contained body.
  A test executes both bodies under the real sandbox and fails if any
  `actor_name` writer stops splicing the shared block, so the two call sites
  cannot drift apart the way they did here.

  Behaviour is unchanged where the platform already delivers a name: a user object
  whose `name` differs from its `id` is believed as-is (no extra query), a missing
  or denied `sys_user` read falls back to the id rather than blanking the actor,
  and it never fails the send. The whole block retires itself once
  objectstack-ai/objectstack#5372 lands.

- dcec435: 按 flow / hook / skill 源码写实 service 三页族剩下的两组行为性失实,三语同步(#886、#890)。

  **#886 — `content/docs/service/sla-and-escalation.mdx` 及其 `zh-Hans` / `zh-Hant` 双生页**

  - **升级触发条件里那个 `High + Customer` 分支根本不存在。** 页面「何时触发升级」一节写着「Critical,**或者** High 优先级且关联账户为 Customer」,管理员提示里又复述了一遍。`src/flows/case-escalation.flow.ts` 的 start 条件全文只有一个优先级项 —— `record.priority == "critical"` —— 外加防止二次升级的 `escalated_date` / `status` 守卫;它的 insert 版孪生 `case_escalation_on_create` 复用同一条件,只把 `triggerType` 换成 `record-after-create`。全仓 24 个 flow 里没有任何一处读取账户类型或账户分层。现在写实为:只有 Critical 会自动升级;**High 工单永远不会**,无论其账户是 Customer 还是潜在客户,升级它是手动步骤(工单记录上的 Escalate Case 按钮)。管理员提示同步改为点名两个流程,并提醒改条件要两个一起改,否则新建路径仍会漏掉。
  - **兜底路径对 High 同样不生效。** `case_sla_monitor` 按 `sla_due_date` 过期扫单,但 `src/objects/case.hook.ts` 只为 `critical` 打 4 小时 SLA,其余优先级一律留空(该字段非 readonly,可以手工填)。所以一个没人过问的 High 工单两条路径都进不去 —— 页面现在明说这批工单需要人工巡检。此处只陈述当前行为,不预判 High 是否*应该*自动升级或*应该*有 SLA(#595 的产品问题)。
  - **Critical 违约行承诺的两样东西都不存在。** SLA 目标表 Critical 行写的是「工单详情上的红色横幅、向支持经理发出警报」。`grep -rn banner src/` 在整个 app 里只有 `src/objects/opportunity.object.ts` 的一句无关注释 —— 没有任何横幅机制;违约通知来自 `src/flows/case-sla-monitor.flow.ts` 的 `notify` 节点,`recipients` 只有 `{currentCase.owner_id}` 一项,节点标签就叫 `Alert Owner`。现在写实为:SLA 监控标记违约、升级工单、通过站内消息 + 邮件提醒**工单负责人**,并点名说清没有红色横幅、也不通知支持经理。

  **#890 — `content/docs/service/cases.mdx`、`content/docs/service/index.mdx`、`content/docs/service/sla-and-escalation.mdx` 及各自的 `zh-Hans` / `zh-Hant`**

  三页把「检索知识库并起草回复」「用知识库对相似历史工单做模式匹配」记在做不到这件事的技能名下:

  - `src/skills/case-triage.skill.ts` 的 `tools` 只有 `['describe_object', 'get_record']` —— 没有任何检索类工具,既检索不了文章,也拉不出相似的历史工单;
  - `src/skills/email-drafting.skill.ts` 的五步 instructions 从头到尾没有一步去取知识来源,因此草稿不会引用文章;
  - 真正读文章的是 `src/skills/customer-360.skill.ts`,它用 `query_records` 查 `status` 已发布、按工单的 category / tags 匹配的 `crm_knowledge_article`。

  三处整句按 #861 / #865 的既有口径重写:检索归 Customer 360°,起草回复归邮件撰写,并说明工单分流两件都不做。句中「Support Knowledge Base」是 #808 / #892 已清掉的虚构知识库名,链接保持指向 `/docs/service/knowledge-base`,标签改为该页的真实称谓(知识文章 / knowledge articles)。

  纯文档改动,9 个文件。未触碰 `src/**`,没有任何 flow、hook、skill、条件、收件人或字段发生变化 —— 是页面向已经在跑的行为对齐。

- 30e6306: 按 skill 与对象源码写实 `content/docs/ai-copilot/service-copilot.mdx` 三语其余段落的能力漂移残留（#860，承接 #840 / #847）：

  - **工单上的「产品」是幽灵字段**：`crm_case` 全字段里没有任何 product 字段，也没有指向 `crm_product` 的 lookup；产品挂在商机产品明细与报价单明细上。分流够得着的范围内，产品只会出现在主题/描述的文本里。
  - **邮件撰写不引用知识文章**：`email_drafting` 的 instructions 五步从未提到知识文章，因此「所有草稿都会引用支持知识文章」改为写实——草稿依据它读到的记录，需要援引文章时从 Customer 360° 拿。
  - **三条提示语的归属改正**：匹配文章的是 Customer 360°（`customer_360` 第 3 步），不是工单分流；分流只返回优先级与升级/关闭指引，因此「拒绝率＝知识库质量」的指标不成立，知识缺口信号改挂到 Customer 360°。
  - **打电话前看合同层级**：`customer_360` 的 instructions 没有枚举 `crm_contract`，改为指向客户自己的合同记录（合同类型 / 合同金额）。

  三语同步（`content/docs/ai-copilot/service-copilot.zh-Hans.mdx`、`content/docs/ai-copilot/service-copilot.zh-Hant.mdx`）。纯文档改动，未触碰 `src/**`。

- a87a139: The Customer Service dashboard has a date picker again, defaulting to the last
  90 days of case creation.

  It shipped without one from the 16.1.0 line onwards: windowing
  `crm_case.created_date` — a datetime field — produced a dashboard of zeros,
  because the driver compared an epoch-millisecond bound against ISO text
  storage, so the lower bound matched every row and the upper bound matched none.
  Both platform defects behind that are fixed and released in 17.0.0, and the
  window is now measured rather than assumed — every widget is compared against a
  ground truth computed in the same run, on a real SQLite database:

  ```
    widget                    unwindowed   last_90_days   truth
    open_cases                        43             30      30  ✓
    cases_by_origin                   51             38      38  ✓
    widgets that go blank once the window is applied: 0 of 7
  ```

  "Daily Case Volume" deliberately keeps its own fixed 30-day window and does not
  follow the picker: its title says "last 30 days", and that floor now really is
  enforced. Selecting a shorter range narrows the rest of the dashboard around it.

- 5761973: Fix the Customer Service dashboard rendering all zeros.

  `service_dashboard` opened with every KPI at 0 and every chart reporting no rows,
  with 38 cases in the system. The reported cause — a `last_30_days` default that
  was narrower than the seeded case history — is not what was happening.

  `crm_case.created_date` is a `Field.datetime()`, and on the SQLite path
  `driver-sql` 16.1.0 coerces datetime filter values to epoch-millisecond INTEGERs
  (`coerceFilterValue`), on the documented assumption that datetime columns are
  stored as INTEGER ms. They are not: every datetime in the demo database is ISO
  TEXT, including the platform's own `created_at` / `updated_at` audit columns.
  SQLite orders every INTEGER before every TEXT, so on a datetime column
  `col >= <int>` is true for every row and `col <= <int>` is true for none. The
  runtime ANDs the dashboard range into every widget query, so the `$lte` half
  zeroed the entire dashboard — at any preset. Measured against the running 16.1.0
  console: `$gte` alone returns all 38 cases, `$lte` alone returns 0, both bounds
  return 0, in every date format tried.

  The `dateRange` block is therefore removed rather than widened. The dashboard now
  renders real data (30 open / 7 critical / 45.0h average resolution / 3 SLA
  breaches, all charts populated). The cost is visible and intentional: this
  dashboard has no date picker, and the commented-out block plus a CI guard mark
  the spot.

  Upstream this is objectstack-ai/objectstack#3912 (closed, fix in the 17.0 train;
  HotCRM is pinned to 16.1.0 so it is still live here). Restoring the range needs
  objectstack-ai/objectstack#3777 too — still open, and the reason a datetime
  upper bound stays unsafe even after the #3912 fix.

  The CRM, Sales and Executive dashboards are untouched — they window `close_date`,
  a `Field.date()`, which compares as TEXT on both sides and works. That, not the
  preset, is why Service was the outlier.

  Also documents that the `daily_case_volume` widget's `$gte: '{30_days_ago}'`
  floor is inert for the same reason, so the chart currently plots every case.

  A guard in `metadata-references.test.ts` now fails if any dashboard windows a
  `datetime` field, and checks the range field exists on the objects its widgets
  aggregate.

- a5f7ef0: Call the service dashboard by a name the product actually shows. The three
  service pages — `content/docs/service/index.mdx`,
  `content/docs/service/cases.mdx` and
  `content/docs/service/sla-and-escalation.mdx`, in all three locales — referred
  to it as **Service Dashboard**, and nothing in the app carries that name: the
  sidebar item is `label: 'Service Overview'` (`src/apps/crm.app.ts`) and the
  dashboard's own title is `label: 'Customer Service'`
  (`src/dashboards/service.dashboard.ts`). A manager told to "read the **SLA
  Violations** tile on the Service Dashboard every morning" had no sidebar entry
  by that name to click.

  The pages now use **Service Overview** — the sidebar label, which is how a
  reader finds it — and annotate the dashboard's own title, **Customer Service**,
  once at the first mention on each page, so the heading you land on matches what
  you were told to look for. That title is also the section heading on
  `content/docs/analytics/dashboards.mdx`, where the cross-page links point. The
  Chinese pages use 服务概览 / 服務概覽, which is the navigation label's own
  translation (`src/translations/zh-CN.ts`); the dashboard title stays as the
  Latin **Customer Service**, matching how the dashboards page writes it in every
  locale.

  No metadata changed — the two labels are what they were, and whether the app
  _should_ show one name in the sidebar and another on the page is a product
  question this leaves open.

- 2d7cc4e: 按 flow / hook 源码写实 `content/docs/service/cases.mdx` 的升级说法与 `content/docs/service/index.mdx`
  生命周期第 2 步残留的虚构收件人,三语同步(#914、#915)。

  #876 / #886(`service/sla-and-escalation`)、#887(`service/cases` 的《工作流自动化》一节)、
  #904(`service/index` 的两处清单)已经把这一族说法逐条写实。剩下的两处是同族里没有被那几张
  行清单枚举到的副本,而它们比已改的那几处更完整地复述了全部虚构 —— 于是读者在同一页上、
  同一屏里同时读到两套互相矛盾的描述,更显眼的那一套是错的。

  **`content/docs/service/cases.mdx`(+ `zh-Hans` / `zh-Hant`)**

  - **优先级表下面那句话。** 原文写「设为 Critical 时支持经理会收到邮件通知;某个客户账户的
    工单设为 High 时自动升级」——它上方 48 行就是 #887 已写实的《工作流自动化》第一条,那里写的
    是收件人只有工单负责人一人。`src/flows/case-escalation.flow.ts` 的 `notify` 节点
    `recipients` 只有 `{caseRecord.owner_id}` 这一项,`grep -rn "support_manager@" src/` 零命中;
    start 条件全文只有 `record.priority == "critical"`,全仓没有任何一个 flow 读取账户类型。
    现在写实为:Critical 提醒**工单负责人**(站内消息 + 邮件),并点名说清 `support_manager@example.com`
    这个收件人不存在;High 永远不会自动升级,无论账户是什么,要升级它靠的是手动的
    **Escalate Case** 按钮(`src/actions/case.actions.ts`)。
  - **《工单升级》整节。** 原文是 #876 已在 sla 页逐条写实过的那份五步清单,原封不动地留在本页:
    触发条件列着不存在的 `High + Customer` 分支;第 1 步「重新分配工单给客服的经理」不存在——
    `update_record` 节点只写 `is_escalated` / `escalation_reason` / `escalated_date` / `status`,
    注释开头即 `No owner reassignment`,通知正文自己写着 `It remains assigned to you.`;第 4 步的
    跟进任务归属错——流程里根本没有任务节点,任务由 `src/objects/case.hook.ts` 的
    `case_status_side_effects` 钩子开出,`owner_id` 取的是**账户负责人**,且仅限有关联账户的工单;
    第 5 步的三方邮件不存在,`support-team@example.com` 同样零命中。整节按 sla 页已落地的口径
    重写为:一个触发条件 + 三步真实动作 + 钩子开出的那条任务 + 三条「刻意不写什么」。
    原清单中经核对属实的两条(标记已升级并标记升级日期、状态改为 _Escalated_)claim 文本一字未改,
    仅因删除其前后条目而由 2./3. 重新编号为 1./2.。同页 #920 / #912 各自认领的两行(状态推进受
    强制约束、《工作流自动化》标题)不在本次改动的任何一个 hunk 内。

  **`content/docs/service/index.mdx`(+ `zh-Hans` / `zh-Hant`)**

  生命周期第 2 步写着「_Critical_ 会立即提醒支持经理」,而 #904 刚在其下方 10 行把《系统为你做的事》
  那条写实为「只发给工单负责人……本应用中不存在 `support_manager@example.com` 这个收件人」。
  两句说的是同一个 `notify` 节点。现在写实为:_Critical_ 立即提醒**工单负责人**,而不是支持经理,
  收件人列表只有 `{caseRecord.owner_id}` 一项。顺带把这一行的四个优先级名统一为兄弟页
  (`service/cases` 的优先级表、本页其余各行)已用的拉丁写法 Low / Medium / High / Critical ——
  中文两页此前只有这一行把 Critical 译作「紧急 / 緊急」。

  沿用 #876 / #886 / #887 / #904 已确立的写法:读者来找的那几个词 —— 支持经理、经理、资深客服、
  支持团队、原客服 —— 都点名说清**不做**,并写出真正的归属,而不是静默删掉。两页只陈述当前行为,
  不预判升级*是否应该*改派、High *是否应该*自动升级(#595 / #596 的产品问题)。顺带去掉了两个中文
  cases 页内链上的英文锚点 `#case-escalation` —— 中文页的标题是中文,该锚点在那两页上落不到任何
  位置(#755 / #762 惯例,#904 已按同一处理)。

  纯文档改动,6 个文件。未触碰 `src/**`,没有任何 flow、hook、条件、收件人或字段发生变化 ——
  是页面向已经在跑的行为对齐。

- 11f6242: Service and state-machine docs: write the last of the cases and state-machine pages to source.

  `content/docs/administration/state-machines` claimed throughout that a state machine
  **enforces** transitions — that users "can't put records into nonsensical states", that
  the status dropdown "only shows valid next states", that a disallowed move "shows an
  error", and that an admin can grant a "bypass state machine" permission. Measured on the
  engine, all five `state_machine` rules are `warning` severity: an illegal move is written
  to the server log and **the save still goes through**, the create path is not checked at
  all, nothing in this app filters a picklist by the transition table, and no bypass
  permission exists (nor is one needed). Those passages now say what the tables do — declare
  a machine-readable route and report departures from it — and what they do not do. The
  "Configure at Setup → Object → Status → State Machine" line is replaced with where the
  tables actually live (`validations[]` on the object).

  `content/docs/service/cases` gets the same treatment for the claims that survived earlier
  rounds: status progression is advice rather than a gate; the SLA due date is stamped on
  **Critical** cases only; the breach flag is **SLA Violated** (`is_sla_violated`) and is set
  by the hourly sweep on overdue open cases, never by comparing resolution time to a target;
  and the _Standard list views_ section is replaced with the seven views `crm_case` actually
  ships — six of the seven names it used to list were metric tiles, an old name for the
  kanban, or nothing at all. The manager tips lose the agent leaderboard, which the
  `case_metrics` dataset cannot express (it has no owner dimension).

  Also: the **Contract Renewal Reminder** automation is a flow, not a "workflow" — corrected
  on `content/docs/whats-new` and in the state-machines and integrations pages, where
  `workflow` named a metadata type this platform removed in 7.7.

  All changes are English, Simplified Chinese and Traditional Chinese. Documentation only —
  no metadata changed.

- 9cd96f6: Write the service index page's "Standard dashboards & reports" section to what
  the app actually ships. All four bullets on
  `content/docs/service/index.mdx` (and its `zh-Hans` / `zh-Hant` translations)
  were wrong, in two different ways.

  The dashboard bullet promised a **top agents** tile and an **oldest open cases**
  tile. Neither exists on `service_dashboard`, and neither is simply a widget
  nobody built yet: `case_metrics` — the dataset every service widget and report
  binds — declares no owner dimension, so nothing in analytics can rank agents,
  and every tile on that dashboard aggregates the dataset rather than listing
  records, so the oldest individual cases cannot be shown there either.
  `content/docs/service/cases.mdx` had already said exactly that about the agent
  half, so a reader comparing the two service pages was told both that a
  leaderboard exists and that it cannot. The bullet now names the ten tiles the
  dashboard ships — Open Cases, Critical Cases, Avg Resolution Time, SLA
  Violations, Cases by Status / Priority / Origin, Daily Case Volume, SLA
  Compliance and Open Cases by Priority — and says why the other two are absent.

  The three report bullets named reports that carry different labels in
  `src/reports/case.report.ts`: **Cases Opened by Priority × Day** had its two
  dimensions the wrong way round (priority is the rows, the day is the columns —
  the SLA page already wrote it correctly), **Cases by Status and Priority** was
  spelled with a `×`, and **SLA Performance Report** was missing the last word of
  its own name. A reader searching the reports list for any of the three found
  nothing. The SLA bullet also still promised "% of cases resolved within SLA
  target": that measure does not exist. The report gives case count, **SLA
  Violation Rate** and average resolution time by priority, over closed cases
  only.

  No metadata changed. Whether the product _should_ offer an agent ranking or an
  oldest-cases queue is a product question this leaves open — it would mean adding
  a dimension to `case_metrics` first.

- 60dc7ed: 按 flow / hook 源码写实 `content/docs/service/index.mdx` 上残留的五条升级与通知说法,三语同步(#904)。

  服务域的落地页是大多数读者最先读到的一页。`service/sla-and-escalation`(#876 / #886)与
  `service/cases`(#850 / #887)的同族说法已经逐条写实之后,本页的「一个典型工单的生命周期」
  与「系统为你做的事」两处清单仍在原样承诺重新分配、一个不存在的分支、两个不存在的收件人
  和一个不存在的横幅 —— 读者拿到的是自相矛盾的两套描述,而更显眼的那一套是错的。五条按
  兄弟页已落地的口径写实,`content/docs/service/index.zh-Hans.mdx` /
  `content/docs/service/index.zh-Hant.mdx` 同步:

  - **升级不会把工单重新分配给资深客服。** 生命周期第 5 步写的是「如果卡住了(或紧急,或来自
    客户),升级流程会将其重新分配给资深客服」。`src/flows/case-escalation.flow.ts` 的
    `update_record` 节点只写 `is_escalated` / `escalation_reason` / `escalated_date` /
    `status`,从不碰 `owner_id` —— 节点注释开头就是 `No owner reassignment`,因为
    `{caseRecord.owner_id.manager}` 穿不透 lookup、会插值成字面量 `undefined`;升级通知的正文
    自己写着 `It remains assigned to you.`。现在写实为:升级把工单标记为 _Escalated_ 并提醒
    它的负责人,不做交接;交到资深客服手里仍是一个需要有人手动完成的步骤。
  - **没有 `High + Customer` 这条分支。** 同一步里的「或来自客户」,以及「自动升级——将紧急工单
    或高优先级客户工单升级给资深客服」,说的是同一个不存在的东西:start 条件全文只有
    `record.priority == "critical"`,全仓 24 个 flow 没有任何一处读取账户类型。现在写实为:
    只有 Critical 会自动升级,High 工单永远不会(无论账户是什么),升级它靠的是工单记录上的
    **Escalate Case** 按钮。
  - **「紧急时通知」发给工单负责人,不发给支持经理。** 该行说的其实就是工单升级流程的 `notify`
    节点,`recipients` 只有 `{caseRecord.owner_id}` 一项,`support_manager@example.com` 在
    `src/` 下零命中。现在写实为站内消息 + 邮件发给**工单负责人**,并点名说清这个收件人不存在。
  - **「升级时通知」不发任何邮件。** `escalation_team@example.com` 全仓零命中,状态转为
    escalated 触发的是 `src/objects/case.hook.ts` 的 `case_status_side_effects` 钩子开出的那条
    **次日到期、优先级为紧急、归账户负责人**的跟进任务。现在写实为这条真实归属。
  - **SLA 违约没有红色横幅。** `grep -rn "banner" src/` 在整个 app 里只有
    `src/objects/opportunity.object.ts` 的一句无关注释 —— 没有任何横幅机制。违约的真实表现是
    `is_sla_violated` 被置真、工单被升级,外加 `src/flows/case-sla-monitor.flow.ts` 的 `notify`
    节点发给 `{currentCase.owner_id}` 一人的站内消息 + 邮件。

  沿用 #876 / #886 已确立的写法:读者来找的那几个词 —— 资深客服、支持经理、升级团队、红色横幅
  —— 都点名说清**不做**,并写出真正的归属,而不是静默删掉、留下一个「页面大概是忘了写」的印象。
  本页只陈述当前行为,不预判升级*是否应该*改派、High *是否应该*自动升级(#595 / #596 的产品问题)。
  同段中经核对属实的三条(工单分流技能定优先级、关闭时标记解决时间、未写解决方案不能关单)
  保持不动。顺带把生命周期第 5 步的中文页内链去掉了英文锚点 `#case-escalation` —— 两个中文页的
  标题是中文,该锚点在这两页上落不到任何位置(#755 / #762 惯例)。

  纯文档改动,3 个文件。未触碰 `src/**`,没有任何 flow、hook、条件、收件人或字段发生变化 ——
  是页面向已经在跑的行为对齐。Fixes #904.

- 834870c: Write the service overview page's _Where to find things_ list to the app's real
  navigation. The **Service** group in `src/apps/crm.app.ts` holds three items —
  Cases, Knowledge and **Service Overview** — so the list now names Knowledge
  (it was missing), gives the dashboard entry its actual sidebar label instead of
  "Service Dashboard", sends readers looking for Tasks to **My Tasks** /
  **All Tasks** under **My Work**, and records that no _Service Board_ exists:
  the kanban is the `case_workflow` view labelled **Service Workflow**, reached
  from the **Workflow** tab in the case list, not from the sidebar. All three
  locales updated.
- 4e9958e: Send readers to the app that actually ships the page: _Automation_, _Email
  Templates_ and _Objects_ are Studio navigation, not Setup (#1113, sub-class 2).

  Four pages cited seven navigation names under **Setup** that the Setup app has
  never shipped, in English and Simplified Chinese. Each of the seven is a real
  label — in **Studio**, resolved live from `@objectstack/platform-objects`:
  _Automation_ is `Studio → Automation` (whose only child is _Flows_), _Email
  Templates_ is `Studio → Integration → Email Templates`, and _Objects_ is
  `Studio → Data Model → Objects`. An admin who opened Setup looking for any of
  them found nothing there and no hint of where to look instead.

  Two of the seven were not renames, and reading each citation's own sentence is
  what separated them:

  - **Validation rules are a source edit, not a screen.** The Automation page's
    _"To add one"_ list opened with `Setup → Object → Validation Rules → New` —
    a four-step path of which no step exists. HotCRM's fifteen objects carry
    their rules as `validations[]` entries in `src/objects/*.object.ts`; the
    page now says so, and points at `Studio → Data Model → Objects` for the
    object roster the Console does show. This matches how
    `administration/state-machines` already documents the sibling case (_"there
    is no Setup → Object → Status → State Machine page"_).
  - **A denial stays a denial.** `guides/email-and-calendar`'s 「邮件模板（尚未
    落地）」 section named a path in order to describe a surface HotCRM does
    **not** ship. Renaming it to the live `Studio → Integration → Email
Templates` would have contradicted the section's own _"HotCRM ships none of
    it today"_, so the Simplified-Chinese text drops the arrow form and mirrors
    its English twin instead — 「一个**「邮件模板」设置页**」, the same wording
    the neighbouring 「邮件与日历」 section already uses.

  The `Workflow rule` denials on `administration/automation` and
  `reference/glossary` _were_ renames: _"no Workflow Rules entry under **Studio →
  Automation** — only Flows"_ is both true and the more useful sentence, because
  `group_automation` really does ship exactly one child.

  Three pending changesets carried the same wrong path into `CHANGELOG.md` at
  release — two giving advice in the retired path's voice, one setting a scene
  with it — and are corrected by hand here, for the reason
  `test/docs-setup-navigation-names.test.ts` records: `.changeset/**` is
  deliberately outside the guard's scan, so nothing else would have caught them.

  Documentation only — no metadata, behaviour or field changes.

- 5513ae0: Remove the inert `chartConfig` palette from the shared pipeline-funnel widget.
  #539 consolidated the funnel into `shared-widgets.ts` and its hardcoded five-hex
  palette travelled with it, so all three dashboards that call the factory carried
  config that never applied — verified in the browser on 16.1.0, where every
  rendered fill is `hsl(var(--chart-1..5))` and none of the declared hex colors
  reaches the DOM. `colorVariant` is removed on the same measured evidence.
  Refs #500.
- 94f99eb: Sharing docs now describe the record-level access the app actually ships.

  A sharing rule widens the object it names, not the records hanging off it. HotCRM
  authors its widening rules on Account (territory + account team), so a rep who
  receives an account that way reads the account and its contacts — while the
  quotes, contracts and tasks on it stay owner-only and opportunities widen only
  through the ≥ $100k leadership rules. The admin and contract docs claimed the
  opposite ("contracts follow the account's sharing", "you're on the account
  team"), promising a 360° view that record-level security never delivered.

  What changed:

  - **Sharing & Security** gains a per-related-list table of what a shared account
    really carries, and states that making a child follow the account is a
    deliberate widening for every holder of that object.
  - **Contracts** documents owner-only visibility, plus who does hold View All.
  - **FAQ** drops the "are you on the account team?" diagnostic step.
  - **Layer 4** is now _Manual shares_: HotCRM ships no account-team roster or Team
    tab, and the rule named _Account Team Sharing_ is an ordinary criteria rule for
    `sales_manager`.

  No permission set, OWD or sharing rule changed — whether quotes, contracts and
  tasks should follow the account is a business decision still open in #549. New
  guards in `test/sharing-coverage.test.ts` pin the shipped answer per account
  child and keep the docs matching the metadata.

- 804d15a: Assert that the configured driver can **execute** every seeded sharing rule, not
  merely that its condition compiles.

  `test/sharing-seeding.test.ts` proved each rule's CEL condition compiles to a
  pushdown-able filter. Nothing proved the driver could run the filter it compiled
  to — and that gap is not theoretical. Two opportunity leadership rules shipped
  compiling cleanly and granting nothing, because the driver refused their filter
  and `plugin-sharing`'s evaluator caught the error and carried on:

  ```
  ERROR Find operation failed {"object":"crm_opportunity",
    "error":{"message":"unknown top level operator: $not"}}
  WARN  [sharing-rule] criteria query failed {"rule":"opportunity_sales_sharing", …}
  INFO  SharingServicePlugin: boot rule backfill done {"rules":9,"reconciled":9}
  ```

  `reconciled: 9` — success, reported over two rules that reached nobody.

  Each rule now carries a **witness**: one record it must reach and records it must
  not. The rule's compiled filter runs against a real ObjectQL engine on the real
  driver and must return exactly the witness. The assertion is on grants
  materialised rather than on a thrown error, because the error is precisely what
  the boot path swallows — a test waiting for one would be testing the harness.
  Both halves of the failure now fail at PR time: a filter the driver refuses, and
  a filter it executes into nothing. Two guards-on-the-guard keep it honest — a
  rule added without a witness fails, and a witness for a retired rule fails.

  The operator matrix is extended the same way, from "compiles" to "and these are
  the rows the driver returns", against a fixed fixture. The expected sets are
  measured, including the null-sensitive rows, rather than reasoned about.

  No metadata changed: measured on `@objectstack/driver-memory` 17.1.0, `$not` is
  now a declared combinator refused-or-executed rather than passed through to
  mingo, so the failure above does not reproduce and the rules' authoring stands
  as written. Tests only. Refs #695.

- 6a912b7: The built-in sharing-rules guard now reads all three locale pages, not only the
  English one — and the first thing it found was a live gap on both Chinese pages.

  `test/sharing-coverage.test.ts` had three doc-reading rules over
  `content/docs/administration/sharing-and-security`. #790 gave the third one a
  per-locale sibling and widened the Org-Wide Defaults guard to all three pages,
  but the two that read the **Built-in sharing rules** table — the roster of what
  the app widens out of the box, and the object / access / position each row claims
  — still read the English page alone. So the English table was _forced_ correct
  while the two Chinese copies of it were watched by nobody, which is the same
  asymmetry that produced #791's whole-page drift and #592's dropped `| Events |`
  row.

  That gap was filed as dormant, on a row-by-row check that found both Chinese
  tables clean. It stopped being dormant a week later. #1096 added the
  **Unassigned Cases — Triage** rule together with its English row and did not
  touch the Chinese pages, so for ten days a reader of either Chinese page was
  shown nine of the app's ten sharing rules. The missing one is the app's only
  grant over records with **no owner at all**: every holder of the Service Agent
  position has edit access to open, unowned cases. Widening these rules turns them
  red on exactly that, naming the page and the rule; the two rows are corrected
  separately so the guard and the correction stay reviewable apart from each other.

  The rules are now one per-locale block over the existing `PAGES` ledger. Every
  fact a row states stays derived from the compiled stack — the roster is
  `sharingRules` itself, and the object, access level and position must be the ones
  the rule really grants — so adding or removing a sharing rule still costs zero
  ledger edits and three doc rows. Only the language is authored, once per word:
  the object column reuses `ROW_LABEL` (the ledger the OWD table already reads) on
  the Chinese pages and the stack's own label on the English one, and a new
  three-line `ACCESS_WORD` map spells `Read` / `Edit` as 读取 / 编辑 and 讀取 / 編輯.
  Nothing about an object's sharing classification is copied per locale, so a
  future reclassification stays one edit in one place.

  Fixes #809. Follows #790, #791 and #725.

- dbdf51f: Correct the platform-tool allowlist in `test/skills-integrity.test.ts`. The first
  pass guessed the set from what the `@objectstack/mcp@16.1.0` bridge happens to
  register, and got it wrong in both directions: it omitted `search_knowledge` — a
  real platform tool, documented in 16.1.0's own
  `spec/src/ai/knowledge-source.zod.ts` — so the guard would have failed a
  legitimate reference; and it reasoned about excluding `create_record` /
  `update_record` / `delete_record`, which are MCP-bridge tools absent from the
  platform registry entirely, so there was nothing to exclude.

  The list is now transcribed verbatim from `PLATFORM_PROVIDED_TOOL_NAMES` in
  `@objectstack/spec@17.0.0-rc.0` — all 30 entries, verified equal to the upstream
  set — with instructions to delete the literal and import it on the 17.0 upgrade.
  Cross-checked against upstream's `ai-skill-tool-unresolved` rule (which ships in
  17.0.0-rc.0, closing the gap this repo guarded locally): both give identical
  verdicts on `search_knowledge`, `query_data`, `todo_write`,
  `action_convert_lead`, `action_escalate_case`, `search_knowledgebase` and
  `triage_case`.

  Also corrects the claim that `search_knowledge` is undefined, in the
  `customer_360` docstring, its changeset, and `code_examples.md`. The tool exists;
  it stays out of the skill for a narrower reason — retrieval needs a declared
  knowledge source, `AIKnowledgeSchema` mounts only on `AgentSchema.knowledge`, and
  #512 deleted the agents, so a skills-only app has nowhere to declare one and the
  tool would resolve but return nothing.

- 90686a4: Skills reference: every skill's Reads / Writes / Output row now matches its skill source

  `content/docs/ai-copilot/skills.mdx` documented capabilities the six skills in
  `src/skills/` do not have. The worst of it was Case Triage's **Writes** row, which
  promised updates to `priority`, `category` and `queue`: triage declares only
  `describe_object` and `get_record`, the Escalate / Close actions carry no AI
  exposure so no write tool is materialised for it, and `category` / `queue` are not
  fields on `crm_case` under any name. Every skill's rows were re-checked against its
  source and rewritten to what the instructions and tool lists actually say:

  - **Case Triage** suggests a priority with its one reason and points at **Escalate
    Case** / **Close Case** for an agent to click; it reads no prior cases (no query
    tool) and no product (`crm_case` has none). Its classification field is **Case
    Type**, set by a person.
  - **Lead Qualification** writes nothing itself — it calls **Convert Lead** or
    **Schedule Follow-up**, and those flows do the writing. `rating` is never written;
    it is the 1–5 star Lead Score a person sets.
  - **Email Drafting** has no send tool at all, offers a second subject-line variant,
    and grounds the copy in the contact plus the related account or opportunity.
  - **Revenue Forecasting** summarises pipeline by stage and forecasts a range; the
    Closed / Commit / Best Case / Pipeline buckets belong to the opportunity's
    **Forecast Category** and the scheduled forecast snapshot, not to the skill.
  - **Customer 360°** reads contacts, open cases, open opportunities and published
    knowledge articles — not contracts, activities or campaign memberships.
  - **How skills work together** no longer claims skills invoke each other; the only
    handoff written into a skill's instructions is Case Triage naming Email Drafting.

  `content/docs/whats-new.mdx` counted five built-in skills; `allSkills` registers
  six — Live Data was missing from the list. All changes in `en` / `zh-Hans` /
  `zh-Hant`.

- 786e6fe: Give `customer_360` the tools its instructions always assumed, and guard skill
  tool references in CI. Its whole tool list was `tools: ['search_knowledge']`
  while the instructions promised an account + cases + opportunities + knowledge
  roll-up — the skill could not fetch a single record. It now reads accounts,
  contacts, cases and opportunities with the platform data tools, and the
  knowledge base with `query_records`, since `crm_knowledge_article` is a normal
  object.

  `search_knowledge` itself is a real platform tool — it is in
  `PLATFORM_PROVIDED_TOOL_NAMES` and was documented in 16.1.0's
  `spec/src/ai/knowledge-source.zod.ts`. Issue #493 listed it as undefined and an
  earlier draft of this change repeated that; both were wrong. It is left out for
  a narrower reason: retrieval needs a declared knowledge source, `AIKnowledgeSchema`
  mounts only on `AgentSchema.knowledge`, and #512 deleted the agents — so a
  skills-only app has nowhere to declare one and the tool would resolve but return
  nothing.

  Adds `test/skills-integrity.test.ts`: every skill tool must resolve to a platform
  built-in or an `action_<name>` tool materialised from an Action that is
  `ai.exposed` with a headless path; AI tool metadata cannot be used to satisfy a
  dangling reference; and every skill handed off to in instructions must exist (the
  defect that made `case_triage` point at a `response_drafting` skill that never
  existed). Also corrects two stale skill docstrings that explained the read-only
  posture of `case_triage` / `email_drafting` by calling `escalate_case`,
  `close_case` and `send_email` `type: 'modal'` — all three were retyped to
  flow/script since, and the real reason no tool is materialised is that none of
  them opts in via `ai.exposed`.

- 0d3f321: Write the SLA & Escalation page's account of what escalation does against the
  flow and the hook, in all three languages.

  `content/docs/service/sla-and-escalation.mdx` and its `zh-Hans` / `zh-Hant`
  twins described escalation as a **reassignment plus a three-party mailshot**.
  Measured node by node against `src/flows/case-escalation.flow.ts` and
  `src/objects/case.hook.ts`, four of the five steps in the _What the escalation
  does_ list were wrong, and the summary sentence, two upstream claims and two
  rows of the _Other case automations_ table repeated the same three fictions.

  - **No reassignment.** Step 1 promised the case moved to "the current agent's
    manager". The `update_record` node writes `is_escalated`,
    `escalation_reason`, `escalated_date` and `status` and never `owner_id` — the
    comment inside it opens with _No owner reassignment_, because
    `{caseRecord.owner_id.manager}` cannot traverse a lookup in a flow template
    and would interpolate to the literal `undefined`, orphaning the case under a
    phantom owner. The escalation notice already told its reader as much: `It
remains assigned to you.` The same claim appeared twice more upstream — the
    page's opening line (_"escalates stuck cases to senior staff"_) and the
    section lede (_"automatically reassigns stuck or critical cases to senior
    staff"_) — and in the summary sentence that had the customer's issue _"in the
    hands of a senior agent within minutes"_. All four now say the case stays with
    its owner and that a hand-off, if one is needed, is a manual step.
  - **The notification reaches one person.** Step 5 promised an email to the
    original agent, their manager, **and** a broader `support-team@example.com`
    list, carrying case number, priority and account name. `recipients` is the
    single entry `{caseRecord.owner_id}`; there is no manager recipient; and
    `support-team@example.com` does not occur anywhere under `src/`. The account
    name could not be delivered either — the same lookup-traversal limit applies
    to `{caseRecord.crm_account.name}`, which is why the node's message carries
    only the case number and the priority. The page now states all of that,
    including why the account name is absent.
  - **The follow-up task is real, but neither the flow's nor the original
    agent's.** Step 4 put it on the escalating agent "so they stay in the loop".
    The flow has no `create_record` node, deliberately; the escalation write flips
    `status` to `escalated`, which fires the `case_status_side_effects` hook — the
    single owner of escalation follow-up tasks — and that hook opens an **urgent**
    task, due the next day, owned by the **account owner**, and only for cases
    that have an account, since it keys off the account. Steps 2 and 3 (the flag
    and date, and the status change) were accurate and are kept.
  - **Two invented mailing addresses.** The _Other case automations_ table billed
    _Notify on Critical_ as emailing `support_manager@example.com` and _Notify on
    Escalation_ as emailing `escalation_team@example.com`. Neither string occurs
    anywhere under `src/`. The first row is the escalation flow's own notify node,
    which reaches the case owner on inbox and email; the second fires no email at
    all — what a status change to _Escalated_ produces is the account owner's
    urgent task. The row triggers are corrected too: the hook keys off the
    **status** becoming `escalated`, not off the `Escalated` boolean flipping.

  Throughout, the words a reader arrives looking for — _manager_, _senior agent_,
  _support-team_, _original agent_ — are stated as **not done**, and who really
  receives each thing is named, rather than being quietly deleted and leaving a
  reader to assume the page merely forgot to mention them. The page describes
  today's behaviour only and takes no position on whether escalation _should_
  reassign; that is an open product question.

  Documentation only, three files. No flow, hook, node, condition, recipient or
  field set changed — the pages now match the automation as it already runs.
  Fixes #876.

- 716d044: Make the service dashboard's SLA gauge plot compliance, the quantity its title,
  its description, its success colouring and its 0.95 target line all name.

  It plotted `avg_sla_violated` — the complement — and asked the renderer to flip
  it back with `options: { invert: true }`. On the seeded demo org, whose 8 closed
  cases are all within SLA, the gauge read:

  ```
  SLA 达成率
  本期 SLA 内解决工单的占比
  0.0%
  SLA Violation Rate      ← the measure's own label, printed under the number
  ```

  beside violation rates of 40–70% elsewhere on the same page. On an org with real
  misses it would have read the other way round: SLA breaches climbing toward 95%
  would have rendered green and "on target".

  `invert` was never a declared key. `DashboardWidgetOptionsSchema` ends in
  `.passthrough()` ("declared query keys + open renderer extras"), so the flag
  parsed, validated, linted and shipped while doing nothing, and no gate in this
  repo or upstream could say so. The fix is therefore a measure that _means_
  compliance rather than a renderer flag, and the key is removed rather than left
  pretending to work:

  - `case_metrics` gains `sla_met_count` (closed cases with `is_sla_violated:
false`) and `sla_compliance_rate`, a derived `ratio` of it over the existing
    `closed_count`. A ratio of two counts rather than `1 - avg_sla_violated`
    because `DerivedMeasureOp` operands are measure names only — there is no
    literal `1` to subtract from — which makes this the spec's sanctioned
    spelling, the same one `kb_deflection_rate` already uses.
  - The gauge binds to `sla_compliance_rate`. Its threshold ladder and target line
    are unchanged: they were always written for compliance, and it was the plotted
    value that disagreed with them.

  The measure's own label renders directly under the number, so it now reads `SLA
Compliance Rate` instead of contradicting the title above it. Widget titles and
  descriptions were already correct in all four locales and are untouched.

  `test/sla-compliance-gauge.test.ts` runs the shipped measures and the shipped
  widget binding through the real analytics executor on both drivers this app runs
  on — over controlled rows, and over the actual seeded case records, where the
  gauge now reads 100%. Refs #1213.

- 28d76c7: Write the SLA-tracking half of `service/sla-and-escalation` to what the app
  actually does, in all three locales.

  Four claims on that page described behaviour this app does not have. Three were
  confirmed against `origin/main` and rewritten; the fourth turned out to be true,
  and is reported below rather than "fixed" into a new falsehood.

  **Only Critical cases get an SLA due date.** The page opened with "Every case
  gets an SLA due date the moment it's created", 45 lines above the sentence
  #886/#890 had already written straight — that `case_sla_defaults`
  (`src/objects/case.hook.ts`) stamps `sla_due_date` for `critical` only and
  leaves every other priority blank. The page was contradicting itself; the lede
  and the intro of _How SLA targets are calculated_ now say what the hook does,
  and the target table separates Critical's four hours (a deadline the system
  keeps) from High / Medium / Low (a service commitment with no clock behind it).

  **The High / Medium / Low "what breach looks like" cells described row colour,
  not a breach.** There are no breach badges. The only colour declaration on a
  case list is `rowColor` on the _All Cases_ view, and it is keyed on
  **priority**, not on violation — so it paints a High case orange (`#f97316`,
  not the red the page promised) from the moment it is created, and Medium yellow
  (`#eab308`) rather than amber. Those three rows now say that nothing fires at
  all: `case_sla_monitor` only picks up cases whose `sla_due_date` has passed, and
  they have none. What reports a breach in a list view is the **SLA Violated**
  column.

  **There is no live SLA countdown.** `countdown` and `remaining` appear nowhere
  in the app's source, and the page header carries the case number, subject and
  account — not an SLA timer with warning zones. The three-bullet
  `2h 14m remaining` / `24m remaining` / `BREACHED – 1h 32m over` display is
  replaced with what the case really shows: **SLA Due Date** and **SLA Violated**
  as two ordinary fields in the **Key Information** strip, plus the two views that
  do help (**SLA Calendar**, **SLA at Risk**) described for what they select on.
  The _Tips for service agents_ line telling agents to "watch your SLA countdown …
  when you see the amber zone" pointed at the same missing feature and is
  rewritten with it.

  **The read-only claim was correct — it was the mechanism that was undocumented.**
  "The breach flag is read-only for agents" is true: the Service Agent profile
  masks `crm_case.is_sla_violated` as `readable: true, editable: false`
  (`src/profiles/service-agent.profile.ts`), which is field-level security rather
  than a `readonly` field — the field deliberately is not `readonly`, because
  `case_sla_monitor` has to write it. The sentence keeps its claim and now names
  where the lock lives. The neighbouring field bullet was wrong, though: the
  checkbox is labelled **SLA Violated**, there is no _SLA Breached?_ field, and it
  does not compare resolution time against a target — the hourly sweep sets it on
  open cases whose due date has already passed, which is why a case with no due
  date is never a candidate and a case resolved late but before the next sweep is
  never flagged.

  Whether High / Medium / Low _should_ have an SLA clock, and whether the breach
  flag _should_ be locked differently, stay open in #595 — this change only
  records today's behaviour. No field definition, flow or view changed. Refs #903,
  #886, #890.

- 3b1e9fd: Write the views / report / configuration half of `service/sla-and-escalation` to
  what the app actually ships, in all three locales. Six claims sent readers
  looking for screens, dropdowns and switches that do not exist; each was
  re-confirmed against `origin/main` before being rewritten, and each keeps the
  name it used so a reader who remembers it can find out what happened to it.

  **Business hours are not configurable — there is no business-hours anything.**
  The callout and the admin tip both promised that the clock could be told to
  count 9-5 Mon-Fri instead of calendar hours, "controlled by your tenant's
  business-hours setup". No working-day calendar, holiday list or setting of that
  kind exists anywhere in `src/`; the only code that computes an SLA deadline is
  `due.setHours(due.getHours() + 4)` in `src/objects/case.hook.ts`, straight off
  the wall clock. Both places now say so, with the consequence spelled out: a
  Critical case opened at 4pm Friday is due 8pm Friday, and nights, weekends and
  holidays all count.

  **The SLA Performance report has one breakdown, not four.** `sla_performance`
  declares `rows: ['priority']` (`src/reports/case.report.ts`), so _Priority_ was
  the only one of the four bullets that was real — and the other three are not
  merely absent from the report, they are unreachable in the semantic layer
  underneath it. `case_metrics` (`src/datasets/case.dataset.ts`) declares five
  dimensions — Status, Priority, Origin, Type, Created — with no owner/agent
  dimension, no crossing over to `crm_account.tier`, and `created_date` bucketed
  by **day** rather than month and not in that report's `rows` at all. The section
  now states the one dimension, names each missing one with why it cannot be
  selected, and records that the report measures the **SLA Violation Rate** over
  closed cases (`runtimeFilter: { is_closed: true }`) rather than a compliance
  percentage.

  **Breached SLA and Critical Cases are not list views.** `crm_case` ships seven
  (`src/views/case.view.ts`): _All Cases_, _Service Workflow_, _SLA Calendar_,
  _Case Timeline_, _My Open Cases_, _Escalated Cases_, _⏰ SLA at Risk_ — and none
  of them filters on `is_sla_violated`. The two surfaces that do are metric tiles
  on the Service Overview dashboard. The cadence table and the manager tip now
  point at **Escalated Cases** (every case the sweep flags gets escalated into it)
  plus the **SLA Violations** tile, and say plainly that the two old names name
  nothing.

  **The kanban board is called Service Workflow.** `case_workflow` carries
  `label: 'Service Workflow'` and appears on the case list as the **Workflow**
  tab; _Service Board_ exists nowhere in the app.

  **My Open Cases is a priority queue, not a deadline queue.** Its sort is
  `priority_rank` descending first, `sla_due_date` ascending only as a
  tie-breaker — and since only Critical cases are stamped with a due date, the
  tie-breaker has nothing to order the lower bands by.

  **Waiting on Customer does not pause the SLA clock**, and there is no config
  that makes it. `sla_due_date` is written once and never recomputed, and
  `case_sla_monitor`'s `status: { $nin: ['resolved', 'closed'] }` does not exclude
  `waiting_customer` — so a case parked on the customer keeps running down its
  four hours and is flagged and escalated on schedule. This was the costly one:
  an agent who believed the tip stopped watching a live clock.

  Whether the platform _should_ offer a business-hours calendar, per-agent or
  per-tier SLA breakdowns, or a pausable clock stays open in #595 — this change
  records today's behaviour only. Documentation in three locales; no metadata
  under `src/` changed. Refs #917, #903, #886.

- 4855d50: Split `test/metadata-references.test.ts` into four files by the metadata surface
  each guard resolves against, so the suite stops sitting one edit away from the
  100KB source-hygiene ceiling.

  The file had reached 99,872 bytes against the `MAX_FILE_BYTES = 100 * 1024`
  limit in `scripts/check-source-hygiene.mjs` — 97.5% of the quota, roughly one
  commented guard of headroom. That is not a hypothetical: #815 set out to invert
  one bulk-dispatch guard, blew past the limit, and had to design and execute an
  unplanned split mid-PR before its actual change could be reviewed. Every
  subsequent PR touching these guards was queued up to repeat that detour.

  The guards now live with the surface they check:

  - `test/metadata-references.test.ts` — pages, forms, and the cross-surface
    references (formula predicates, flow conditions, `objectOverride` and
    dashboard global filters, `App.defaultAgent`)
  - `test/view-references.test.ts` — view fields, sorts, filter template tokens,
    row colours, kanban groups, stage enumerations, list-view reachability
  - `test/action-references.test.ts` — navigation, dashboard actions and routes,
    list-level `rowAction` / `bulkAction` references, dashboard date ranges
  - `test/i18n-references.test.ts` — the four locale bundles: action labels,
    select fields and options, and locale completeness on every authored surface

  The derivations all four share (`objects`, `views`, `walk`, the flattened locale
  packs, the platform-object allowlist) move to `test/helpers/metadata-fixtures.ts`
  so they have one definition rather than four. `test/metadata-references.test.ts`
  keeps a map at the top naming which family went where.

  Nothing about what is checked changed. The split moved text: no assertion,
  helper, fixture or test name was edited, and the same 70 tests run before and
  after (24 + 16 + 11 + 19). Two categories of byte differ inside a moved block,
  and nothing else: five comments whose wording the split itself falsified
  (sentences saying "the navigation guard in this file", which now name
  `test/action-references.test.ts`), and two `for` statements that destructured a
  `key` binding they never read — dead before the split, and reported by CodeQL
  once the code landed at a new path. Largest resulting file is 33,433 bytes, 67%
  below the ceiling.

- 1d9652d: Give the demo org people, so the position-based mechanisms this app ships stop
  resolving to an empty recipient set. A new `pnpm demo:staff` command creates
  three non-admin demo users on a local dev server — an NA rep, an EU rep and a
  sales manager — assigns the positions they hold, and re-evaluates the sharing
  rules so the already-seeded records materialise grants.

  This was the last dark layer of the same gap #621 and #638 closed from the other
  two sides. The rules installed and the records matched them, but nobody held any
  position, so a matching account still granted nothing: on a fresh install
  `sys_user_position` had 0 rows and `sys_record_share` 0 rows, every
  position-based sharing rule granted nobody anything, and submitting a deal for
  approval opened `opportunity_approval`'s `manager_review` with an empty approver
  slate while `lockRecord` held the record with no in-product recovery. After
  staffing, the same fresh install shows `north_america_territory` granting its 6
  accounts and `europe_territory` its 2, the NA rep reading exactly the six US/CA
  accounts she does not own (and neither the two EU ones nor the one account in no
  territory), and `manager_review` routing to a real approver.

  Who exists and which positions they hold is a table
  (`src/sharing/demo-staffing.ts`) — adding a person is adding a row. The two reps
  must be users who do NOT own the accounts, because `crm_account` is `private`
  and the OWD baseline already admits a record's owner, so a share to the owner
  would prove nothing; ownership stays with `demo_bootstrap`'s first user and the
  script exits non-zero if that ever stops being true. The other seven positions
  stay unstaffed on purpose: a real deployment staffs its own people.

  **These accounts can never reach a customer org.** Staffing is a repo script
  that drives a local dev server through the platform's own admin endpoints, not
  metadata: nothing in the published artifact can create a user, and
  `test/demo-staffing.test.ts` fails if a seed dataset or a flow node ever writes
  `sys_user`, `sys_member` or `sys_user_position`. (It could not have worked as
  metadata either — identity tables are `managedBy: 'better-auth'`, so a row
  inserted around that surface has no credential and nobody can sign in as it.)

  Two platform behaviours worth carrying forward, both measured here.

  `plugin-sharing` materialises rule grants from a record-write hook that returns
  early on `isSystem` writes, and every seeded row is written with
  `isSystem: true`. So staffing alone leaves `sys_record_share` empty until a rule
  is re-evaluated — which the script does, and which a server restart also does
  via the boot backfill.

  And what bounds a rep to their territory is not their profile. Object-level read
  on `crm_account` comes from `member_default`, the additive baseline every org
  member holds (ADR-0090 D5); the row set comes from `crm_account` being `private`
  (rows are owner-visible only, and the reps own nothing) plus the shares their
  territory rule materialised. Each rep also holds `sales_rep`, which widens no
  rows — `viewAllRecords: false, readScope: 'own'` is the same depth the baseline
  computes — but makes the persona a sales rep rather than a generic member. The
  corollary is now a test: a set bound to a position a territory rep holds must
  never grant `viewAllRecords` on `crm_account`, or the rep reads all nine
  accounts and the territory grant proves nothing while the org still looks
  staffed. Fixes #640. Refs #621, #638, #622, #488.

- c036313: Knowledge base: the Review Queue tab no longer claims a 180-day window it never applied.

  In English, Chinese, Spanish and Japanese the knowledge-article review tab was named
  "Stale (>180d)" (过期 (>180 天) / Obsoletos (>180d) / 古い (>180 日)), but its filter
  selected only `status = published`. The tab therefore returned **every** published
  article — including one reviewed minutes ago, merely sorted to the bottom — under a
  heading that promised a six-month cut. Anyone who read the tab as a worklist was
  reading a list of the whole knowledge base.

  The four names now match the view's own metadata label, "Review Queue · Oldest First",
  which is what the view actually does: every published article, least-recently-reviewed
  first. Which rows the tab returns is unchanged.

  The 180-day window was measured before being ruled out rather than assumed impossible.
  The date macro does resolve on the read path now, and lands on the start of the calendar
  day 180 days back — but a comparison against it does not match articles that have never
  been reviewed at all, and those are exactly the rows a review queue most needs to show.
  Saying "older than 180 days **or** never reviewed" needs a disjunction, and a view filter
  is a flat list of conditions combined with AND, so the honest window cannot currently be
  written. Whether this queue should become a cut is now a separate, open product question.

  The house-rule guard that catches this defect class (a view name promising a time scope
  its filter does not express) previously recognised only current-calendar-period phrases
  like "This Quarter", so it could not see "> 180d". It now also reads parameterised day
  windows in all four locales.

- 7d716bb: Three pages that told readers something about "today" had all stopped being true, and each one had a guard that was looking somewhere else.

  **Getting started no longer sells a role hierarchy that was removed.** `getting-started/introduction` advertised "a 10-role hierarchy" in all three locales. Both halves were wrong: the app registers **12** positions, and ADR-0090 D3 removed the hierarchy itself — positions are flat capability-distribution groups, and nothing rolls up from one to another, which is why each rung that needs a record is named by its own sharing rule. The bullet now says that, and the docs home's security row says it too instead of listing "role hierarchy" as a feature. Position counts are now read from the registered stack by the same guard that pins objects, flows, dashboards and datasets.

  **`docs/STATUS.md` is a current-state page again.** It called itself the source of truth for the repo while every figure on it was stale — 16 objects against 17, 318 fields against 344, 4 dashboards against 5, 23 flows against 24, 13 views against 14, and a platform line two release candidates behind the installed `17.0.0-rc.3`. The validator transcript and the runtime-requirements table are now both pinned: the transcript against the registered stack (every label, including ones nobody was checking), the table against `package.json`'s `engines`, `@objectstack/*` line and dev-server port. The misleading "Snapshot date" is gone — the page is present tense and enforced — and the test row now states a verdict rather than a size, because "N files, M tests" moves on nearly every PR and nothing can check it from inside the suite it describes.

  **"What's New" no longer announces a release that never happened.** Its latest-release section claimed `v5.0` on "ObjectStack 5.0", offering `@objectstack/console@5.0` and `@objectstack/account@5.0`; the app is **2.2.2** and the platform is **17.0.0-rc.3**, twelve majors away, and `v5.0` was never either. That section now states the two versions that are actually shipped and points at the pages that own each area, rather than keeping a second, hand-copied release table — the release-by-release history stays in `CHANGELOG.md`, compiled from changesets. The v1.0 record is untouched. A new rule holds any section marked "Latest release", in every locale, to the version the manifest declares and the platform version `package.json` installs.

  The exemption that hid the last of these is also fixed: it excused the whole "What's New" page as a historical record, which was right for the v1.0 section and wrong for the one next to it. Exemptions are now scoped to the section they were granted for.

- 6014b2c: The State Machines admin page now lists all five objects that have one, and says
  what a state machine actually does when you leave the declared route.

  `content/docs/administration/state-machines` opened with a roster of two —
  Leads and Opportunities — and then named case, contract, campaign and quote as
  objects that "have status fields but use simpler status handling rather than
  full state machines". Three of those four were wrong. `crm_case`,
  `crm_contract` and `crm_quote` each carry a named `state_machine` validation
  rule with a complete transition table (`case_status_progression`,
  `contract_status_progression`, `quote_status_progression` — added by #575 B4);
  the roster simply never moved when they landed. An admin read the page as
  licence to change those three lifecycles without maintaining a transition map.
  Campaign was the one the sentence got right.

  All three pages now list five objects with their real routes, and state the
  mechanism once: every machine is a named `state_machine` validation rule on the
  object, over its lifecycle field — cases, contracts and quotes use the _same_
  mechanism as leads and opportunities, not a lighter one.

  **Measured before writing, and it changed the wording.** All five rules are
  declared at `severity: 'warning'`, and the engine only throws on `error` — so
  an illegal transition is written to the server log and **the save still goes
  through**. Driven end to end on a real ObjectQL over the in-memory driver, one
  object at a time:

  | rule                            | illegal move probed            | engine verdict      | stored value after |
  | ------------------------------- | ------------------------------ | ------------------- | ------------------ |
  | `lead_status_progression`       | Qualified → Contacted          | logged, not blocked | `contacted`        |
  | `opportunity_stage_progression` | Prospecting → Negotiation      | logged, not blocked | `negotiation`      |
  | `case_status_progression`       | Resolved → Waiting on Customer | logged, not blocked | `waiting_customer` |
  | `contract_status_progression`   | Draft → Activated              | logged, not blocked | `activated`        |
  | `quote_status_progression`      | Draft → Accepted               | logged, not blocked | `accepted`         |

  The page therefore says the route is **advice, not a gate** — the same reading
  the contracts page already landed for `contract_status_progression` — rather
  than the issue's "the validation rule stops you". It also records that no
  machine declares `initialStates`, so a record _created_ directly in a late
  state is never checked: the rules compare a new value against a previous one
  and only run on update.

  `test/status-state-machines.test.ts` gains the missing direction. It already
  derived which objects must be governed from the compiled stack; it now also
  reads the bullet roster off all three pages and fails when a governed object is
  absent from it, or when an object whose status is deliberately descriptive
  (campaign, task) appears in it. The roster is checked, not the prose around it,
  so the paragraph that explains _why_ campaigns have no machine is free to name
  them. A sixth state machine now turns the page red instead of joining the three
  that were missing.

  Documentation and one test only; nothing under `src/` changed.

  Fixes #896.

- b7791ca: State-machine docs: write the status vocabulary, the two remaining behavioural claims and the Copilot section to source.

  `content/docs/administration/state-machines` used a set of lead statuses and opportunity
  stages that do not exist. _Working_ and _Disqualified_ are not statuses at all — they are
  entries in `src/mappings/lead_import.mapping.ts`, the alias table that maps a legacy
  export's wording onto `contacted` and `unqualified` on import, and the product never shows
  either word. The real vocabulary is _New / Contacted / Qualified / Unqualified /
  Converted_, and _Contacted_ and _Unqualified_ had never once appeared on the page that is
  supposed to be authoritative about them. On the opportunity side, _Closed Without Decision_
  exists nowhere in this app and the real _Needs Analysis_ stage was missing, so the page
  listed seven stages of which one was invented and one was absent. Both diagrams, both
  transition tables and the lede now come from the `state_machine` rules themselves.

  Two claims about the shape of the route were backwards. The page gave _New → Converted_ as
  its example of a **disallowed** move; that edge is in the table **deliberately**, because
  Convert Lead is offered on any open lead and the `lead_conversion` flow stamps
  `status: 'converted'` at the end — forbidding it would make every conversion from an
  unworked lead log a spurious warning. And _Unqualified_ was drawn as a terminal state when
  it is the one status with a way back (a re-open to _New_), while the opportunity section
  advertised free backwards movement and a reopen path that the table declares nowhere.

  Also corrected on the same page: **Close Date** and **Amount** are `required: true`
  unconditionally rather than from _Proposal_ and _Negotiation_ onwards; approval starts at
  **$100K** (`src/flows/opportunity-approval.flow.ts`), with **$500K** being the second,
  Sales-Director tier rather than the entry threshold — so a $200K deal does go through
  approval, which the old wording denied. The won/lost-reason requirement was already
  correct and is unchanged. The **AI Copilot** section, which described the Copilot
  withholding suggestions until a status allowed the move, is replaced by what can actually
  be shown: no skill under `src/skills/` and no action under `src/actions/` references a
  transition table, and whether the platform's own agent reads one is left explicitly
  unclaimed rather than asserted in either direction.

  `content/docs/administration/setup`'s stage/probability table carried the same phantom
  stage, and dropping it exposed that the missing _Needs Analysis_ had shifted every
  probability below it by one row — _Proposal_ and _Negotiation_ were showing 40% and 60%
  against a source that says 60% and 80%. The table now matches `STAGE_PROBABILITY` in
  `src/objects/opportunity.hook.ts`.

  All changes are English, Simplified Chinese and Traditional Chinese. Documentation only —
  no metadata changed.

- 1c6376d: Clamp monthly/yearly task recurrence to the last valid day instead of
  overflowing into the next month.

  `advanceDate` stepped months with `Date.setMonth`, which rolls a day that does
  not exist in the target month forward rather than clamping. A recurring task due
  Jan 31 spawned its next occurrence on **Mar 3** — drifting further into the
  following month on every occurrence and skipping February outright. Feb 29 on a
  leap year had the same shape.

  Month and year steps now move to the 1st before doing the arithmetic and then
  clamp the day to the target month's length: Jan 31 → Feb 28 (Feb 29 in a leap
  year), Mar 31 → Apr 30, Feb 29 2028 → Feb 28 2029.

  Note the residual behaviour, which is asserted rather than left to be discovered:
  each occurrence is computed from the previous due date, not from an anchor day,
  so a month-end series settles on the shorter day (Jan 31 → Feb 28 → Mar 28)
  instead of returning to the 31st. Preserving the anchor needs a schema change;
  the behaviour being replaced drifted forward without bound, so this is a strict
  improvement.

  `advanceDate` also moves inside the handler. It was the last module-level helper
  in `src/objects/`, and every sibling hook documents why that is unsafe: L2 hook
  bodies run body-only in the QuickJS sandbox, where module scope is not
  available.

- 7709114: Drop the shadowed `assignment` field group on `crm_task`. #577 added the group
  with `owner` as its only member, but the synthesized detail page hoists `owner`
  into the highlight strip, so the group rendered on forms and never on detail
  pages (`field-group-shadowed`). `owner` moves to `basic`, next to
  subject/status/priority. Clears the warning #577 introduced; validate goes from
  5 warnings to 4.
- 1d3d942: Two teaching-surface corrections. No runtime metadata changes — one test-file
  comment and one developer-doc example.

  **The action-sandbox rationale comment no longer asserts a fixed bug in the
  present tense.** The file header of `test/case-first-response.test.ts` explains
  why these tests run the shipped body under the real QuickJS sandbox instead of
  the handler-as-JS shortcut, and cited `mass_update_stage` as "the action in this
  repo that got that wrong and silently never wrote". Both halves had expired:
  `src/actions/opportunity.actions.ts` now calls
  `update({ id, stage }, { where: { id } })`, and the action path was never the
  silent one — a wrong option spelling comes back as a 400 with a red toast in the
  console. Only the hook-side writes failed silently, because those hooks carry
  `onError: 'log'`. The example is now written in the past tense with the two
  failure modes told apart; the technical point it exists to make — the engine
  facade's `update` takes a document rather than an id, so only a real sandbox
  catches this class of bug — is unchanged.

  **The "Add An Action" doc example now declares a lookup param that renders a
  record picker.** The Campaign param in `docs/developers/code_examples.md` was a
  bare `{ name: 'campaign', type: 'lookup' }` with no picker target. That parses
  and submits fine, so nothing warns — but with no target object to resolve, the
  console degrades the control to a text box asking the user to paste a record id
  by hand. The example now uses the field-backed form the repo actually ships in
  `src/actions/lead.actions.ts`:

  ```ts
  { field: 'crm_campaign', objectOverride: 'crm_campaign_member',
    label: 'Campaign', required: true }
  ```

  which resolves the widget from `crm_campaign_member.crm_campaign` and renders a
  real picker, with a comment beside it stating why a bare lookup does not. Since
  a field-backed param defaults its request-body key to the field name, the
  example body's one read moves with it, `input.campaign` → `input.crm_campaign`
  — otherwise the copied example would collect a campaign and then fail its own
  "Campaign is required" check. The `_selectedIds` teaching added to this example
  earlier is untouched. Fixes #778, #821.

- 112f3da: Fix territory sharing: the North America and Europe rules now actually grant
  access. Both were declared against `record.billing_address.country`, a path
  that reaches inside the structured Billing Address value. A sharing rule's
  criteria have to compile into a database query, and a query cannot reach inside
  a composite address — so the platform refused to install either rule (correctly
  preferring that to widening them to "every account"), and `na_sales_team` /
  `eu_sales_team` received no criteria-based account access at all while the
  metadata and the admin docs said they did. The only sign was a WARN in the boot
  log: `seeded: 7, skipped: 2, total: 9`.

  Accounts now carry **Billing Country**, a read-only two-letter code projected
  from the country you enter in Billing Address and maintained on every write, and
  the two territory rules match on it. Territory membership is unchanged — the
  same countries, read from a queryable column instead of from inside the address
  — and the field is shown on the account's _Locations_ section so an admin can
  see at a glance why a territory team does or does not have an account. Enter the
  billing country as its two-letter code (`US`, `DE`, …); a country spelled out in
  full puts the account in no territory.

  For anyone writing their own rules: **criteria may only filter on plain fields**,
  never on part of an Address or Location value. `test/sharing-seeding.test.ts`
  now compiles every declared rule with the platform's own compiler and fails the
  build if any of them would be dropped at boot, so a rule can no longer ship
  inert. Fixes #621.

- 4d74303: The dashboards docs guard now reads tile references in the Chinese pages' running
  prose, not only the English page's.

  `test/docs-drift.test.ts` carries two dashboards rules: every tile BULLET must
  resolve to a widget on that dashboard, and every `**Name** tile` reference
  anywhere in the prose must resolve to a widget on some dashboard. #685 put
  `content/docs/analytics/dashboards.zh-Hans.mdx` and `.zh-Hant.mdx` under both, but
  only the first one actually reached them — the second keyed on the English word
  "tile", and the zh pages say `**Quiet 90+ Days** 磁贴 / 磁貼`, so their prose was
  never read. The tile LISTS were checked the whole time; the sentences around them
  were not.

  Nothing on the pages was wrong. Both tiles their prose names — `Quiet 90+ Days`
  and `SLA Compliance` — are real widgets, which is why this shipped as a dormant
  coverage gap rather than a live defect. It is worth closing because the defect
  class has appeared in exactly this shape before: the `Slipping Deals` tile that
  #610 removed was named in the Tips prose, not only in a list, and the zh copies of
  that sentence were part of what #685 had to retranslate.

  The noun now comes from a `TILE_WORDS` table (`tile` / `tiles` / `磁贴` / `磁貼`)
  that the pattern is built from, so a fourth locale is a word rather than a regex
  edit. Two details of the match moved with it. The separator between the bold name
  and the noun is now zero-or-more whitespace instead of one-or-more, because
  Chinese typography does not require a space there and the unspaced spelling would
  otherwise have stayed unchecked — the same hole in a new dress. And the trailing
  word boundary is now a lookahead for an ASCII word character: a JavaScript `\b` is
  defined against both of its neighbours, so it never matches after a Chinese
  character and would have made the new alternatives inert. The English half accepts
  exactly the strings it accepted before, and its hit set is unchanged.

  References read across the three pages go from 2 to 6. A new assertion probes each
  locale's word directly, spaced and unspaced, so narrowing the pattern again fails
  straight away instead of staying green on the English hits alone — which is what
  the existing vacuity guard, a union count over all three pages, would have done.

  Fixes #725. Follows #685 and #610.

- 0bc8ec5: Complete Chinese metadata labels for every HotCRM list view, including the
  high-value CRM views used in the product demo.
- 02e8200: Scope every uniqueness constraint per organization, so a second tenant can actually be onboarded.

  Four objects declared platform-wide unique indexes on values that are only
  unique inside one organization. On a multi-tenant deployment each of them
  rejects the second organization's perfectly valid record.

  - `crm_contact.email`, `crm_lead.email`, `crm_product.sku` each declared the
    uniqueness TWICE: field-level `unique: true` plus a single-column
    `indexes: [{ fields: [...], unique: true }]`. Since framework #3696 the
    field-level form is scoped per tenant — `(organization_id, email)` — while a
    declared index is materialized over exactly its `fields`, i.e. platform-wide.
    Declaring both left the global index enforcing the old behaviour and the
    per-tenant constraint unreachable, so two organizations could not each know
    `john@acme.com` or each stock SKU `ABC-123`. The redundant index is removed;
    the field-level declaration already builds the tenant composite.

  - `crm_case.case_number` is worse, and was NOT a double declaration — just a
    global unique index on an **autonumber**. The platform's autonumber sequence
    is per tenant, so every organization counts from 1 and the second one's
    `CASE-00001` is rejected on insert: precisely the collision framework #3696
    exists to prevent. The index is now spelled out as
    `['organization_id', 'case_number']` so the constraint matches the sequence
    that feeds it.

  Verified end-to-end: a freshly migrated database now carries
  `uniq_crm_contact_organization_id_email`,
  `uniq_crm_lead_organization_id_email`,
  `uniq_crm_product_organization_id_sku` and
  `uniq_crm_case_organization_id_case_number`, with `os migrate plan` reporting
  the schema in sync.

  The first three are exactly what the new framework lint
  `unique/double-declaration` (framework#3991) flags; the stack is now clean
  under it.

- c833ae1: Stop shipping the dead "Update Stage" bulk button on the Opportunity list.
  Selecting deals and clicking it did nothing at all — no records were written,
  no request was even sent, and the console still reported "Action completed
  successfully" — so a rep watched a stage move succeed and then found the
  pipeline unchanged, which reads as lost data rather than as a feature that
  isn't ready. The button is now simply absent: stage moves happen on the
  pipeline kanban board (drag a card between columns), by editing the Stage cell
  inline in the grid, or on the deal record itself, all of which save correctly.

  Nothing else about the action changed — its definition, labels and translations
  stay in place, so the button returns in the release that fixes the underlying
  bulk-selection defect (#508). A metadata test now fails the build if the button
  is re-listed before that fix lands.

- 8df119f: Repair three classes of silently-inert validation declarations (#514, items 3, 7 and 12)

  Every rule below is metadata that `os validate` accepts and that no test ever
  evaluated, so each failed without erroring.

  **Unguarded CEL predicates on `crm_product` (item 3).** Strict CEL aborts on
  `dyn<null> < int`, which makes an unguarded comparison skip the rule entirely
  instead of failing it. `price_positive` (`record.list_price < 0`) and
  `cost_less_than_price` (`record.cost >= record.list_price`) both lacked the
  `!= null` guard that `quote_line_item.unit_price_positive` already models.
  `cost` is absent on every seeded product, so the cost warning had never
  evaluated on a single row. Both operands are now guarded. No seed data changes
  state: no seeded product has a negative list price or a cost at all.

  **`end_after_start` operator drift (item 12).** The same rule had three
  spellings. `crm_campaign` used `<`, accepting a campaign that ends the day it
  starts while its own message promised "End Date must be after Start Date".
  `crm_forecast.period_end_after_start` also used `<`, with an "on or after"
  message contradicting its rule name. `crm_contract` was already correct. All
  three now use `<=` in the violation predicate and say "must be after"; forecast
  periods are months or quarters, so rejecting a zero-length period is the
  intended reading. No seeded campaign or forecast has `end == start`.

  **Duplicated `revenue_positive` (item 7).** `crm_account` declared a validation
  saying "Annual Revenue must be positive" while `account.hook.ts` threw "must be
  greater than or equal to 0" for the same condition — the two disagreed about
  whether zero was allowed, though both compared `< 0` (it is allowed). The
  duplicate declaration is removed; the hook remains the single enforcement
  point, and it is the tested one. This is behaviour-visible only in the error
  message a client sees for a negative revenue, which is now consistently the
  hook's.

  New guards land in `test/object-validation-predicates.test.ts`: a repo-wide
  sweep that null-guards every operand of every ordering comparison in every
  object validation, the date-range twins pinned to one operator and one wording,
  and a single-enforcement-point check for `annual_revenue`. The sweep carries
  one documented exception — `opportunity_line_item.unit_price_positive`, the
  remaining half of item 3 — and a companion test fails if that entry ever goes
  stale.

- 0f72853: Make every validation predicate TOTAL, so a rule can no longer be silently
  skipped on update. A rule is evaluated against `{...previous, ...data}`, and the
  engine fills absent fields with `null` **only on insert** — on update, `previous`
  is whatever the driver returned. A driver that stores only the columns a row was
  actually written with hands back a record with the key **absent**, strict CEL
  aborts the whole predicate with `No such key`, and the engine's answer to a
  predicate that cannot answer is to skip the rule. No error, no failed save — just
  a rule that reads as enforced and requires nothing.

  23 of the app's 24 script validations were exposed, including
  `crm_lead.disqualification_reason_required`, `crm_task.completed_date_required`
  and `crm_case.escalation_reason_required`. Every `record.x` read now carries a
  `has(record.x)` guard, and `test/object-validation-predicates.test.ts` enforces
  the house rule two ways: a structural check that no predicate reads a field
  without a guard, and a run of every predicate through the engine's own
  `evaluateValidationRules` against a record with no keys at all, failing on any
  "predicate failed to evaluate" warning.

  Measured per driver: `driver-sql` and `driver-sqlite-wasm` are column-complete
  (`SELECT *` returns NULL for unset columns), so rules already fired there and
  their behaviour is unchanged. `driver-memory` and `driver-mongodb` return only
  what was written, so on those the affected rules now fire where they previously
  did nothing — a record that was accepted before may now be correctly rejected on
  update (for example, moving a task to Completed without a completed date).
  Refs #630.

- 846c3c8: Repair the verification pipeline: fake-green CI checks, a dead e2e suite, and
  the runtime test coverage gaps (#495).

  **CI checks that checked nothing.** `code-quality.yml`'s three greps scanned
  `packages/` — a directory this repo has never had — each with
  `continue-on-error: true`. They are replaced by `scripts/check-source-hygiene.mjs`,
  which scans the real tree (`src`, `test`, `e2e`, `scripts`), fails on a hit, and
  fails loudly if a scanned directory ever disappears. `deploy-docs.yml` copied
  `QUICKSTART.md` and `PROJECT_SUMMARY.md` unguarded — neither exists, so every
  triggering push failed the workflow. `continue-on-error` is off `pnpm lint` in
  both workflows (`objectstack lint` already exits 0 on warnings, so the flag only
  hid real errors). The orphaned `.eslintrc.json` is removed — no `eslint` package
  was installed anywhere to read it — and CONTRIBUTING now says what `pnpm lint`
  actually does. `.github/labeler.yml` had seven rules, three of which pointed at
  paths that have never existed and one (`ui`) at a label the repo does not have;
  globs are repointed and `test/labeler-config.test.ts` fails on a glob that
  matches nothing. `apps/docs` (Next.js, 231 mdx pages, its own lockfile) is
  compiled by a new `docs-app.yml` workflow — nothing built it before.

  **The e2e suite could not run.** `playwright.config.ts` pointed `baseURL` at
  port 4004 while the server serves 4001, declared no `webServer`, and no workflow
  ran playwright. Both specs also treated the data API's 401 as a pass, so even on
  the right port they could only prove a route was mounted. The suite now boots the
  server itself, authenticates for real via a shared `globalSetup`, and asserts
  unconditionally — including that the data API _is_ gated, which the old
  `[200, 401, 403]` assertion would have let a public-data regression through.
  `retries`/`trace` are configured for CI and `e2e.yml` runs it. 11 specs pass
  against a cold database.

  **Typecheck blind spots.** `tsconfig.json` covered only `src/`, so `test/`,
  `e2e/` and `scripts/` — including the 606-line analytics-reconcile tool — were
  never typechecked. Widening `include` surfaced 45 real errors, all fixed; the
  module mode moves to `preserve`/`bundler` (nothing here is emitted by tsc) and
  `noEmit` is pinned so no stray `tsc` can scatter output into the `dist/` the
  marketplace publishes. `tsx` is now a real dependency behind
  `pnpm reconcile:analytics` — the command the script documented could not run.
  `scripts/wow1-live-schema.sh` preflights the `ai` capability it needs and
  explains why a local server does not provide it.

  **Runtime coverage.** Hooks went from 4 of 24 tested to 24 of 24, and flows from
  3 of 20 to 17 of 20 (all six scheduled sweeps included). Statement coverage of
  the hook handlers goes from 23% to 95%, functions from 22% to 95%, and
  `vitest.config.ts` gains thresholds set just under those numbers. Shared
  harnesses replace three divergent copies of the in-memory data engine and add the
  query operators the old ones lacked — an equality-only engine silently matches
  nothing for the `$lt`/`$nin` filters every scheduled sweep uses, so those flows
  could not have been tested against it. `test/runtime-coverage.test.ts` fails when
  a hook or flow arrives with no runtime test.

  **Defect these tests surfaced.** Conditional edges nested inside a `loop` body
  never evaluate: `applyConversionsToFlow` rewrites a bare string condition into a
  CEL envelope only for a flow's top-level edges, so a loop-nested condition falls
  through to the engine's legacy path and is string-compared
  (`'existingStallTask' === 'null'` → false). `opportunity_stagnation`,
  `contract_renewal` and `campaign_enrollment` are inert past that gate. The
  behaviour is pinned and documented in `test/flow-scheduled.test.ts` rather than
  fixed here — the fix changes what these production sweeps do (they would begin
  creating tasks, opportunities and notifications) and belongs in its own change.

- 8326884: Say the right protocol version and the right inventory, and gate both (#728, #729).

  Two claims the app makes about itself had drifted away from the app, and both
  shipped to customers — one in the published artifact, one on the first page a
  prospective customer reads.

  `objectstack.config.ts` still declared `engines.protocol: "^17.0.0-rc.1"` while
  `objectstack.manifest.json` and the `@objectstack/*` dependency line had moved to
  `17.0.0-rc.3`. Two platform upgrades in a row bumped the manifest and the
  dependencies and left the config behind, so `dist/objectstack.json` advertised a
  protocol version the app was not authored against. Only the major participates in
  the runtime handshake, so nothing ever failed — which is why it survived two
  releases. It now reads `^17.0.0-rc.3`.

  The README banner, the "What you get" table, the fork guide and the docs overview
  still advertised 15 objects / 23 flows / 4 dashboards. The real inventory is 17
  objects, 24 flows, 5 dashboards and 9 datasets: `crm_event` and
  `crm_event_attendee` joined the object table, and the getting-started page — which
  was a generation further behind at 13 objects — now agrees with the rest. All
  three locale faces of every affected page are updated. The `whats-new` page keeps
  its numbers: it is a dated record of what v1.0 shipped, not a claim about today.

  Both classes are now gated in `test/docs-drift.test.ts` rather than left to a
  comment. One rule holds `objectstack.config.ts`, `objectstack.manifest.json` and
  the installed `@objectstack/spec` to a single protocol version. The other compares
  every count a doc states — English and Chinese spellings alike — against the
  counts read from the registered stack at test time, never against a number written
  down in the test, so the guard cannot go stale the way the docs did.

- 0ed957a: Complete the English view labels, and guard the class that nothing was watching:
  every saved list view now has a label entry in all four locales, checked against
  the views the stack actually ships.

  Nine saved views had no `_views` label entry in the `en` bundle — `crm_task`'s
  "My Priority Tasks" and "Open Tasks · Most Overdue First", `crm_lead`'s "Hot
  Leads", `crm_account`'s "Upcoming Renewals" and "At-Risk Accounts",
  `crm_case`'s "My Open Cases" and "SLA at Risk", and `crm_opportunity`'s "Stale
  Opportunities" and "Closing This Quarter" — while zh-CN, ja-JP and es-ES all
  carried the full set. Every entry added here is the view's own metadata label
  verbatim, so no name a user reads changes.

  Nothing on the English screens was wrong, and that is exactly why it went
  unnoticed for so long: a missing key falls back to the label in the view
  metadata, which in the source locale is already correct English, so a gap and a
  correct entry render identically. It matters because the English bundle is the
  shape every other bundle is authored from — a view with no slot there is a view
  the next translator has nowhere to put — and because English silently tracked
  any rename of the metadata label while the other three locales kept translating
  the old name, with nothing red.

  The guard is the durable half. `objectstack lint` never covered this surface —
  the `lint` script passes `--skip-i18n`, and even without the flag app-authored
  view labels are not in the set it checks — so three new assertions derive the
  canonical view set from the compiled stack and require that every view has a
  label in every locale, that no locale carries an entry for a view the stack no
  longer ships, and that the English entry stays byte-identical to the metadata
  label it stands in for, which turns a silent rename into a failing test.

- 59a3d9d: Leads can be created from the console again: every conditional field on the lead
  forms now hides when it should, instead of appearing as a mandatory field nobody
  can satisfy.

  Console → Leads → New was unusable. Submit was blocked client-side with five
  "required" errors — Disqualification Reason, Duplicate Of, Duplicate Of Lead,
  Duplicate Of Contact, Duplicate Status — and no write ever reached the server.
  The form was not merely annoying, it was **unsatisfiable**: `duplicate_of_lead`
  and `duplicate_of_contact` are mutually exclusive by design, so it demanded the
  new lead be a duplicate of an existing lead _and_ of an existing contact at once.
  Creating a lead through the REST API worked (201) the whole time, because the
  object's `requiredWhen` predicates were already written correctly.

  The cause was the form predicates, in this app's own metadata. They were spelled
  with bare field names (`status == "unqualified"`), but the renderer binds field
  values under the `record` namespace, so a bare name is an unbound identifier and
  the predicate **never** evaluates — for any record, in any state. An
  unevaluable visibility predicate fails open: the field renders, and a rendered
  field enforces its `required` flag. Every such predicate in `src/views/` is
  rewritten to the `record.`-bound form the object files already use, and made
  total with `has(record.x)` guards (plus `!= null` on ordering comparisons) so it
  still answers on a brand-new record whose keys do not exist yet — prefixing alone
  would have left the same five fields failing on exactly the New form where the
  bug was reported. The `duplicate_of_lead` / `duplicate_of_contact` predicates are
  now character-for-character identical to the object's `requiredWhen`, so the form
  shows a lookup exactly when the server will demand it.

  No field, requirement or label changed — only the predicates that decide when a
  field is shown. `test/view-predicate-dialect.test.ts` enumerates every predicate
  from the compiled stack and fails on any that references an unbound namespace or
  cannot evaluate, so a bare-name predicate cannot land green again.

- 7c102d4: Closing an opportunity now REQUIRES a win or loss reason, and the Sales dashboard finally shows what those reasons say.

  `crm_opportunity.win_reason` / `loss_reason` / `loss_details` have existed since
  the object was written, and `loss_reason` even carried the comment _"required
  when stage moves to closed\_\*"_ — but nothing required anything. Both columns
  were empty on every record, including every seeded one, and no report or
  dashboard widget read them. Declared, unenforced, unused.

  **Capture.** Both fields carry a `requiredWhen` predicate — `loss_reason` on
  `closed_lost`, `win_reason` on `closed_won` — which the engine evaluates inside
  `evaluateValidationRules` on insert AND update, and reports against the field so
  the form marks the empty picklist. This is server-side: an API call, a data
  import or a bulk update that closes a deal without the applicable reason is
  rejected exactly like a rep's form is, and the record stays in its previous
  stage. Capturing at close time is not a style choice — a closed opportunity is
  frozen to its narrative fields, so a reason not recorded in the closing write can
  never be added afterwards.

  `win_reason` gains one option, **Quote Accepted**. An accepted quote closes its
  opportunity automatically (`quote_on_accepted`), and there is no human in that
  write to attribute the win; naming the automated path keeps the rule
  exception-free and keeps a CPQ close distinguishable from a rep's answer, rather
  than stamping a fabricated "Better Product" on it.

  **Analytics.** `opportunity_metrics` gains `won_count`, `lost_count`,
  `decided_count`, `won_amount`, `lost_amount` (each scoped by its own measure
  filter) and `win_rate = won_count / decided_count` as a derived ratio, plus
  `win_reason` / `loss_reason` dimensions. The Sales dashboard gains a **Win Rate
  (12M)** tile flanked by **Deals Won** and **Deals Lost**, **Win / Loss by Rep**
  and **Win / Loss by Lead Source** tables, and a **Why We Lose** loss-reason
  breakdown.

  The ratio's two halves come from the _measures_, never from a widget filter: a
  widget-level `stage` filter narrows numerator and denominator together, which is
  how a ratio quietly becomes a division by itself. Every breakdown is a table
  showing won, lost and settled counts beside the percentage, so the arithmetic
  behind the number is always on screen — the check the quota table shipped
  without in #614. Tests perturb one deal at a time (win a lost deal, lose a won
  one, add open pipeline) and assert the rate moves, moves the other way, and does
  not move, respectively.

  **Seeds.** Every settled seeded deal now carries its reason, and three more lost
  deals were added so the loss-reason breakdown has five distinct reasons and three
  lead sources carry both a win and a loss. Out of the box the demo shows a 62%
  win rate over 8 won and 5 lost deals.

  **i18n.** `win_reason` and `loss_reason` are now translated in all four locales;
  they had been missing from `ja-JP` and `es-ES`, which would have put raw stored
  values (`no_budget`, `quote_accepted`) into a picklist a rep is forced to choose
  from and into a chart legend.

  Fixes #593.

- e10b673: 按平台实况清扫「工作流规则」在 automation 页之外的散布，并写实 `service/cases` 的两条虚构通知（#850 / #887）

  ObjectStack 已退休独立的工作流规则类型（ADR-0019 / ADR-0020）——不存在 `workflow` 元数据类型、stack 上没有 `workflows` 集合、**Studio → Automation** 下只有 _Flows_（证据链见 PR #854）。automation 页在 #833 / PR #854 里已对齐实况，但另外 8 个页族 ×3 语言仍在讲这个类型，其中 4 处把「阈值 / 收件人在哪配」指向了这个不存在的配置面。本次逐处按语境写实，共 12 行 ×3 语言：

  - **指向不存在配置面的 4 处**改指真实位置，并如实写明这些是**源码作者面而非 Setup 界面**：$100K 大单阈值是 `src/flows/opportunity-won-alert.flow.ts` 里 `opportunity_won_alert` 流程的 CEL 起始条件（`record.amount > 100000`），收件人是该流程 `notify` 节点的 `recipients`（只有 `{record.owner_id}`）；工单侧的收件人是 `src/flows/case-escalation.flow.ts` 里 `notify` 节点的 `recipients`（只有 `{caseRecord.owner_id}`）。
  - `sales/opportunities` 与 `sales/pipeline-management` 的「你需要同步改三处」清单改指真实的三个源码位置：`OPPORTUNITY_STAGE_OPTIONS`（`src/objects/_picklists.ts`）、`opportunity_lifecycle` 钩子里的 `STAGE_PROBABILITY`（`src/objects/opportunity.hook.ts`）、商机对象上的 `opportunity_stage_progression` 状态机校验规则（`src/objects/opportunity.object.ts`）。
  - `reference/glossary` 的 **Workflow rule** 词条与 `reference/performance-and-limits` 的每对象上限行不静默删名，改为点名该类型已退休并指向流程；`administration/index` 与 `administration/state-machines` 的措辞改为流程 / 对象钩子。

  `service/cases` 的「工作流自动化」清单两条同步写实：_紧急时通知_ 的收件人只有工单负责人一人，`support_manager@example.com` 在本应用零命中；_升级时通知_ 不发任何邮件，`escalation_team@example.com` 同样不存在——状态变更为 _Escalated_ 真正触发的是 `src/objects/case.hook.ts` 里的 `case_status_side_effects` 钩子，它给**账户负责人**开出一条次日到期的紧急跟进任务，且仅限有关联账户的工单。触发列一并纠正为「状态变更为 _Escalated_」，而非布尔标记翻转。

  仅文档改动，`src/**` 零改动。

- 9f748ab: Wow #1 demo now names the platform `ask` agent instead of the retired
  `sales_copilot`

  The flagship "live schema" demo still POSTed `"agent": "sales_copilot"` to
  `/api/v1/ai/chat` in four places — the runnable script and all three locale
  docs. That agent was retired in #512 (app-authored agents removed; the surface
  is skills-only per ADR-0063 §2), so `loadAgent()` refuses the name and the call
  errors: `scripts/wow1-live-schema.sh` runs under `curl -fsS` and aborted at
  step 2, and the docs shipped the same body as copy-pasteable curl. All four now
  name the platform agent `ask`, and the surrounding prose describes the real
  architecture — HotCRM's `live_data` skill riding on `ask`, not an app-authored
  copilot.

  A new guard in `test/docs-drift.test.ts` pins every `agent:` / `defaultAgent:`
  value appearing in a doc code fence or a demo script against the platform agent
  set read from the spec (`AgentSchema.shape.surface`), so a self-named agent
  cannot reappear in a sample a reader is invited to paste into a terminal.

- 4c12791: Rename the Chinese label of `crm_campaign_member` from 「活动成员」 to
  「营销活动成员」, so a marketing object stops reading as part of the calendar
  family.

  Chinese translates both _campaign_ and _event_ with a word built on 活动, and the
  zh-CN pack had resolved that collision for three of the four objects but not the
  fourth:

  | object                | master         | zh-CN label (before) | after            |
  | --------------------- | -------------- | -------------------- | ---------------- |
  | `crm_campaign`        | —              | 营销活动             | unchanged        |
  | `crm_campaign_member` | `crm_campaign` | **活动成员**         | **营销活动成员** |
  | `crm_event`           | —              | 活动                 | unchanged        |
  | `crm_event_attendee`  | `crm_event`    | 活动参与者           | unchanged        |

  Dropping 「营销」 left a member object whose master is a campaign sharing a name
  space with the event tree. A Chinese user reading the navigation, a list header
  or the Org-Wide Defaults table saw 活动 / 活动成员 / 活动参与者 and took the three
  for one family — meeting, its members, its attendees — when 活动成员 belongs to
  the other tree entirely. On the Org-Wide Defaults page the three rows are
  adjacent, and only the parent object in parentheses said otherwise.

  The English labels (`Campaign Member` / `Event` / `Event Attendee`) never had the
  collision and are untouched, as are es-ES (`Miembro de Campaña` vs `Evento`) and
  ja-JP (`キャンペーンメンバー` vs `イベント`), which were checked and are clear.

  The zh-Hans and zh-Hant documentation pages translate object labels themselves
  rather than reusing the locale pack, so they carry the same rename: 营销活动成员
  and 行銷活動成員 respectively, in the Org-Wide Defaults table, the profile grant
  lists, the automation examples and the Marketing Cloud pages.

- 910acfc: Simplified Chinese is now complete on every authored surface — the last 98 gaps outside picklist options are filled, and a test keeps them filled.

  #645 finished select-option coverage in Chinese, which left zh-CN complete on the
  one surface anyone had a ledger for. The other four an authored bundle owns were
  still English, and they were not small: **every page in the app** rendered its
  nav label, breadcrumb and header in English, so a Chinese-language trial saw
  "Opportunity Detail" above a fully translated opportunity record. The six
  win/loss widgets #593 added to the Sales dashboard shipped untranslated for the
  same reason, as did 55 field labels/help strings, the two Lead empty states, and
  the campaign picker inside `create_campaign`.

  The `pages` group did not exist in `zh-CN.ts` at all, which is why the whole
  surface was missing rather than partly filled. Header copy is addressed by the
  PAGE name (`pages.<name>.title` / `.subtitle`) — a `page:header` carries no
  stable id, so the page name is the only identifier that reaches it. Strings
  holding `{field}` tokens keep the token spelling verbatim: the console
  substitutes on the raw key, so a translated token resolves to nothing and the
  header renders blank.

  **Why no existing check caught this.** `objectstack lint` has the rules that find
  every one of these gaps, and CI never runs them: `pnpm lint` is
  `objectstack lint --skip-i18n`, and `objectstack lint` exits 0 on warnings
  regardless. The i18n rules are switched off in the one place that would fail a
  PR. So the guard lands in `test/metadata-references.test.ts` — five assertions
  walking the metadata (357 field strings, 8 pages, 90 widget strings, 4 empty
  states, 11 action-param labels) and requiring a zh-CN entry for each. All five
  were confirmed to fail when a translation is removed; this suite already carries
  one green-but-vacuous test in its history, which is why they were mutation-checked
  rather than trusted.

  Scoped to zh-CN deliberately. `en` / `ja-JP` / `es-ES` still carry the debt
  enumerated in #645 and #494 — widening these assertions is that work's finish
  line, not its entry fee.

  View **tab** labels remain untranslatable and are not addressed here: `tabs[].label`
  has no translation key in `ObjectTranslationDataSchema` and no resolver in
  `i18n-resolver.ts`, so the gap is upstream rather than in this repo (#661).

- e68b333: Simplified Chinese now translates every select field's options, so no picklist in the zh-CN UI renders a raw stored value.

  Fifteen select fields across nine objects had no option labels in **any** of the
  four locales. A missing entry is not a runtime error — the resolver falls back to
  the English `label` in code, and where a field had no entry at all the picklist
  rendered the raw stored value. On an otherwise fully translated Chinese screen a
  rep saw `net_30` in Contract payment terms, `waiting_customer`-style bare keys in
  Task type, and `crm_account` in a Task's "related to" picker. Contract, Quote and
  Product were the worst hit: `crm_product.billing_type` and
  `crm_product.unit_of_measure` had no zh-CN entry whatsoever, so even the field
  labels were English.

  The fields completed here:

  | Object                  | Fields                                                     |
  | ----------------------- | ---------------------------------------------------------- |
  | `crm_case`              | `type`                                                     |
  | `crm_contact`           | `salutation`                                               |
  | `crm_contract`          | `billing_frequency`, `payment_terms`, `contract_type`      |
  | `crm_knowledge_article` | `category`, `tags` (partial — 2 and 4 values were missing) |
  | `crm_opportunity`       | `competitors`                                              |
  | `crm_product`           | `family`, `billing_type`, `unit_of_measure`                |
  | `crm_quote`             | `payment_terms`                                            |
  | `crm_task`              | `type`, `related_to_type`, `recurrence_type`               |

  Wording pairs with each field's neighbours in the same bundle rather than
  rendering the English literally: `crm_task.related_to_type`'s options are object
  names, so each one reuses that object's own `label` from this bundle (`crm_account`
  → 客户), and `crm_quote.payment_terms` is worded identically to
  `crm_contract.payment_terms`, which shares its option set.

  `PENDING_SELECT_LABELS` in `test/metadata-references.test.ts` shrinks by these 15
  rows' zh-CN entries — the ledger may only ever shrink, and the guard fails a row
  that has since been translated as stale. No row lists `zh-CN` any more, so the
  `UNTRANSLATED_EVERYWHERE` shorthand is retired; Simplified Chinese is now the one
  locale with complete select coverage. `en`, `ja-JP` and `es-ES` keep their rows
  and remain the open scope of #645.

  Full `objectstack lint` i18n warnings drop from 873 to 803.

  Refs #645.

- 7d28450: Call `crm_campaign` by one name in the simplified-Chinese docs. The locale pack
  ships the object as 「营销活动」 and fourteen zh-Hans pages already used that
  word, but the two administration pages called it 「市场活动」 — so the sharing
  page named the master one way and the detail directly under it the other, on
  adjacent rows of the same table:

  ```
  | 市场活动     | 公共只读             | 营销创建，销售查看                     |
  | 营销活动成员 | 由父级控制（市场活动） | 成员关系是市场活动的一个属性 …… |
  ```

  An admin reading that table cannot tell whether 「市场活动」 and 「营销活动成员」
  belong to the same object family, and neither word takes them to the right entry
  in Setup, where the object is listed as 「营销活动」.

  Now every zh-Hans page — the OWD table, the built-in sharing-rules table, the
  three profile grants, and the marketing card on the docs home page — uses
  「营销活动」, matching the pack and the traditional-Chinese pages (which already
  said 「行銷活動」 throughout). No label, no English page and no zh-Hant page
  changed; this is a wording fix in the simplified-Chinese documentation only.

- d41db36: The Chinese sales pages now name lead statuses, the quote expiry date, the
  reports-to field and every field-group heading the way the shipped locale pack
  does.

  `src/translations/zh-CN.ts` is what a Chinese reader sees on screen, and four
  pages had drifted from it. Each of these sent a reader looking for a word the
  product never displays:

  - **Lead statuses.** `crm_lead.status` ships 「已确认 / 未通过 / 已转化」; the Leads
    pages called them 「已审核 / 不合格 / 已转换」 — in the status table and in every
    sentence downstream of it (the reopen note, the duplicate-handling step on the
    Traditional page, the conversion section heading and its steps, the rep tip).
    All of them now follow the pack, on both zh-Hans and zh-Hant.
  - **The convert vocabulary.** `convert_lead` is 「转化线索」 and `is_converted` is
    「已转化」, so the pages' 「转换」 spelling disagreed with the button the reader
    clicks — and with the same page's own conversion block, which already said
    转化. The verb face is now 转化 throughout.
  - **`expiration_date`.** The Simplified quotes page called it 「过期日期」 in four
    places while the pack says 「到期日期」 — and the same page already used 到期日期
    in three others, so it contradicted itself. The Traditional twin was correct
    throughout; neither page can be used as the other's proofreading baseline.
  - **The `expired` quote status** on the Traditional sales index, which said
    「已到期」 where the pack says 「已過期」 — the same word fixed on the quotes page
    earlier, on a page that fix did not cover.
  - **`reports_to`.** The contacts pages' prose still called it 「汇报对象」 after the
    field-group tables were corrected to the pack's 「直属上级」, leaving each page
    disagreeing with itself two screens apart.
  - **Field-group headings.** The block tables on the Leads and Contacts pages are
    the objects' field groups, whose Chinese headings live in each object's
    `_sections`. Rows that translated the English heading independently now use
    the shipped one: 身份 → 身份信息, 联系信息 → 联系方式, 资格审核 → 资格评估,
    转换 → 转化, 客户与角色 → 客户与职务, and 指派 → 分配 on the Traditional leads
    page.

  Verb and mechanism usages are deliberately untouched, because they are not
  labels: 「报价到期」 names the nightly mechanism, 「每日过期扫描」 the sweep,
  「即过期的报价」 and 「通过资格审核」 are actions a person takes, not the
  `qualification` field group.

  Terms belonging to a different object keep that object's wording — the pack
  gives `crm_lead._sections.qualification` 「资格评估」 and `crm_opportunity.stage`
  「资格审查」 on purpose, so same-named things are not unified across objects.

  Documentation only: the locale pack is the contract, so nothing under `src/`
  changed.

  Fixes #801.

- 95ee1a4: The Chinese docs now name the seven opportunity stages the way the shipped
  locale pack does, and the remaining lead-convert verb face follows the action
  label.

  `src/translations/zh-CN.ts` is what a Chinese reader sees on screen. Four of the
  seven `crm_opportunity.stage` option labels had drifted — and unlike the earlier
  term fixes this was not one page getting a word wrong, it was every Chinese page
  consistently using a second vocabulary the product never displays:

  | value           | pack ships | docs said |
  | --------------- | ---------- | --------- |
  | `prospecting`   | 寻找客户   | 开发期    |
  | `qualification` | 资格审查   | 资格审核  |
  | `closed_won`    | 成交       | 赢单      |
  | `closed_lost`   | 失败       | 输单      |

  `needs_analysis` / `proposal` / `negotiation` already matched and are untouched.
  Both stage tables (Opportunities and Pipeline Management, zh-Hans and zh-Hant)
  now carry the shipped labels, and so does every sentence that names a stage: the
  drag-to-advance example, the close-reason table, the $100K alert, the approval
  outcome, the quote-accepted advance, the lead-conversion step that creates an
  opportunity, and the glossary's closed-won/lost entry.

  **A word the pack ships nowhere is drift wherever it appears; a word the pack
  does ship is only drift where it names the stage.** 开发期, 资格审核 and 输单
  appear nowhere in the pack, so they are gone from the Chinese docs entirely —
  except 开发期 on the integrations pages, where it means the development
  environment and not the `prospecting` stage. 赢单 and 丢单 by contrast _are_ the
  pack's own outcome vocabulary (赢单原因, 丢单原因, 赢/丢单详情, 赢单数, 丢单数,
  赢单概率), so they stay wherever they name a reason, a metric or an outcome, and
  change only where the reader would go looking for that word as a stage value.
  That is why 「未赢单、未丢单的交易」, 「赢单率」 and 「赢单原因」 read as before
  while 「阶段会被自动设为**赢单**」 became 成交.

  Where the docs paired 赢单 with the non-pack 输单 to name the two _reason
  fields_ rather than the stages — the state-machine close requirement, the cube
  dimension, the Win/Loss report — the pack's counterpart is 丢单, not 失败, so
  those became 赢单/丢单.

  Two terms belonging to different objects stay separate, as the pack intends:
  `crm_opportunity.stage.qualification` is 「资格审查」 and
  `crm_lead._sections.qualification` is 「资格评估」. The Leads pages' 「通过资格审核」
  is a thing a person does, not either label, and is untouched.

  **The convert verb face.** `convert_lead` ships the label 「转化线索」, but the
  Sales Copilot page named that very button 「转换线索」. That page now uses the
  shipped label, and the traditional-Chinese residuals left over when the
  simplified twins were corrected — Accounts, Quick Tour, Introduction, Testing
  and CI, and the Traditional Sales Copilot page, which named the action
  「轉換潛在客戶」 — now read 转化 / 轉化 as well.

  Documentation only: the locale pack is the contract, so nothing under `src/`
  changed.

  Fixes #829.

- 48970f7: Document the `Unassigned Cases — Triage` sharing rule on both Chinese
  Sharing & Security pages. The rule shipped on 2026-08-12 together with its
  English table row and never reached
  `content/docs/administration/sharing-and-security.zh-Hans.mdx` or
  `.zh-Hant.mdx`, so both listed nine of the app's ten built-in sharing rules —
  on the app's own security page, where the table is the admin's roster of what
  is widened out of the box.

  The row that was missing is the app's only grant over records with **no owner
  at all**: every holder of the `service_agent` position gets **edit** on open,
  unowned cases, which is what makes the pinned _Unassigned — triage_ tab
  workable. A Chinese-reading admin auditing who can reach unassigned case intake
  was shown a complete-looking table that did not contain the answer.

  Both new rows are taken from `src/sharing/case.sharing.ts` — object, access
  level, position and the criteria that select the records — and follow each
  page's existing translation conventions; the rule name stays English, as every
  other row on those tables already does. No sharing rule changed: who can reach
  an unowned case is exactly what it was before, and is now written down in all
  three languages. Refs #1239, #1096.

- ff208da: The two analytics pages that still said 「轉換率」 in Traditional Chinese now say
  「轉化率」, matching their Simplified twins line for line.

  `#844` swept the lead **convert** verb to 转化 / 轉化 across every Chinese page,
  but its "not part of this issue" list excluded the analytics **conversion rate**
  phrase on the grounds that it is a metric name rather than the convert verb. On
  the baseline that reason does not hold:

  - **No Simplified page anywhere says 转换率.** The Simplified twins of both
    lines already read 转化率 — `content/docs/analytics/cubes.zh-Hans.mdx:124` and
    `content/docs/analytics/reports.zh-Hans.mdx:32` — so the exclusion did not
    protect a metric spelling, it just left the Traditional side behind.
  - **Conversion rate has no label surface to be a metric name against.** The
    phrase appears nowhere under `src/`; it is prose each page translates for
    itself, so there is no locale-pack entry giving it a word contract independent
    of the convert verb. The nearest anchors the pack does provide both follow
    转化: `crm_forecast.num_converted_leads.label` is 「已转化线索数」 and the
    dashboard's `open_leads.title` is 「未转化线索」
    (`src/translations/zh-CN.ts`).
  - **The exclusion left each page contradicting itself.**
    `content/docs/analytics/cubes.zh-Hant.mdx` said 「轉化數量」 at `:108` and
    「轉換率」 sixteen lines later; `content/docs/analytics/reports.zh-Hant.mdx`
    said 「轉換率」 in one table row at `:32` and 「轉化」 in another at `:59` —
    both halves fixed by #844 — which is exactly the half-right page #801 objected
    to.

  `test/docs-conversion-rate-spelling.test.ts` keeps it from drifting back. No
  locale-pack key exists for the phrase, so the check lives where the claim does —
  it sweeps every Chinese page for the rejected spelling and, separately, asserts
  the two pages still state the metric, so deleting the sentence fails as loudly as
  mis-spelling it.

  Two lines changed, both Traditional. State-transition 转换 / 轉換, data-type
  coercion and contract activation keep their spelling everywhere — they are a
  different word that happens to share the old convert translation, and #844's
  reading of that boundary is unchanged. English and Simplified pages were already
  right, and nothing under `src/` changed.

  Fixes #905.

- 42eebab: The lead **convert** verb now reads 转化 / 轉化 on every Chinese page, not just
  the Simplified ones.

  `src/translations/zh-CN.ts` is the contract: `convert_lead.label` is 「转化线索」
  and `is_converted` is 「已转化」, so the docs say 转化 (#801/#825/#829). Two
  distinct gaps were left after those passes, and both showed up as a reader
  seeing a word the product never displays:

  - **The Traditional twin never moved.** Seventeen places across
    `content/docs/marketing/campaign-members.zh-Hant.mdx`,
    `content/docs/marketing/campaigns.zh-Hant.mdx`,
    `content/docs/marketing/index.zh-Hant.mdx`,
    `content/docs/analytics/cubes.zh-Hant.mdx`,
    `content/docs/analytics/dashboards.zh-Hant.mdx`,
    `content/docs/analytics/reports.zh-Hant.mdx`,
    `content/docs/reference/glossary.zh-Hant.mdx` and
    `content/docs/guides/files-and-comments.zh-Hant.mdx` still said 轉換 while the
    Simplified line beside them already said 转化 — same sentence, same table row,
    two different verbs. Neither page can be used as the other's proofreading
    baseline.
  - **Five pages no pass had reached at all**, in both scripts:
    `content/docs/sales/index`, `content/docs/administration/setup`,
    `content/docs/administration/sandbox-and-releases`,
    `content/docs/administration/state-machines` and
    `content/docs/administration/automation`. The two go-live smoke-test
    checklists walked an admin through 「潜在客户 → 转换 → 商机」, naming a step the
    Convert button does not call itself.

  On `content/docs/administration/automation` the flow row is now
  「线索转化流程 / 線索轉化流程」 and its description follows. That page's row labels
  are pinned in `test/automation-docs-coverage.test.ts` — flows carry no locale-pack
  entry, so the ledger is where the Chinese spelling lives — and the entry moves in
  the same commit, not after it.

  **状态转换 is untouched, and that is the point on the state-machine page.**
  「转换」 there names the state-machine mechanism (state transition), a different
  word that happens to share a spelling with the old convert translation. Only the
  three lead-convert sentences changed on that page — the Convert wizard row, the
  Copilot suggestion, and the wizard-testing tip — while the ten mechanism
  sentences around them keep 转换. The same reading spares the contract-activation
  sentence on `content/docs/revenue/contracts`, the datetime-filter note on
  `content/docs/analytics/dashboards`, and the type-coercion prose on
  `content/docs/guides/import-and-export` and
  `content/docs/guides/importing-your-data`.

  Documentation only, Chinese pages only — the locale pack is the contract, so
  nothing under `src/` changed and the English pages, which say "convert"
  throughout, were already right.

  Fixes #844.

All notable changes to HotCRM are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); HotCRM follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

Everything merged after the 2.2.2 tag. Not yet versioned or published.

### Changed

- **ObjectStack platform → 17.1.0** across all 12 `@objectstack/*` packages (from 17.0.0); `specVersion` and `engines.protocol` follow to `^17.1.0` in lockstep (`objectstack.manifest.json` and `objectstack.config.ts`) — the `docs-drift` guard binds `specVersion` to the installed spec exactly and requires the two manifest fields to state one version (#728). Verified against the full `pnpm verify` suite and a booted server; the upgrade is a clean drop-in for this app.
  - **`objectstack build` compiles unchanged.** 17.1 ships 33 parse-time "accept-set narrowings" (ADR-0078, breaking at validate/build), but every one targets a declared-but-inert or malformed key, and this app authors none of them: all `Field.number` `scale`/`precision` are integers, every `indexes[]` entry is `{ fields }` only, and no `record:*`/`reference:rail`/dotted-path-filter surface it touches carries an offending key.
  - **Platform object field rename (test-harness only for this app):** `sys_user_permission_set` now names its lookup `permission_set_id` (not `permission_set`), and the object is strict, so a write carrying the old key is refused. HotCRM's runtime and seed never write this platform object — only two grant helpers in `test/contract-write-depth.test.ts` and `test/parent-derived-reach.test.ts` did, and they already wrote `permission_set_id` alongside the legacy key; the stale line is removed.
  - **Runtime behaviour to watch, exercised green by the suite:** (a) `@objectstack/objectql` no longer strips a hook-derived value written to a `readonlyWhen`-locked field (#9107) — HotCRM's hooks that stamp locked fields now persist as intended; (b) `@objectstack/service-automation` answers **409** for a request routed at a disabled trigger and re-validates node input on every retry.
  - **Available but not adopted:** `ActionSchema.onSuccess` post-success navigation for `api`/`script` actions (with `${result.*}` in the navigate scope). No action was changed to use it.
  - **Pre-existing, not introduced here:** `os validate` still emits ADR-0087 deprecation warnings for a handful of page keys removed back in 17.0.0 (`page:header.icon`, `page:tabs.type`→`tabStyle`, `record:details.layout`, `page:card.body`→`children`). They are soft warnings the build strips, unchanged by this bump; cleaning them is tracked separately.
- **ObjectStack platform → 17.0.0-rc.2** across all `@objectstack/*` packages (from 17.0.0-rc.1); `specVersion` and `engines.protocol` follow. Four of the rc.1 → rc.2 changes were live defects in metadata this app already had, and each was verified against a booted server and a real browser session:
  - **`demo_bootstrap` could no longer find its user.** The sweep opened with `get_record(sys_user)` on an empty filter, which `findOne` used to answer with an arbitrary row; rc.2 refuses a `findOne` that names no record (upstream #4419), so the flow failed on its second node and every seeded record stayed ownerless — the "My …" views empty for everyone and every owner-addressed `notify` reaching nobody. It now reads a list and binds its first row through an `assignment` node, which states the arbitrary pick rather than smuggling it through a call that claimed to name one. Guarded with `has(vars.firstUser)` so a zero-user org still completes. Re-verified end to end: one manual run claimed 115 records across all eight objects, both ownership columns.
  - **`lead_conversion` could no longer convert a lead.** rc.2 holds a screen resume to the screen's declared field contract (#4477), and `createOpportunity` — a checkbox with `defaultValue: false` — was marked `required`, so a runner posting only what the user touched had its resume refused with `INVALID_SCREEN_INPUT`. A checkbox has no unanswered state; the flag is gone and the default (plus the `init_defaults` assignment) supplies the answer, as it always actually did.
  - **Nine `decision` nodes carried an inert copy of their branch predicate**, now flagged by rc.2's `flow-inert-node-condition` (#4414). The engine reads the out-edges, so the node copy restated the gate without being the gate. Copies deleted, totality rationale moved to the edges. Behaviour unchanged, and re-verified per flow in the browser: two-tier approval routing (>$500K → `director_signoff`, ≤$500K → approved), `lead_assignment`'s 1-day/3-day SLA partition including the unrated lead, and `quote_generation` advancing `needs_analysis` → `proposal`.
  - **`translation.validationMessages` removed** from all four locale bundles — rc.2 retires the key (#4667), and the three messages under it matched no rule in this app.
  - Two pinned "platform gap" assertions flip because the platform closed the gap: a filtered measure that selects nothing now reports `0`, so a lead source that only ever lost reads **0%** rather than blank (#4708); and a bare-string condition inside a `loop` body is now CEL-parsed like its envelope twin (#4336). The explicit envelopes stay — they declare the dialect and keep these flows correct on a runtime that still carries the old path.
  - Validation predicates now fail **closed** (#4649) — the upstream question `test/object-validation-predicates.test.ts` filed, answered. An unevaluable predicate used to be skipped silently and now rejects the write. HotCRM's predicates are already total, so nothing changes at runtime; AGENTS.md and that file now state the outcome an author actually gets.
- **ObjectStack platform → 17.0.0-rc.1** across all `@objectstack/*` packages (from 16.1.0). The manifest protocol handshake and marketplace `specVersion` now declare the 17.0.0-rc.1 compatibility line; API methods, skills and flow notifications use only live metadata keys; pre-17 required fields preserve their database `NOT NULL` constraints explicitly; and the analytics semantic layer now declares the month/day/quarter buckets v17 executes correctly.
- **`allowExport` is authored on every profile that needs it (17.0 opt-in export axis, upstream #3544).** Before 17.0 an unset `allowExport` inherited read, so "can list ⇒ can export". 17.0 inverted the default: `resolveUserExportAllowed` demands an explicit `allowExport: true` and neither `viewAllRecords` nor `modifyAllRecords` substitutes, so an unset bit now DENIES — at both bulk-egress doors, the list views' built-in `exportOptions` and `ReportService.assertExportAllowed`. No profile carried the bit, which would have 403'd every CSV/XLSX and report export for every user, `system_admin` included, while `os validate`, `os build` and the whole test suite stayed green. The five objects with a real export surface (`crm_account`, `crm_case`, `crm_contact`, `crm_lead`, `crm_opportunity`) now carry the grant on each profile that already reads them; `guest_portal` deliberately carries none (ADR-0090 D9 forbids binding a high-privilege set to the `guest` anchor). Pinned by `test/authorization-coverage.test.ts`, which fails both on an export surface nobody can reach and on a grant with no surface behind it.
- Approval nodes in `opportunity_approval` use the native `onEmptyApprovers: 'admin_rescue'` policy instead of the hand-rolled `org_membership_level: 'owner'` approver. That entry existed only to avoid the empty-position dead-end, and with `behavior: 'first_response'` it overshot — it made an org owner a routine approver on every deal over $100K, not a rescue when the bench is empty.
- Media fields (`crm_product.image`, `crm_product.datasheet`, `crm_account.logo`, `crm_contact.avatar`) declare `accept` and `maxSize`. 17.0 enforces both server-side against the stored `sys_file` (ADR-0104 D3 wave 2); before, the upload widget read them but `FieldSchema` dropped them at parse, so the constraint never reached a direct API caller.
- Docs: [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) §3.2 covers the `os migrate` data gates (`files-to-references`, `value-shapes`) and the `OS_ALLOW_LAX_*` escape hatches. `pnpm verify` and `demo:reset` cannot catch these — they start from an empty database, so a green local run says nothing about an in-place upgrade.
- **ObjectStack platform → 16.1.0 stable** across all `@objectstack/*` packages (from the 16.0.0-rc.1 line pinned in 2.2.0). [#465](https://github.com/objectstack-ai/hotcrm/pull/465)
- CI: bump `actions/checkout` 4 → 7 ([#422](https://github.com/objectstack-ai/hotcrm/pull/422)) and `actions/setup-node` 4 → 6 ([#421](https://github.com/objectstack-ai/hotcrm/pull/421)).
- Docs: README hero states HotCRM's size in tokens ([#483](https://github.com/objectstack-ai/hotcrm/pull/483)); drifted README counts fixed ([#466](https://github.com/objectstack-ai/hotcrm/pull/466)).

### Added

- **Lookup/global search plus the P1 CPQ & intake surfaces.** [#468](https://github.com/objectstack-ai/hotcrm/pull/468)
- **Rep work queues**, and the "My Open Deals" view fixed along the way. [#485](https://github.com/objectstack-ai/hotcrm/pull/485)
- Navigation entry points so every shipped capability is reachable in-app. [#482](https://github.com/objectstack-ai/hotcrm/pull/482)
- Flow runtime test harnesses: `lead_conversion` ([#469](https://github.com/objectstack-ai/hotcrm/pull/469)) and `quote_generation` ([#470](https://github.com/objectstack-ai/hotcrm/pull/470)).

### Added

- **`engines.protocol` compatibility range declared ([#529](https://github.com/objectstack-ai/hotcrm/issues/529)).** The app never declared the metadata/runtime protocol range it is authored against, so a newer runtime loaded it _unchecked_ — ObjectStack 17.0 warns `package 'app.objectstack.hotcrm' declares no engines.protocol range; loading under protocol 17.0.0 without a compatibility check (ADR-0087)`. The stack manifest in [`objectstack.config.ts`](objectstack.config.ts) (the manifest the ADR-0087 load-time handshake actually reads) and [`objectstack.manifest.json`](objectstack.manifest.json) now both declare `engines.protocol: "^16.0.0"`, matching the installed `@objectstack/*` 16.x line. A runtime on a different protocol major now refuses the load up front with the structured `OS_PROTOCOL_INCOMPATIBLE` diagnostic (naming the `objectstack migrate meta` replay command) instead of failing deep in a schema parse. The platform-upgrade checklist ([docs/MAINTENANCE.md](docs/MAINTENANCE.md) §3) now includes bumping this range alongside `specVersion`.

### Fixed

- **P0 core-correctness sweep.** [#467](https://github.com/objectstack-ai/hotcrm/pull/467)
- **Same-named picklists unified into one canonical value set (`src/objects/_picklists.ts`); seed data aligned with what the hooks would compute** — cross-object copies in `lead_conversion` no longer produce illegal enum values, autonumber fields are no longer hand-seeded, and case/opportunity/forecast seed rows match their hooks' derived fields. Fixes [#490](https://github.com/objectstack-ai/hotcrm/issues/490) via [#516](https://github.com/objectstack-ai/hotcrm/pull/516).
- `lead_auto_assign` now handles anonymous Web-to-Lead submissions. [#471](https://github.com/objectstack-ai/hotcrm/pull/471)
- Demo org made demonstrable ([#481](https://github.com/objectstack-ai/hotcrm/pull/481)) and dangling UI references repaired ([#480](https://github.com/objectstack-ai/hotcrm/pull/480)).
- i18n: dead option/section/widget translations re-keyed; missing zh-CN coverage added. [#498](https://github.com/objectstack-ai/hotcrm/pull/498)
- Hook catch blocks no longer call `console.*`. [#472](https://github.com/objectstack-ai/hotcrm/pull/472)
- StackBlitz demo: bootstrap under pnpm 10 in the WebContainer ([#464](https://github.com/objectstack-ai/hotcrm/pull/464)), boot with npm instead of a global pnpm install ([#484](https://github.com/objectstack-ai/hotcrm/pull/484)), and turn off the OIDC provider so the demo can log in ([#486](https://github.com/objectstack-ai/hotcrm/pull/486)).

## [2.2.2] — 2026-07-21

Patch before the ObjectStack 16 marketplace release. Fixes [#459](https://github.com/objectstack-ai/hotcrm/issues/459) — the highest-severity issue from the v2.2.1 QA dogfood.

### Fixed

- **Opportunity/quote freeze-guards no longer reject system/seed writes → 23 boot errors gone + closed-won probability corrected.** The `opportunity_lifecycle` and quote freeze-guards ran on **every** write to a closed/accepted record, so the seed re-applying rows on reboot (its `close_date: daysAgo(15)` / `quote_date` re-evaluate to a _new_ date each boot) was rejected — logging 23 `BodyRunner` errors per boot and blocking the seed from setting closed-won `probability` to 100 (it fell back to the field default `10`). Both guards now fire **only for genuine user edits** (`ctx.user?.id` present); system/seed/backfill writes (no user) pass — matching this repo's system-write convention (`case`/`lead` hooks) and the guards' own stated intent. A user editing a closed opportunity or accepted quote through the UI is still blocked. Fixes [opportunity.hook.ts](src/objects/opportunity.hook.ts) + [quote.hook.ts](src/objects/quote.hook.ts).

## [2.2.1] — 2026-07-20

Follow-up patch to 2.2.0. The dashboard-filter fix in 2.2.0 only covered the built-in `dateRange` picker; the **`globalFilters[]`** have the same propagation behaviour (ObjectStack 15 / framework#2501 injects every dashboard filter into each widget's query) and were still crashing widgets on objects that lack the filtered field. Browser-verified by actually selecting the filter values, not just loading the dashboards.

### Fixed

- **Selecting the Executive dashboard's `Lead Source` filter crashed every account widget.** The `lead_source` global filter was injected into each widget's query; `crm_account` has no `lead_source` column, so `total_accounts`, `new_accounts_by_month`, and `accounts_by_industry` failed with `SqliteError: no such column: lead_source`. Added `lead_source: false` to those three widgets' [`filterBindings`](src/dashboards/executive.dashboard.ts) (they keep `dateRange: false` too). `crm_contact` and `crm_lead` _do_ have `lead_source`, so `total_contacts` / `open_leads` correctly keep filtering. Verified in the browser: selecting `Lead Source = Web` now returns filtered/empty results with zero analytics errors.
- **CRM dashboard's `Owner` filter would crash `top_products`.** `crm_product` has no `owner` column, so the `owner` global filter would fail the product-category widget the same way. Added `owner: false` to its [`filterBindings`](src/dashboards/crm.dashboard.ts) (alongside the existing `dateRange: false`).
- Full field-vs-filter matrix audited across all four dashboards: Sales (all `opportunity_metrics`, which has `owner`/`type`/`close_date`) and Service (`created_date`/`owner`/`priority` all on `crm_case`) needed no change.

## [2.2.0] — 2026-07-20

Platform upgrade to ObjectStack **16.0.0-rc.1** — the 16 release-candidate line (from 14.7, skipping the entire 15.x line). Manifest `specVersion` now declares `^16.0.0-rc.1` (was `^14.0.0`); app version `2.2.0`. ObjectStack 16 finishes the ADR-0049 "enforce-or-remove" sweep (dead metadata props now fail loudly instead of parsing inert), converges the hook/action org identifier on `organizationId`, flips `.strict()` on dashboard-widget / view-form / page schemas, and — most consequentially for this app — makes the `ai` capability a **fail-fast hard requirement** resolved to the closed `@objectstack/service-ai` package. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* 16.0.0-rc.1` (boot → 38 plugins loaded → 17 flows / 15 trigger-bound → `/_console/` login renders at HTTP 200 with no boot or console errors).

Upgrade migration was driven from the official release notes at <https://objectstack.ai/docs/releases/v16> (and `/v15`), cross-checked against the per-package `CHANGELOG.md`, per [`AGENTS.md`](AGENTS.md).

> **Toolchain note:** install under Node **22** (the `.nvmrc` LTS pin). A transitive dep (`nanoid@6`) declares `engines.node` excluding odd-numbered releases, so `pnpm install` fails under Node 25 with `engine-strict=true`.

### Changed

- **ObjectStack platform → 16.0.0-rc.1** across all 11 `@objectstack/*` packages (from `14.7`), pinned to the exact RC version.
- **Dropped `ai` from the stack's `requires` ([objectstack.config.ts](objectstack.config.ts)).** ObjectStack 11.3.0 (ADR-0025 S2) removed `@objectstack/service-ai` from the open edition — the AI runtime ships only in the closed cloud package, whose latest open-registry version is `10.3.0`. Under 16, `requires: ['ai']` is a **fail-fast** capability: the serve command hard-aborts boot when the package is absent (the AI block runs before every other capability resolves), so `objectstack start`/`dev` for this open-edition app failed with `[AI] required but @objectstack/service-ai is not installed`. The AI **metadata is unaffected** — both agents + all skills still validate, compile into the artifact, and run wherever a runtime provides the `ai` tier (cloud's `objectos-runtime`). A local open-edition boot simply omits the AI service and hides its Console surface. (This was never caught before because the `verify` script boots nothing — `validate`/`typecheck`/`build`/`test` all resolve metadata only, not capability provider packages.)
- **Removed the dead `visibility` field from both agents** (`sales-copilot`, `service-copilot` — both agents since retired in [#512](https://github.com/objectstack-ai/hotcrm/pull/512)). ObjectStack 16 removes `AgentSchema.visibility` (ADR-0049 / ADR-0056 D8): it was never enforced — a `private`/`organization` value never restricted an agent — so a security-shaped field with no runtime consumer is a liability. `AgentSchema` is not `.strict()`, so it was being silently stripped; removed for honesty. Restrict agent access via the enforced `access`/`permissions` surfaces instead.

### Fixed

- **Dashboard date-range picker no longer crashes widgets on objects without the date field.** ObjectStack 15 (framework#2501, `GlobalFilterSchema.name` + `DashboardWidgetSchema.filterBindings`) wired dashboard-level filters — including the built-in `dateRange` picker (reserved filter name `dateRange`) — into **every widget's analytics query**. At 14.7 the picker didn't propagate; under 16 it injects its `field` into each widget's SQL. The Executive and CRM dashboards bind `dateRange` to `close_date`, which only exists on `crm_opportunity` — so every widget on `crm_account` / `crm_contact` / `crm_lead` / `crm_product` failed with `SqliteError: no such column: close_date` and rendered as an error card. Each affected widget now declares `filterBindings: { dateRange: false }` to opt out of the picker (they carry their own `created_at` / count semantics): 5 widgets on [executive.dashboard.ts](src/dashboards/executive.dashboard.ts) (`total_accounts`, `total_contacts`, `open_leads`, `new_accounts_by_month`, `accounts_by_industry`) and 1 on [crm.dashboard.ts](src/dashboards/crm.dashboard.ts) (`top_products`). The Sales dashboard (all-`opportunity_metrics`) and Service dashboard (`dateRange` bound to `created_date`, which `crm_case` has) needed no change. Browser-verified: all four dashboards load with live data and zero analytics/SQL errors. (This surfaces only when the dashboards are actually rendered against seeded data — `verify` builds the artifact but never queries it.)

### Removed

- **Dead dashboard header action buttons.** All four dashboards declared header `actions` (Export PDF, Schedule Email, Customize, New Opportunity/Deal/Lead/Case, Forecast, Reports, My Queue, SLA Report) that pointed at actions or routes which were never implemented — `export_dashboard_pdf` / `schedule_dashboard_email` / `customize_dashboard` / `create_opportunity` / `create_lead` / `create_case` are not defined actions, and the `url` targets (`/reports/forecast`, `/reports/sla`, `/reports`, `/objects/case?owner=current_user`) match no in-app view route. They rendered as buttons that did nothing when clicked. Removed the `header.actions` block from [executive](src/dashboards/executive.dashboard.ts), [sales](src/dashboards/sales.dashboard.ts), [crm](src/dashboards/crm.dashboard.ts), and [service](src/dashboards/service.dashboard.ts) dashboards (titles/descriptions kept), plus the now-orphaned action-label translations from all four locale bundles (`en`, `zh-CN`, `ja-JP`, `es-ES`). Pre-existing dead affordance, unrelated to the upgrade; re-add real, wired-up actions when those features exist.

### Verified clean (no change needed)

The rest of the 15→16 enforce-or-remove surface did not touch this app, confirmed by source scan + a clean build:

- **Hook/action `ctx.session.tenantId` → `organizationId`** — no `tenantId` reads anywhere.
- **Removed object props** (`versioning`/`softDelete`/`search`/`recordName`/`keyPrefix`/`tags`/`active`/`abstract`) and **field props** (`vectorConfig`/`fileAttachmentConfig`/`dependencies`/`columnName`/`index`/`referenceFilters`) — none authored (only historical comments).
- **Dashboard-widget `.strict()`** — the pivot's `rowField`/`columnField`/`valueField` live inside the `options: {}` escape hatch; widgets use the canonical `dataset`/`dimensions`/`values` shape.
- **Collapsed hook events** (18 → 8), **validation `events: ['delete']`**, **webhook `undelete`/`api` triggers**, **`aiStudio`/`aiSeat` capability aliases**, **feed contracts**, **formula date arithmetic** (now a build error), **`managedBy: 'system'` data-API lockdown**, **`ObjectOS*` → `Kernel*` class renames**, and the **tenancy config** removal — none present.
- **Approver types** already use the canonical `type: 'position'` (migrated in 2.1.0), not the now-removed `role` alias.

## [2.1.0] — 2026-07-14

Platform upgrade to ObjectStack **14.7** — a major line bump (from 12/13). Manifest `specVersion` now declares `^14.0.0` (was `^12.0.0`); app version `2.1.0`. ObjectStack 14 completes the ADR-0090 permission-model vocabulary convergence and turns the object `enable.*` capability flags into real runtime gates. This release migrates HotCRM's metadata off every 14.0 breaking surface and hardens the seed + opportunity-lifecycle hook so a fresh-DB boot is completely clean. Built, validated, type-checked, linted (zero warnings), unit-tested (17/17), and browser-verified against `@objectstack/* ^14.7.0` (login → HotCRM app → Executive / Sales / Service / CRM Overview dashboards with live seeded data → Accounts / Opportunities / Cases lists → account record detail with grouped field sections; no boot errors, no post-login console errors).

Upgrade migration was driven from the official release notes at <https://docs.objectstack.ai/docs/releases> (per-major page `/docs/releases/v14`), and [`AGENTS.md`](AGENTS.md) now documents that page as the required first reference for any future platform bump.

### Changed

- **ObjectStack platform → 14.7** across all `@objectstack/*` packages (from `12`/`13`).
- **Approval approvers use `type: 'position'` instead of `type: 'role'` (ADR-0090 D3, spec 14.0).** In 14 the `role` approver type resolves against the better-auth org-membership tier (`sys_member.role`: owner/admin/member) — the CRM's `sales_manager` / `sales_director` are org **positions**, not membership tiers, so under the old spelling the opportunity-approval flow routed to nobody and stalled. Both approval nodes in [`src/flows/opportunity-approval.flow.ts`](src/flows/opportunity-approval.flow.ts) now target the declared positions via `type: 'position'`.
- **FLS keys are object-qualified (spec 14.4, `security-fls-unqualified-key`).** The runtime evaluator matches field-permission keys by `<object>.<field>` prefix; the bare keys in the `sales_rep` and `service_agent` permission sets (`account.*`, `opportunity.*`, `case.*`) matched nothing and their declared masking never enforced. Requalified to `crm_account.*` / `crm_opportunity.*` / `crm_case.*` so the FLS actually applies.
- **`fieldGroups` are now referenced by their fields.** Spec 14's lint flagged `crm_case`, `crm_contract`, `crm_product` and `crm_quote` declaring field groups that no field pointed at — the groups never rendered. Every field on those four objects now carries a `group:` assignment, so record detail pages render the intended grouped sections (verified in the browser on the account/case detail layout).
- **`crm_campaign_member` declares a resolvable record title (ADR-0079).** The junction object had no title-eligible stored field, so records displayed as raw IDs. Added a `member_number` autonumber and pointed `nameField` at it explicitly.

### Fixed

- **Opportunity-lifecycle hook no longer rejects system writes to closed deals.** The `beforeUpdate` freeze-guard ran _after_ the derived-field recompute injected `expected_revenue`/`probability` into the input, so the post-seed ownership backfill (and any framework re-stamp) on a closed opportunity was rejected for fields the caller never touched — surfacing as 23 `BodyRunner` errors on every fresh-DB boot. The guard now runs first and judges only the caller's actual field edits; a fresh boot is error-free.
- **Seed task with `status: 'completed'` now sets `completed_date`.** The "Send welcome package to Stark Medical" seed row tripped the `completed_date_required` validation rule (an `Insert operation failed` on every fresh boot). Added `completed_date` to satisfy the rule.

## [2.0.0] — 2026-07-07

Platform upgrade to ObjectStack **12.3** — a major line bump. Manifest `specVersion` now declares `^12.0.0` (was `^10.0.0`); app version `2.0.0`. ObjectStack 12 introduces the **metadata-liveness** gate (ADR-0049): the compiler now emits an advisory warning for any authored property that is parsed but has no runtime consumer. This release migrates HotCRM off that dead surface so `pnpm build` / `pnpm dev` compile with **zero warnings**. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^12.3.0` (login → HotCRM app → Executive / Sales / Service / CRM Overview dashboards with live seeded data and the reworked aggregated tables; no console errors).

### Changed

- **ObjectStack platform → 12.3** across all `@objectstack/*` packages (from `10.0`).
- **Field history migrated to `Field.trackHistory` (ADR-0052).** The object-level `enable.trackHistory` flag is dead in 12 (no runtime consumer); per-field history is now opt-in. Enabled on each object's key lifecycle / owner / amount fields (e.g. opportunity `stage`/`amount`/`owner`/`close_date`, case `status`/`priority`/`owner`).
- **Dead object-level `enable.*` flags removed** (`trackHistory`, `files`, `feeds`, `activities`, `trash`, `mru`, `searchable`) from all 15 objects, keeping only the live API surface (`apiEnabled`/`apiMethods`).
- **Constrained lookups use `dependsOn` instead of the dead `referenceFilters`.** On `crm_contract`, `crm_case`, `crm_quote` and `crm_opportunity` the primary-contact / opportunity pickers now actually scope their candidate query to the record's `crm_account` (the string[] `referenceFilters` form was never read by the picker).
- **Scheduled flows declare `runAs: 'system'` (ADR-0049, #1888).** A schedule-triggered run has no trigger user, so under the default `runAs:'user'` its data nodes already executed unscoped; the 8 sweep flows now state the RLS-bypassing elevation explicitly.
- **Dashboard record-listing tables reworked into aggregated breakdowns (ADR-0021).** Four `table` widgets were bound to analytics cubes but selected only a count measure with no dimension — rendering a single summary row, not the per-record list their columns implied. They are now real multi-row aggregations: _Pipeline by Owner_ (CRM Overview), _Accounts by Industry_ (Executive), _Open Pipeline by Owner_ (Sales) and _My Open Cases by Priority_ (Service), with widget ids and i18n keys updated across all four locales.

## [1.3.0] — 2026-06-22

Platform upgrade to ObjectStack **10.0** — the first major line bump. Manifest `specVersion` now declares `^10.0.0` (was `^9.11.0`); app version `1.3.0`. The 10.0 metadata surface is **additive** for HotCRM except for one newly-enforced validation (below). Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^10.0.0` (login → home → Executive Dashboard with live seeded data and lazy charts → Accounts list → record detail; no console errors, no failed requests).

### Changed

- **ObjectStack platform → 10.0** across all `@objectstack/*` packages (from `9.11`). Schema-level changes are additive and required no metadata edits: new `tree` view type + `TreeConfig` (ui); optional `readScope`/`writeScope` access-depth on object permissions and a new `ObjectAccessScope` enum (security, ADR-0057); optional `currency` on `Dataset`/`DatasetMeasure`; `actor`/`currency` fields on the execution context; AI `Agent`/`Skill` gained a `surface` field (defaulted, so existing agents/skills validate unchanged). No use of these is required by HotCRM today.

### Fixed

- **Territory sharing rules referenced a non-existent `billing_country` field.** 10.0's build-time expression validator (ADR-0032) now also checks **sharing-rule** CEL conditions against the object schema, which surfaced this latent dangling reference — `crm_account` has no `billing_country`; the country lives inside the structured `billing_address` field. The `north_america_territory` and `europe_territory` rules in [`src/sharing/account.sharing.ts`](src/sharing/account.sharing.ts) now read `record.billing_address.country`. No behavioral change (the dangling field matched nothing before; the seed does not populate `billing_address`), but the metadata is now valid and the rule expresses its stated "by billing country" intent against a real field.

## [1.2.0] — 2026-06-20

Platform upgrade to ObjectStack **9.11** — the release cut that promotes the in-tree 9.9.1 work to the latest line. Manifest `specVersion` now declares `^9.11.0` (was `^9.4.0`); app version `1.2.0`. Built, validated, type-checked, unit-tested (17/17), and browser-verified against `@objectstack/* ^9.11.0`.

### Changed

- **ObjectStack platform → 9.11** across all `@objectstack/*` packages (from `9.9.1`). 9.10/9.11 are additive on the metadata surface except for the lifecycle-hook change below.
- **Minimum Node bumped to 22** (`engines.node`, `.nvmrc`, CI/release workflows). `@objectstack/driver-sql` 9.11 pulls in `kysely@0.29`, which requires Node `>=22`; with `engine-strict=true` the old Node 20 CI matrix failed `pnpm install`. The publish workflows already targeted Node 22.

### Fixed

- **Lifecycle "freeze closed record" hooks no longer block framework writes.** 9.x re-stamps ownership (`owner_id`) and audit timestamps on records via `beforeUpdate` — including the post-seed ownership assignment that now runs at boot. The `opportunity_lifecycle` and `quote_workflow` freeze guards now exempt framework-managed columns (`owner_id`, `updated_at`, `created_by`, …), so those system writes pass while user edits to business fields on closed records stay blocked (verified: `amount` write on a closed-won opp → `400`, narrative `next_step` → `200`). Without this, every closed/accepted record threw `Attempted: owner_id, updated_at` during seed.
- **`smoke.test.ts` flow-count assertion** relaxed to `>= 16` so it stays green as new flows are added (the task reminder/recurrence flows pushed the total to 17), instead of re-pinning a brittle exact count.

## [1.1.0] — 2026-06-14

Platform upgrade to ObjectStack 9.4 and in-product documentation. Built and validated against `@objectstack/* ^9.4.0`; the manifest `specVersion` now declares `^9.4.0` (was `^7.7.0`).

### Added

- **In-product documentation** (ADR-0046): four package docs served in the Console doc viewer (`/_console/docs`) — `crm_overview`, `crm_sales`, `crm_service`, `crm_admin`. They document the _invisible_ business logic (the rules and thresholds baked into flows, approvals, and sharing) rather than what the UI already shows.
- **Account Workbench** (ADR-0047): an interface page with quick-filter dropdowns over accounts.
- **Docs-drift guard**: `test/docs-drift.test.ts` pins every documented threshold/schedule to its flow source, so a flow change that isn't reflected in the docs fails CI.
- **`AGENTS.md`**: single source of truth for AI-agent guidance (consolidated from `.github/copilot-instructions.md`, which now points to it).

### Changed

- **ObjectStack platform 7.7 → 9.4** across all `@objectstack/*` packages. Includes the ADR-0021 analytics dataset semantic layer (dashboard widgets / reports / charts bind a named `dataset` and select dimensions/measures by name) and ADR-0021 D2 matrix reports (rows × columns + drilldown).
- `manifest.specVersion`: `^7.7.0` → `^9.4.0`; package + manifest version → `1.1.0`.

### Fixed

- `sales_dashboard › pipeline_by_forecast_category`: chart axes were swapped (`xAxis` bound to a measure, `yAxis` to a dimension); the 9.x ADR-0021 validator now rejects this as a hard error. Corrected so `xAxis` is the dimension and `yAxis` the measure (the renderer handles the horizontal-bar flip).

## [1.0.0] — 2026-05-23

First marketplace release. HotCRM is now publishable to [cloud.objectos.app](https://cloud.objectos.app) under the manifest id `app.objectstack.hotcrm`.

### Added

- **15 business objects** with `crm_` namespace prefix: account, contact, lead, opportunity, opportunity_line_item, product, quote, quote_line_item, contract, case, knowledge_article, task, campaign, campaign_member, forecast.
- **10 actions** (server endpoints + AI tools): escalate_case, close_case, mark_primary, send_email, log_call, export_csv, convert_lead, create_campaign, clone_opportunity, mass_update_stage.
- **6 workflows**: lead_conversion, opportunity_approval, case_escalation, quote_generation, campaign_enrollment, plus 1 approval process for discount approvals.
- **2 AI copilots**: sales-copilot (lead qualification, opportunity coaching) and service-copilot (case triage, KB lookup), backed by 5 skills and 4 RAG knowledge bases.
- **4 dashboards** (executive, sales, service, crm) and 8 saved reports.
- **4 analytics cubes**: opportunity, account, contact, lead.
- **i18n bundles** for en, zh-CN, es-ES, ja-JP across all object labels, fields, and views.
- **Security model**: 6 profiles, 10-role hierarchy, 3 sharing rules (AccountTeam, OpportunitySales, CaseEscalation), territory-based sharing.
- **Documentation site** (`apps/docs`): 180+ pages covering Sales, Service, Marketing, Revenue, AI Copilot, Analytics, Administration, Customization, plus Guides and Reference sections.

### Changed

- Repositioned from "demonstration / Salesforce-clone" to **ObjectStack marketplace flagship app**. README rewritten as a marketplace listing; the previous developer-focused README is preserved as `README.legacy.md`.
- `manifest.id`: `com.example.crm` → `app.objectstack.hotcrm` (publishable reverse-domain id).
- `manifest.version`: `3.0.0` → `1.0.0` (resets semver for first marketplace release; 3.x was an internal iteration counter, not a public API version).
- `manifest.name`: `Enterprise CRM` → `HotCRM`.
- Package version in `package.json`: `0.1.0` → `1.0.0`.

### Fixed

- `case.actions.ts`: aligned escalate_case/close_case payloads with the actual schema (removed phantom `closed_by` / `closed_at` / `escalated_by` / `escalated_at` fields; use real `escalated_date` + `status: 'escalated'`; corrected priority enum `'urgent'` → `'critical'`).
- `opportunity.hook.ts`: stage-change hook now syncs `probability` alongside `expected_revenue` (previously only revenue was updated).
- `forecast.hook.ts`: hook helpers inlined into the handler body to survive the build's "Lowering inline handlers" pass.
- i18n: added en / zh-CN / es-ES / ja-JP translations for the late-added `crm_knowledge_article` and `crm_forecast` objects.

### Refactored

- All 15 business objects renamed with explicit `crm_` prefix (576 replacements across 85 files). The platform no longer relies on namespace auto-injection — see the ADR in [.github/copilot-instructions.md](.github/copilot-instructions.md).

[1.2.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.2.0
[1.1.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.1.0
[1.0.0]: https://github.com/objectstack-ai/hotcrm/releases/tag/v1.0.0
