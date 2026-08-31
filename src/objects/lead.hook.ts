// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Lead automation hook.
 *
 * - Auto-scores incoming leads into `rating` (1-5) using industry/title/email/phone weights.
 * - Refuses edits to a converted lead — but not the engine's reference cleanup,
 *   so a converted lead never makes its conversion products undeletable.
 * - When status flips to `qualified`, schedules a follow-up `crm_task` for the current user.
 * - Normalizes `email` and flags a re-captured address as a suspected duplicate.
 */

// ⚠️ The scoring constants and `computeRating` live INSIDE `lead_automation`'s
// handler: L2 hook bodies run body-only in the QuickJS sandbox, so module scope
// is not reachable at runtime. Tune the weights in the handler — a module-level
// copy is dead code that silently diverges from the copy that actually runs.

/**
 * Lead auto-assignment (load-balanced round-robin).
 *
 * A lead created without an owner (CSV import, web-to-lead, API capture) is
 * assigned to the sales rep with the FEWEST open leads — a self-balancing
 * round-robin that needs no rotation counter. It writes `owner_id`, the platform
 * ownership anchor that OWD, sharing and the "My Leads" view all read, so the
 * assigned rep really owns the lead rather than merely being named on it.
 *
 * ⚠️ Writing a FOREIGN owner is normally an ownership transfer, denied without
 * `allowTransfer` (#3004). It passes here because of WHERE this runs, not what
 * it is granted: a `beforeInsert` hook mutates `opCtx.data` INSIDE the operation
 * the security middleware already wrapped, so the guard read (and stamped) the
 * payload before this line changed it. `test/ownership-model.test.ts` pins that
 * ordering against a real ObjectQL — an assumption here would be the difference
 * between round-robin working and every web-to-lead submission 403-ing.
 *
 * The rep pool is whoever holds the `sales_rep` position (`sys_user_position`).
 * When that pool is empty (a fresh org before positions are assigned) the hook
 * is a NO-OP and the lead keeps whatever owner it had — it never blocks lead
 * creation. UI-created leads already carry `owner_id` = creator (the
 * middleware's insert-time stamp), so this only fires on genuinely ownerless
 * intake.
 *
 * Runs beforeInsert so the downstream `lead_assignment` flow (afterInsert) sees
 * the assigned owner and routes its SLA alert to that rep.
 *
 * ⚠️ Priority 250 — hooks run in ASCENDING priority order, so this must run
 * AFTER `lead_automation` (200), whose guest branch strips a client-spoofed
 * `owner_id` from anonymous Web-to-Lead submissions. Assigning first and being
 * stripped afterwards lands every web-to-lead ownerless — the exact case this
 * hook exists for.
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
      // Web-to-Lead: anonymous submissions from the public form get sensible
      // defaults stamped server-side so they cannot be spoofed by the client.
      // Guests are unauthenticated, so we identify them by the absence of
      // `ctx.user?.id`. (The `guest_portal` profile already restricts them to
      // INSERT-only on `crm_lead`.)
      //
      // ⚠️ `!ctx.session?.isSystem` is required, not decoration: a SYSTEM write
      // (seed load, backfill, demo bootstrap) also arrives with no user id, and
      // the strip below would otherwise blank the owner and conversion state of
      // every system-written lead. The converted-lead lock further down reads
      // that same absence as the system-write signal, so the two readings have
      // to agree. `case.hook.ts`'s guest branch carries the same correction.
      const isGuestSubmission = !ctx.user?.id && !ctx.session?.isSystem;
      if (isGuestSubmission) {
        if (!input.lead_source) input.lead_source = 'web';
        if (!input.status)      input.status      = 'new';
        // Never trust client-supplied conversion / ownership fields on a public
        // form — OVERWRITE them with a safe value.
        //
        // ⛔ Platform constraint: `delete input.x` in a hook is a SILENT NO-OP.
        // ObjectQL's flat-record input Proxy has no `deleteProperty` trap, so
        // the key survives the delete and reaches storage, while an ASSIGNMENT
        // to the same key on the same `input` lands normally. This block was
        // ten `delete` statements and every one of them did nothing; the
        // symptom was a guest insert storing `is_converted: true` and an
        // `owner_id` it supplied itself. Assignment is trapped and survives, so
        // assignment is what this block uses. The same note sits on
        // `case.hook.ts`'s guest branch, which shares the finding.
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
        // Same reasoning for the duplicate link: a submitter who can post
        // `duplicate_status: 'confirmed'` can switch OFF the intake dedupe for
        // their own submission (`lead_duplicate_check` stands down on a record
        // that already carries a verdict) and park a link to any record id they
        // care to guess. Guests state facts about themselves, never about the
        // pipeline.
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
    // This is the ONLY converted-lead guard — there is deliberately no second,
    // friendlier script validation over the same four identity fields, because
    // this throw always won the race and a second layer could only drift. The
    // message below therefore has to carry the whole story, hence the
    // attempted-field list.
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
          // Re-measured on 17.1.0 — the version this repo pins — with a probe
          // hook at priority 199 immediately ahead of each guard, not assumed.
          // The engine builds its cleanup write on the CALLER's own context
          // plus two engine keys, so on the path a REST `DELETE` takes, the
          // cascade and a user's hand-clear of the same lookup are identical
          // everywhere a guard can look: payload
          // `{ id, <link>: null, updated_at, updated_by }`, `ctx.user` the
          // CALLER, `ctx.session` the caller's own `{ userId, isSystem }`.
          // (Both `updated_by` and the identity drop out together when the
          // DELETE itself carried no `userId` — a rig artefact, not this app's
          // path.) So the WRITE SHAPE is not a discriminator, and the yield
          // below is not one either: it lets ANY caller clear a declared link
          // on a settled record. That is the trade #720 accepted, not a side
          // effect of it.
          //
          // ⚠️ A marker DOES reach a hook — and is deliberately not read. An
          // earlier version of this note concluded "no marker reaches a hook,
          // and the WRITE SHAPE is the only evidence there is"; it reasoned
          // only about `ctx.session`, whose allow-list really does omit
          // `__`-prefixed operation-private keys, and missed the other route
          // into the context. `ObjectQL.cascadeDeleteRelations` builds
          // `{ ...context, __referentialFieldClear: true }`, readable at
          // `ctx.api.executionContext.__referentialFieldClear`: measured `true`
          // on every cascade into `crm_opportunity`, `crm_quote` and
          // `crm_lead`, `undefined` on every hand-clear (#1165, #1412).
          //
          // ⛔ The #1165 ruling (2026-08-25) reviewed that and upheld NOT
          // reading it, on two grounds. It is an operation-private key — an
          // undeclared dependency that can vanish in a patch release. And
          // reachability through the SHIPPED path is unproven: a hook body runs
          // body-only in QuickJS, where `buildSandboxApi` passes `engineCtx.api`
          // only when that exposes `object()`, and otherwise a shim with no
          // `executionContext` at all. Green in a kernel rig and silently false
          // in production is the worst outcome a guard can have. The declared
          // replacement `ctx.referentialFieldClear` is asked for upstream as
          // objectstack-ai/objectstack#13644.
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

          // Name the lead the way `crm_lead.display_title` does — the person
          // and the company, joined — rather than appending the record id,
          // which is unmatchable against every lead surface in this app (record
          // page, list view, breadcrumb, lookup picker), all of which title a
          // lead `Ada Lovelace - Acme`. Composed from the two stored columns
          // because a lowered hook body cannot read the `display_title` formula.
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

      // Title the task with the lead's name, not its record id. **All Tasks**
      // is where a rep starts the day; a queue of rows reading `Follow up with
      // qualified lead (EMtmaScoa3I-uYFG)` is a queue nobody can triage, and
      // the key matches nothing on any lead page or in search. Both halves
      // prefer the value THIS write is setting, since a qualifying write may be
      // renaming the lead in the same payload.
      //
      // ⚠️ The 255 cap is load-bearing, exactly as in `case.hook.ts`:
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
 * Soft lead dedupe.
 *
 * A prospect who enquires twice must not be REJECTED — a re-captured address is
 * recorded as a fact instead of refused, so the public Web-to-Lead form never
 * answers a returning visitor with a save error.
 *
 * Four jobs, all `before`-phase so the values land in the same write:
 *
 * 1. **Normalize `email`** (trim + lowercase), exactly as `contact_integrity`
 *    does on `crm_contact`. ⚠️ This is what makes the dedupe lookup below a
 *    plain equality match: there is no case-insensitive predicate to lean on —
 *    ObjectQL's `$regex` compiles to a LIKE *substring* on SQL, which would
 *    match `a@b.com` inside `xa@b.com` — so the canonical form has to be
 *    established by the PRODUCER at write time rather than worked around by
 *    every reader. Also on update: an edit reintroducing mixed case would
 *    silently make the record invisible to every later dedupe.
 *
 * 1b. **Fold `company` into `company_normalized`** — a SEPARATE column, not an
 *    in-place rewrite, because `company` is the display value the conversion
 *    flow copies onto the account it creates. It is the lead half of the pair
 *    `crm_account.name_normalized` completes, and it exists for the same reason
 *    as the email fold: the reader (a flow template) can compare two stored
 *    columns but cannot compute either one.
 *
 * 2. **Link a repeated address to the record it repeats** — on insert only.
 *    An existing `crm_contact` wins over an open lead: the prospect who already
 *    became a contact is the further-along record, and the one the conversion
 *    flow would reuse anyway. Within a kind the OLDEST record wins, so a cluster
 *    of five re-submissions all point at the same origin instead of chaining.
 *
 * 3. **Retire the whole claim when the record it named is gone** — on update
 *    only, and the exact mirror of job 2: the hook that stamps a duplicate link
 *    is the one that takes it back down. See the note at the block itself.
 *
 * The write is `duplicate_status: 'suspected'` — a machine's guess, explicitly
 * distinguished from the `confirmed` verdict a human records when disqualifying
 * as a duplicate. The hook stands down on any record that already carries a
 * verdict, so `confirmed` can never be reverted to `suspected` by a later
 * write, and on any record that already names a survivor.
 *
 * Detection is INSERT-only by design: a later edit re-scanning would re-open a
 * question a human may have already closed, and the review queue
 * (`suspected_duplicates`) is the affordance for anything intake missed.
 *
 * ⚠️ Priority 300 — after `lead_automation` (200), whose guest branch strips
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

    // 1c. Retire a duplicate claim once the record it named is gone.
    //
    //     ⚠️ Platform constraint. `duplicate_of_type` is a DISCRIMINATOR, and
    //     `lead.object.ts` pairs it with the lookup it names through
    //     `requiredWhen` — so "the type is set" and "that lookup is populated"
    //     are ONE fact stated in two columns. Neither lookup declares a
    //     `deleteBehavior`, so both take the spec default `set_null`, and the
    //     engine implements `set_null` by UPDATING the row that HOLDS the
    //     lookup. Deleting the contact (or lead) a lead was flagged against
    //     therefore arrives here as `{ id, duplicate_of_<x>: null, … }`, nulls
    //     one half of the pair, and the row instantly breaks its own rule — so
    //     the whole delete rolls back with `Duplicate Of Contact is required`,
    //     an error naming a field on an object the caller never addressed.
    //
    //     The blast radius is why this matters: the flag is stamped
    //     automatically at intake on any OPEN lead that merely re-uses a
    //     contact's email, so an ordinary duplicate makes that CONTACT
    //     undeletable — and because `crm_contact.crm_account` is a
    //     master-detail with `deleteBehavior: 'cascade'`, the ACCOUNT above it
    //     too. A GDPR "delete this person" request with no way to carry it out.
    //
    //     The rule restored here is one line: **the discriminator may not
    //     outlive the lookup it names.** When a write leaves that lookup blank,
    //     the claim is retired WHOLE — type and status go with the link — and
    //     the lead simply stops saying it duplicates something.
    //
    //     ⚠️ This is deliberately NOT a second spelling of #720's "is this write
    //     the engine's reference cleanup?" predicate in `lead_automation` above.
    //     Re-measured on 17.1.0 with a probe hook at priority 199: the engine's
    //     cleanup write and a user's hand-clear of the same lookup are identical
    //     in everything this block could read — identical `input`
    //     (`{ id, <link>: null, updated_at, updated_by }`), identical
    //     `ctx.user`, identical `ctx.session` — because the engine builds the
    //     cleanup on the CALLER's own context. They are not indistinguishable
    //     outright, though: a marker is reachable at
    //     `ctx.api.executionContext.__referentialFieldClear`, `true` on the
    //     cascade and `undefined` on the hand-clear. The #1165 ruling of
    //     2026-08-25 upheld NOT reading it — an operation-private key is an
    //     undeclared dependency, and a hook body in QuickJS can be handed an
    //     api shim with no `executionContext` at all (#1412; the declared
    //     replacement is asked for as objectstack-ai/objectstack#13644).
    //     None of which changes this block, and that is the point: asking "is
    //     the pair still whole?" needs no provenance at all, and answers both
    //     callers the same correct way — a lead whose link you removed no
    //     longer duplicates anything, however the removal was spelled.
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
    //     nulls are added to it. Its reference-cleanup yield passes a write only
    //     when every non-system change is a declared LOOKUP going value→null,
    //     and `duplicate_of_type` / `duplicate_status` are neither — so at a
    //     lower priority this block would make the converted-lead lock refuse
    //     the very cleanup that yield exists to allow.
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
        // Two outcomes, and which applies turns on ONE question: did a human
        // ever look at these two records and agree? `duplicate_status` already
        // records exactly that, so the question is answered from the record's
        // own vocabulary rather than from a second rule restated here.
        //
        //   `confirmed` — a person compared the two records and said yes. The
        //     record it named is gone, but the VERDICT is about what the
        //     reviewer found, not about the pointer. So the claim is
        //     TOMBSTONED: the discriminator moves to `erased` and the status
        //     stands, and the lead goes on saying "confirmed duplicate of a
        //     record that has since been erased".
        //
        //   anything else — the machine's `suspected` guess, or no opinion at
        //     all. Retired WHOLE; there is no human verdict to preserve.
        //
        // ⚠️ `'erased'` is spelled INLINE on purpose. L2 hook bodies run
        // body-only in the QuickJS sandbox, so `DUPLICATE_OF_TYPE_ERASED` from
        // `_picklists.ts` would resolve at authoring time and arrive as
        // `undefined`. The canonical constant is the one in `_picklists.ts`;
        // `test/lead-duplicate-management.test.ts` pins this literal to it and
        // pins this block as its only writer, so the two cannot drift.
        //
        // The verdict is read from `previous`, and the write must be SILENT
        // about it — `'duplicate_status' in input` disqualifies the tombstone.
        // That keeps the tombstone on the erasure path and off every other one:
        // the engine's `set_null` cleanup never mentions the status, while a
        // caller that DOES mention it is managing the claim by hand, and a
        // hand-blanked pointer is not an erasure. It also means no payload can
        // manufacture a tombstone by supplying its own `confirmed`.
        if (!('duplicate_status' in input) && previous?.duplicate_status === 'confirmed') {
          input.duplicate_of_type = 'erased';
          // `duplicate_status` deliberately UNTOUCHED — it stays `confirmed`,
          // which is what keeps the surviving state readable as a verdict.
        } else {
          input.duplicate_of_type = null;
          // `duplicate_status` goes with it. Its readers in this app are the
          // `suspected_duplicates` review queue (`src/views/lead.view.ts`),
          // whose whole workflow is "open the two records and compare them";
          // the `duplicate_disqualification_requires_survivor` validation,
          // which demands a NAMED survivor; the duplicate form block; and this
          // hook's own insert-time stand-down, which reads the payload and
          // never the stored row. With no link left, none of them can act on
          // `suspected`, and leaving it would park a permanently unworkable row
          // in that queue. The verdict is not lost: `duplicate_status` declares
          // `trackHistory: true`, so who decided what, and when, stays on the
          // record's field history.
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
    // `lead_auto_assign` above. An anonymous Web-to-Lead submission runs under
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
