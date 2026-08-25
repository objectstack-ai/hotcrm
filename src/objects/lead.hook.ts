// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Lead automation hook.
 *
 * - Auto-scores incoming leads into `rating` (1-5) using industry/title/email/phone weights.
 * - Refuses edits to a converted lead — but not the engine's reference cleanup,
 *   so a converted lead never makes its conversion products undeletable (#720).
 * - When status flips to `qualified`, schedules a follow-up `crm_task` for the current user.
 * - Normalizes `email` and flags a re-captured address as a suspected duplicate.
 */

// NB: the scoring constants + computeRating live INSIDE lead_automation's
// handler — L2 hook bodies run body-only in the QuickJS sandbox, so module
// scope is not available at runtime. A module-level copy previously lived
// here too; it was dead code that silently diverged from the copy that
// actually runs, so it was removed. Tune the weights in the handler.

/**
 * Lead auto-assignment (load-balanced round-robin).
 *
 * A lead created without an owner (CSV import, web-to-lead, API capture) used to
 * land ownerless and rely on a manager noticing it. This assigns it to the
 * sales rep with the FEWEST open leads — a self-balancing round-robin that needs
 * no rotation counter.
 *
 * It assigns `owner_id`, the platform ownership anchor (#548) — the column OWD,
 * sharing and the "My Leads" view all read, so the assigned rep really owns the
 * lead rather than merely being named on it.
 *
 * Writing a FOREIGN owner is normally an ownership transfer, denied without
 * `allowTransfer` (#3004). It passes here because of WHERE this runs, not what
 * it is granted: a `beforeInsert` hook mutates `opCtx.data` INSIDE the operation
 * the security middleware already wrapped, so the guard read (and stamped) the
 * payload before this line changed it. That ordering is pinned by
 * `test/ownership-model.test.ts` against a real ObjectQL — an assumption here
 * would be the difference between round-robin working and every web-to-lead
 * submission 403-ing.
 *
 * The rep pool is whoever holds the `sales_rep` position (`sys_user_position`).
 * When that pool is empty (e.g. a fresh org before positions are assigned) the
 * hook is a NO-OP and the lead keeps whatever owner it had — so it never blocks
 * lead creation. UI-created leads already carry `owner_id` = creator (the
 * middleware's insert-time stamp), so this only kicks in for genuinely
 * ownerless intake.
 *
 * Runs beforeInsert so the downstream lead_assignment flow (afterInsert) sees
 * the assigned owner and routes its SLA alert to that rep. Territory-based
 * routing is a future extension on top of this pool query.
 *
 * Priority 250 — hooks run in ASCENDING priority order, so this must run
 * AFTER `lead_automation` (200): its guest branch strips a client-spoofed
 * `owner_id` from anonymous Web-to-Lead submissions. At the old priority 150
 * this hook assigned an owner first and the guest strip then deleted it,
 * landing every web-to-lead ownerless — the exact case this hook exists for.
 */
const leadAutoAssignHook: Hook = {
  name: 'lead_auto_assign',
  object: 'crm_lead',
  events: ['beforeInsert'],
  priority: 250,
  description: 'Assign ownerless new leads to the least-loaded sales rep.',
  handler: async (ctx: HookContext) => {
    const { input } = ctx;
    // Respect an explicit / creator-assigned owner. On a write that carries a
    // user the security middleware has ALREADY stamped `owner_id` to that user
    // by the time this runs, so this is also what makes the hook a no-op for
    // ordinary UI creation — only genuinely ownerless intake falls through.
    if (typeof input.owner_id === 'string' && input.owner_id) return;
    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    // Auto-assignment is a best-effort ENHANCEMENT — it must NEVER block lead
    // creation. In particular an anonymous Web-to-Lead submission runs under the
    // public-form grant, which permits only create/read-back on crm_lead and
    // DENIES `find` on sys_user_position; letting that denial propagate would
    // reject the whole insert and break the public form. So the pool lookup +
    // load balancing are wrapped: on ANY error (permission, etc.) we log and
    // leave the lead ownerless (a manager / the lead_assignment flow routes it).
    try {
      // Rep pool = holders of the sales_rep position.
      const holders = await api.object('sys_user_position').find({
        where: { position: 'sales_rep' }, fields: ['user_id'], top: 1000,
      });
      const repIds = Array.from(
        new Set(
          (holders ?? [])
            .map((r) => (typeof r.user_id === 'string' ? r.user_id : ''))
            .filter(Boolean),
        ),
      );
      if (repIds.length === 0) return; // no pool → leave ownerless (no-op)

      // Pick the rep with the fewest OPEN (non-converted) leads.
      let best: string | undefined;
      let bestCount = Infinity;
      for (const repId of repIds) {
        const openCount = await api.object('crm_lead').count({
          where: { owner_id: repId, is_converted: false },
        });
        if (openCount < bestCount) {
          bestCount = openCount;
          best = repId;
        }
      }
      if (best) input.owner_id = best;
    } catch {
      // Swallow: auto-assignment must never block the insert. Common case is the
      // anonymous public-form context, which can't read sys_user_position — the
      // lead is still captured, ownerless, for downstream routing. (No `console`
      // here — the L2 hook sandbox doesn't define it.)
    }
  },
};

const leadHook: Hook = {
  name: 'lead_automation',
  object: 'crm_lead',
  events: ['beforeInsert', 'beforeUpdate', 'afterUpdate'],
  priority: 200,
  description:
    'Score new leads, lock converted leads, and create follow-up task on qualification.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `./_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(message: string, code: string, status: number): Error {
      const err = new Error(message) as Error & { code: string; status: number };
      err.code = code;
      err.status = status;
      return err;
    }
    const { event, input } = ctx;

    const HIGH_VALUE_INDUSTRIES = new Set(['technology', 'finance', 'healthcare']);
    const SENIOR_TITLE_PATTERN = /\b(ceo|cto|cfo|cio|coo|founder|vp|vice president|director|head of)\b/i;
    function computeRating(input: Record<string, unknown>): number {
      let score = 0;
      const email = typeof input.email === 'string' ? input.email : '';
      const phone = typeof input.phone === 'string' ? input.phone : '';
      const title = typeof input.title === 'string' ? input.title : '';
      const industry = typeof input.industry === 'string' ? input.industry : '';
      const employees = typeof input.number_of_employees === 'number' ? input.number_of_employees : 0;
      const revenue = typeof input.annual_revenue === 'number' ? input.annual_revenue : 0;
      if (email && !/(gmail|yahoo|hotmail|outlook|qq|163)\.com$/i.test(email)) score += 1;
      if (phone.length > 0) score += 0.5;
      if (SENIOR_TITLE_PATTERN.test(title)) score += 1.5;
      if (HIGH_VALUE_INDUSTRIES.has(industry)) score += 1;
      if (employees >= 200) score += 0.5;
      if (revenue >= 10_000_000) score += 0.5;
      // Cap at 5, floor at 1, round to WHOLE stars — `rating` is a 1-5 star
      // field; half values rendered inconsistently in the star widget.
      const clamped = Math.max(1, Math.min(5, score));
      return Math.round(clamped);
    }

    if (event === 'beforeInsert') {
      // Web-to-Lead: anonymous submissions from the public form get
      // sensible defaults stamped server-side so they cannot be spoofed
      // by the client. Guests are unauthenticated, so we identify them
      // by the absence of `ctx.user?.id`. (The `guest_portal` profile
      // already restricts them to INSERT-only on `crm_lead`.)
      // `!ctx.session?.isSystem` is new (#1133) and is the same correction made
      // on `case.hook.ts`'s guest branch, for the same measured reason: a SYSTEM
      // write (seed load, backfill, demo bootstrap) also arrives with no user
      // id, and once the strip below stops being a no-op it would blank the
      // owner and conversion state of every system-written lead. This very
      // handler already reads that absence the other way a few lines down — the
      // converted-lead lock treats `!ctx.user?.id` as the system-write signal —
      // so the two readings were in direct contradiction until now.
      const isGuestSubmission = !ctx.user?.id && !ctx.session?.isSystem;
      if (isGuestSubmission) {
        if (!input.lead_source) input.lead_source = 'web';
        if (!input.status)      input.status      = 'new';
        // Never trust client-supplied conversion / ownership fields on a public
        // form — OVERWRITE them with a safe value.
        //
        // ⚠️ These were ten `delete` statements and every one was a SILENT
        // NO-OP (#1133). MEASURED here on `crm_lead`, not assumed from the
        // identical block on `crm_case`: a guest insert carrying
        // `is_converted: true`, `converted_date`, `owner_id` and
        // `duplicate_status: 'confirmed'` stored all four verbatim, while
        // `lead_source = 'web'` — an assignment two lines up, same `input`,
        // same call — landed. A second, sharper reading came from the engine
        // refusing the write at all: a submission carrying only
        // `duplicate_of_type: 'crm_lead'` is rejected with "Duplicate Of Lead
        // is required", which is `duplicate_of_lead`'s `requiredWhen` firing on
        // a key this branch believed it had already removed.
        //
        // The cause is a missing `deleteProperty` trap on ObjectQL's
        // flat-record input Proxy; the full measurement is written up on
        // `case.hook.ts`'s guest branch, which shares it. Assignment is trapped
        // and survives, so assignment is what this block uses.
        //
        // `null` is the no-value spelling throughout, and it is load-bearing
        // twice over: `lead_auto_assign` stands down only on a non-empty STRING
        // `owner_id`, and `lead_duplicate_check` stands down only on a NON-BLANK
        // `duplicate_status` / `duplicate_of_type` — where its own `isBlank`
        // counts `null` as blank. Both therefore still run on a sanitised guest
        // submission, which is exactly what the removed deletes were for.
        input.is_converted           = false;
        input.converted_account      = null;
        input.converted_contact      = null;
        input.converted_opportunity  = null;
        input.converted_date         = null;
        input.owner_id               = null;
        // Same reasoning for the duplicate link (#598): a submitter who can
        // post `duplicate_status: 'confirmed'` can switch OFF the intake
        // dedupe for their own submission (`lead_duplicate_check` stands down
        // on a record that already carries a verdict) and park a link to any
        // record id they care to guess. Guests state facts about themselves,
        // never about the pipeline.
        input.duplicate_of_type      = null;
        input.duplicate_of_lead      = null;
        input.duplicate_of_contact   = null;
        input.duplicate_status       = null;
      }

      if (typeof input.rating !== 'number') {
        input.rating = computeRating(input);
      }
    }

    // Converted-lead lock — USER edits only (`ctx.user?.id` is this repo's
    // system-write signal, cf. opportunity/quote/account hooks): a blanket
    // throw also rejected system writes (demo-bootstrap owner claims, flow
    // backfills). Narrative notes and framework-managed columns stay editable;
    // identity and conversion fields stay locked.
    //
    // This is the ONLY converted-lead guard. `crm_lead` also carried a
    // `cannot_edit_converted` script validation over the four identity fields,
    // documented as the friendlier half of a two-layer design; #575 B1 removed
    // it because this throw always won the race, so the second layer was a
    // second implementation that could only drift. The message below therefore
    // has to carry the whole story — hence the attempted-field list.
    if (event === 'beforeUpdate' && ctx.user?.id) {
      const previous = ctx.previous;
      const wasConverted = previous?.is_converted === true || previous?.status === 'converted';
      if (wasConverted) {
        const ALLOWED = new Set([
          'description', 'notes',
          // Framework-managed / system columns (cf. opportunity.hook.ts).
          'id', 'owner_id', 'created_at', 'updated_at',
          'created_by', 'updated_by', 'space_id', 'organization_id', 'org_id', 'version',
        ]);
        const violating = Object.keys(input).filter(
          (k) => !ALLOWED.has(k) && input[k] !== previous?.[k],
        );
        if (violating.length > 0) {
          // Every lookup on `crm_lead` a referential clear can attack.
          const REFERENCE_FIELDS = new Set([
            'converted_account', 'converted_contact', 'converted_opportunity',
            'duplicate_of_lead', 'duplicate_of_contact',
          ]);
          // ───────────────────────────────────── the reference-cleanup yield ──
          // #720. The engine implements `deleteBehavior: 'set_null'` by UPDATING
          // the row that HOLDS the lookup, so deleting the account / contact /
          // opportunity a converted lead points at (or the lead / contact it was
          // flagged as a duplicate of) arrives here as an ordinary user
          // `beforeUpdate` — and this lock refused it, which made a converted
          // lead able to keep all three of its conversion products undeletable
          // forever (a GDPR erasure that cannot be carried out).
          //
          // Measured on 17.0.0-rc.6, not assumed: the payload is exactly
          // `{ id, <link>: null, updated_at, updated_by }`; `ctx.user` is the
          // CALLER; `ctx.session` is the caller's own `{ userId, isSystem }`.
          // The engine DOES stamp a `__referentialFieldClear: true` marker, but
          // on its internal operation context — `ObjectQL.buildSession` copies a
          // fixed allow-list of keys into `ctx.session`, and `__`-prefixed
          // operation-private keys are deliberately not among them (see the
          // `__` convention note in `@objectstack/core`). So no marker reaches a
          // hook, and the WRITE SHAPE is the only evidence there is.
          //
          // ⛔ Keep this narrow (maintainer's ruling on #720, Option A): a write
          // yields ONLY when every one of its non-system changes is a DECLARED
          // link going from a value to `null`. One business field alongside it,
          // or a link repointed to a NEW value, and the refusal below still
          // fires. The three freeze guards share this block verbatim — sharing
          // it as an imported helper is not possible (hook bodies run body-only
          // in the sandbox and cannot reach module scope), so
          // `test/freeze-guard-reference-cleanup.test.ts` pins the three copies
          // as identical text and pins both directions of the narrowness.
          const isReferenceCleanup = violating.every(
            (k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous?.[k] != null,
          );
          if (isReferenceCleanup) return;

          // Name the lead the way `crm_lead.display_title` does — the person and
          // the company, joined — rather than appending the record id (#1243,
          // the class #1208 closed on the escalation task). The id was
          // unmatchable against every lead surface in this app (record page,
          // list view, breadcrumb, lookup picker), all of which title a lead
          // `Ada Lovelace - Acme`. Composed from the two stored columns because
          // a lowered hook body cannot read the `display_title` formula.
          const person = [previous?.first_name, previous?.last_name]
            .filter((part) => typeof part === 'string' && part.trim() !== '')
            .join(' ');
          const company =
            typeof previous?.company === 'string' ? previous.company.trim() : '';
          const label = [person, company].filter(Boolean).join(' - ');

          throw refuse(
            `Cannot edit ${label ? `converted lead ${label}` : 'a converted lead'} (attempted: ${violating.join(', ')}). Make changes on the converted records instead.`,
            'RECORD_LOCKED',
            409,
          );
        }
      }
    }

    if (event === 'afterUpdate') {
      const previous = ctx.previous;
      const becameQualified =
        input.status === 'qualified' && previous?.status !== 'qualified';
      if (!becameQualified) return;

      const api = ctx.api as HookApi | undefined;
      if (!api) return;

      const leadId =
        (typeof input.id === 'string' && input.id) ||
        (typeof previous?.id === 'string' && previous.id) ||
        undefined;
      const ownerId =
        (typeof input.owner_id === 'string' && input.owner_id) ||
        (typeof previous?.owner_id === 'string' && previous.owner_id) ||
        ctx.user?.id;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);

      // Title the task with the lead's name, not its record id (#1243, the same
      // surface #1208 fixed for escalations). **All Tasks** is where a rep
      // starts the day; a queue of rows reading `Follow up with qualified lead
      // (EMtmaScoa3I-uYFG)` is a queue nobody can triage, and the key matches
      // nothing on any lead page or in search. Both halves prefer the value
      // THIS write is setting, since a qualifying write may be renaming the
      // lead in the same payload.
      //
      // The 255 cap is load-bearing, exactly as in `case.hook.ts`:
      // `crm_task.subject` declares `maxLength: 255` and the engine enforces
      // it, while `crm_lead.company` alone allows 255 — so an uncapped title is
      // rejected, and the `catch` below swallows that rejection, leaving no
      // follow-up task and no trace. Truncating the TAIL keeps the
      // discriminating head intact.
      const person = [
        (typeof input.first_name === 'string' && input.first_name) || previous?.first_name,
        (typeof input.last_name === 'string' && input.last_name) || previous?.last_name,
      ]
        .filter((part) => typeof part === 'string' && part.trim() !== '')
        .join(' ');
      const company =
        (typeof input.company === 'string' && input.company.trim()) ||
        (typeof previous?.company === 'string' && previous.company.trim()) ||
        '';
      const label = [person, company].filter(Boolean).join(' - ');
      const titled = label
        ? `Follow up with qualified lead: ${label}`
        : 'Follow up with qualified lead';

      try {
        await api.object('crm_task').insert({
          subject: titled.length > 255 ? `${titled.slice(0, 254)}…` : titled,
          status: 'not_started',
          priority: 'high',
          type: 'follow_up',
          due_date: dueDate.toISOString().slice(0, 10),
          // Unlike `lead_auto_assign` above, this is a SEPARATE insert on
          // `ctx.api` — a new operation carrying the caller's context, so the
          // #3004 transfer guard does apply to it. When the qualifier is the
          // lead's own rep (`owner_id` == caller) it is not a transfer at all;
          // a manager qualifying a rep's lead holds `allowTransfer`. Any other
          // caller is denied and the catch below drops the task rather than
          // landing it on the wrong desk.
          owner_id: ownerId,
          related_to_type: 'crm_lead',
          related_to_lead: leadId,
        });
      } catch {
        // Side-effect failure must not break the parent transaction. No
        // `console` in the L2 hook sandbox — logging would throw its own
        // ReferenceError and mask the real failure (cf. #471).
      }
    }
  },
};

/**
 * Soft lead dedupe (#598).
 *
 * `crm_lead.email` used to carry a hard `unique` constraint, so a prospect who
 * enquired twice was REJECTED by the database — the public Web-to-Lead form
 * answered a returning visitor with a save error. That constraint is gone; a
 * re-captured address is now recorded as a fact instead of refused.
 *
 * Four jobs, all `before`-phase so the values land in the same write:
 *
 * 1. **Normalize `email`** (trim + lowercase), exactly as `contact_integrity`
 *    does on `crm_contact`. This is what makes the dedupe lookup below a plain
 *    equality match: there is no case-insensitive predicate to lean on
 *    (ObjectQL's `$regex` compiles to a LIKE *substring* on SQL, which would
 *    match `a@b.com` inside `xa@b.com`), so the canonical form has to be
 *    established by the PRODUCER at write time rather than worked around by
 *    every reader. Also on update: an edit that reintroduced mixed case would
 *    silently make the record invisible to every later dedupe.
 *
 * 1b. **Fold `company` into `company_normalized`** (#626) — a SEPARATE column,
 *    not an in-place rewrite, because `company` is the display value the
 *    conversion flow copies onto the account it creates. It is the lead half of
 *    the pair `crm_account.name_normalized` completes, and it exists for the
 *    same reason as the email fold: the reader (a flow template) can compare
 *    two stored columns but cannot compute either one.
 *
 * 2. **Link a repeated address to the record it repeats** — on insert only.
 *    An existing `crm_contact` wins over an open lead: the prospect who already
 *    became a contact is the further-along record, and it is the one the
 *    conversion flow would reuse anyway. Within a kind, the OLDEST record wins,
 *    so a cluster of five re-submissions all point at the same origin instead
 *    of forming a chain.
 *
 * 3. **Retire the whole claim when the record it named is gone** (#1072) — on
 *    update only, and the exact mirror of job 2: the hook that stamps a
 *    duplicate link is the one that takes it back down. See the long note at
 *    the block itself.
 *
 * The write is `duplicate_status: 'suspected'` — a machine's guess, explicitly
 * distinguished from the `confirmed` verdict a human records when disqualifying
 * as a duplicate. The hook stands down on any record that already carries a
 * verdict, so `confirmed` can never be reverted to `suspected` by a later
 * write. It also stands down on a record that already names a survivor.
 *
 * Detection is INSERT-only by design: a later edit re-scanning would re-open a
 * question a human may have already closed, and the review queue
 * (`suspected_duplicates`) is the affordance for anything intake missed.
 *
 * Priority 300 — after `lead_automation` (200), whose guest branch strips
 * client-supplied `duplicate_*` from anonymous submissions. Running earlier
 * would let a spoofed `duplicate_status` switch this hook off.
 */
const leadDuplicateCheckHook: Hook = {
  name: 'lead_duplicate_check',
  object: 'crm_lead',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 300,
  description:
    'Normalize lead email and company match key; flag a re-captured address as a suspected duplicate of the record it repeats.',
  handler: async (ctx: HookContext) => {
    const { event, input } = ctx;

    // A duplicate cluster larger than this is pathological; every member points
    // at the same origin either way, so the scan is bounded rather than paged.
    const SCAN_LIMIT = 50;

    /** Absent, null or whitespace — the shape `isBlank` tests in CEL. */
    const isBlank = (value: unknown): boolean =>
      value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

    // 1. Canonical email. `input.email` is absent on a partial update; leave it
    //    alone then rather than writing an empty string over a real address.
    if (typeof input.email === 'string') {
      input.email = input.email.trim().toLowerCase();
    }
    const email = typeof input.email === 'string' ? input.email : '';

    // 1b. Canonical COMPANY, into its own column (#626). Same doctrine as the
    //     email above — the canonical form is established by the producer at
    //     write time — but it cannot be done in place: `company` is the display
    //     value and is copied verbatim onto the account `lead_conversion`
    //     creates, so folding it would ship "acme corp" as the account name.
    //     `crm_account.name_normalized` is the other half of the pair; the flow
    //     compares the two columns because it can compute neither
    //     (`resolveToken` knows only `NOW()` / `TODAY()`).
    //
    //     Runs before the insert-only early return below, so an edit that
    //     rewrites `company` re-folds the key instead of leaving a stale one.
    //     Absent key ⇒ untouched: a partial update that never mentions
    //     `company` must not blank the match key.
    if ('company' in input) {
      const rawCompany = input.company;
      const normalizedCompany =
        typeof rawCompany === 'string'
          ? rawCompany.trim().toLowerCase().replace(/\s+/g, ' ')
          : '';
      input.company_normalized = normalizedCompany === '' ? null : normalizedCompany;
    }

    // 1c. Retire a duplicate claim once the record it named is gone (#1072).
    //
    //     `duplicate_of_type` is a DISCRIMINATOR, and `lead.object.ts` pairs it
    //     with the lookup it names through `requiredWhen` — so "the type is set"
    //     and "that lookup is populated" are ONE fact stated in two columns.
    //     Neither lookup declares a `deleteBehavior`, so both take the spec
    //     default `set_null`, and the engine implements `set_null` by UPDATING
    //     the row that HOLDS the lookup. Deleting the contact (or lead) a lead
    //     was flagged against therefore arrives here as
    //     `{ id, duplicate_of_<x>: null, updated_at, updated_by }`, nulls one
    //     half of the pair, and the row instantly breaks its own rule — so the
    //     whole delete rolls back with `Duplicate Of Contact is required`, an
    //     error naming a field on an object the caller never addressed.
    //
    //     That was not a wording problem. The flag is stamped automatically at
    //     intake on any OPEN lead that merely re-uses a contact's email, so an
    //     ordinary duplicate made that CONTACT undeletable — and because
    //     `crm_contact.crm_account` is a master-detail with
    //     `deleteBehavior: 'cascade'`, the ACCOUNT above it too. A GDPR "delete
    //     this person" request with no way to carry it out. (#696 / #711 are the
    //     same construction on other objects; #720 is a different one — a hook
    //     refusing the write — and its fix does not reach this.)
    //
    //     The rule restored here is one line: **the discriminator may not
    //     outlive the lookup it names.** When a write leaves that lookup blank,
    //     the claim is retired WHOLE — type and status go with the link — and
    //     the lead simply stops saying it duplicates something.
    //
    //     ⚠️ This is deliberately NOT a second spelling of #720's "is this write
    //     the engine's reference cleanup?" predicate in `lead_automation` above.
    //     It cannot be: measured on 17.0.0 GA, the engine's cleanup write and a
    //     user's hand-clear of the same lookup are indistinguishable — identical
    //     `input` (`{ id, <link>: null, updated_at, updated_by }`), identical
    //     `ctx.user`, identical `ctx.session`. Asking a question the context
    //     cannot answer is what forces shape-sniffing; asking "is the pair still
    //     whole?" needs no provenance at all, and answers both callers the same
    //     correct way — a lead whose link you removed no longer duplicates
    //     anything, however the removal was spelled.
    //
    //     It does NOT loosen the pairing, which is the thing to check when
    //     reading this: a write that STATES a type without naming a record is
    //     still refused by `requiredWhen`, on insert and on update. That is what
    //     the `restated` guard below protects — a payload carrying its own
    //     non-blank `duplicate_of_type` is an author's claim, so it is left for
    //     the rule to judge instead of being quietly deleted.
    //
    //     ⚠️ Priority 300 is load-bearing here, not just for job 2:
    //     `lead_automation` (200) must see the CALLER's payload before these two
    //     nulls are added to it. Its #720 yield passes a write only when every
    //     non-system change is a declared LOOKUP going value→null, and
    //     `duplicate_of_type` / `duplicate_status` are neither — so at a lower
    //     priority this block would make the converted-lead lock refuse the very
    //     cleanup #720 fixed it to allow.
    if (event === 'beforeUpdate') {
      const previous = ctx.previous;
      const LINK_OF_TYPE: Record<string, string> = {
        crm_lead: 'duplicate_of_lead',
        crm_contact: 'duplicate_of_contact',
      };
      const restated = 'duplicate_of_type' in input && !isBlank(input.duplicate_of_type);
      const declared = previous?.duplicate_of_type;
      const link = typeof declared === 'string' ? LINK_OF_TYPE[declared] : undefined;
      if (!restated && link && link in input && isBlank(input[link])) {
        // Two outcomes, and which one applies turns on ONE question: did a
        // human ever look at these two records and agree? That is exactly what
        // `duplicate_status` records, and it is a column this hook already
        // reads and writes — so the question is answered from the record's own
        // vocabulary, with no second rule restated here (#1164).
        //
        //   `confirmed` — a person compared the two records and said yes. The
        //     record it named is now gone, but the VERDICT is not about the
        //     pointer, it is about what the reviewer found. Erasing someone
        //     else's contact must not silently delete it, so the claim is
        //     TOMBSTONED: the discriminator moves to `erased` and the status
        //     stands. The lead goes on saying "confirmed duplicate of a record
        //     that has since been erased" — a fact the record could not state
        //     before, and the reason `erased` had to exist at all.
        //
        //   anything else — the machine's `suspected` guess, or no opinion at
        //     all. Retired WHOLE, exactly as #1072 / #1166 decided; nothing is
        //     tombstoned, because there is no human verdict to preserve.
        //
        // ⚠️ `'erased'` is spelled INLINE here on purpose. L2 hook bodies run
        // body-only in the QuickJS sandbox, so `DUPLICATE_OF_TYPE_ERASED` from
        // `_picklists.ts` would resolve at authoring time and arrive as
        // `undefined` — the same constraint the SLA matrix in `case.hook.ts`
        // documents. The canonical constant is the one in `_picklists.ts`;
        // `test/lead-duplicate-management.test.ts` pins this literal to it and
        // pins this block as its only writer, so the two cannot drift.
        //
        // The verdict is read from `previous`, and the write must be SILENT
        // about it — `'duplicate_status' in input` disqualifies the tombstone.
        // That is what keeps the tombstone on the erasure path and off every
        // other one. The engine's `set_null` cleanup arrives as exactly
        // `{ id, <link>: null, updated_at, updated_by }`, so it never mentions
        // the status; a caller that DOES mention it is managing the claim by
        // hand, and a hand-blanked pointer is not an erasure — that claim is
        // retired whole and left for the rules to judge. It also means no
        // payload can manufacture a tombstone by supplying its own `confirmed`.
        if (!('duplicate_status' in input) && previous?.duplicate_status === 'confirmed') {
          input.duplicate_of_type = 'erased';
          // `duplicate_status` deliberately UNTOUCHED — it stays `confirmed`,
          // which is what keeps the surviving state readable as a verdict.
        } else {
          input.duplicate_of_type = null;
          // `duplicate_status` goes with it, and that half was measured rather
          // than assumed. Its readers in this app are: the
          // `suspected_duplicates` review queue (`src/views/lead.view.ts`),
          // whose entire workflow is "open the two records and compare them";
          // the `duplicate_disqualification_requires_survivor` validation,
          // which demands a NAMED survivor; the duplicate form block, shown
          // only when the lead is being closed as a duplicate; and this hook's
          // own insert-time stand-down, which reads the incoming payload and
          // never the stored row. With no link left, not one of them can act on
          // `suspected` — and leaving it would park a permanently unworkable
          // row in that queue: it names nobody to compare against, and the
          // `confirmed` route that drains the queue is closed by the validation
          // the cleared type just tripped. The verdict itself is not lost —
          // `duplicate_status` declares `trackHistory: true`, so who decided
          // what, and when, stays on the record's field history.
          input.duplicate_status = null;
        }
      }
    }

    if (event !== 'beforeInsert' || !email) return;

    // 2. Never overwrite an opinion the record already carries. The
    //    `duplicate_status` half is the load-bearing one: it is what keeps a
    //    human's `confirmed` verdict safe from any later automatic write.
    if (!isBlank(input.duplicate_status) || !isBlank(input.duplicate_of_type)) return;

    const api = ctx.api as HookApi | undefined;
    if (!api) return;

    /** Oldest row wins; an undated row only wins if nothing dated is present. */
    const original = (rows: Array<Record<string, unknown>>): string | undefined => {
      let best: string | undefined;
      let bestKey = Infinity;
      for (const row of rows) {
        const id = typeof row.id === 'string' ? row.id : '';
        if (!id) continue;
        const raw = row.created_at;
        const parsed =
          typeof raw === 'string' || typeof raw === 'number' || raw instanceof Date
            ? new Date(raw as string).getTime()
            : Number.NaN;
        const key = Number.isFinite(parsed) ? parsed : Infinity;
        if (best === undefined || key < bestKey) {
          best = id;
          bestKey = key;
        }
      }
      return best;
    };

    // Best-effort ENHANCEMENT, never a gate on the write — identical to
    // `lead_auto_assign` below. An anonymous Web-to-Lead submission runs under
    // the `guest_portal` grant, which is INSERT-only on `crm_lead` and denies
    // reads outright; letting that denial propagate would reject the very
    // submission this feature exists to accept. A guest's duplicate therefore
    // lands unflagged rather than not landing at all.
    try {
      const contacts = await api.object('crm_contact').find({
        where: { email },
        fields: ['id', 'created_at'],
        top: SCAN_LIMIT,
      });
      const contactId = original(contacts ?? []);
      if (contactId) {
        input.duplicate_of_type = 'crm_contact';
        input.duplicate_of_contact = contactId;
        input.duplicate_status = 'suspected';
        return;
      }

      // Open leads only. A predecessor that already converted is represented by
      // the contact it created, which the branch above matches on the same
      // address — pointing at the locked lead instead would name a record
      // nobody can work.
      const leads = await api.object('crm_lead').find({
        where: { email, is_converted: false },
        fields: ['id', 'created_at'],
        top: SCAN_LIMIT,
      });
      const leadId = original(leads ?? []);
      if (leadId) {
        input.duplicate_of_type = 'crm_lead';
        input.duplicate_of_lead = leadId;
        input.duplicate_status = 'suspected';
      }
    } catch {
      // Swallow: see above. (No `console` in the L2 hook sandbox.)
    }
  },
};

export default [leadAutoAssignHook, leadHook, leadDuplicateCheckHook];
