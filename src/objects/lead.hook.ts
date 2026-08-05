// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * Lead automation hook.
 *
 * - Auto-scores incoming leads into `rating` (1-5) using industry/title/email/phone weights.
 * - Refuses edits to a converted lead.
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
      const isGuestSubmission = !ctx.user?.id;
      if (isGuestSubmission) {
        if (!input.lead_source) input.lead_source = 'web';
        if (!input.status)      input.status      = 'new';
        // Never trust client-supplied conversion / ownership fields on
        // a public form — strip them defensively.
        delete (input as Record<string, unknown>).is_converted;
        delete (input as Record<string, unknown>).converted_account;
        delete (input as Record<string, unknown>).converted_contact;
        delete (input as Record<string, unknown>).converted_opportunity;
        delete (input as Record<string, unknown>).converted_date;
        delete (input as Record<string, unknown>).owner_id;
        // Same reasoning for the duplicate link (#598): a submitter who can
        // post `duplicate_status: 'confirmed'` can switch OFF the intake
        // dedupe for their own submission (`lead_duplicate_check` stands down
        // on a record that already carries a verdict) and park a link to any
        // record id they care to guess. Guests state facts about themselves,
        // never about the pipeline.
        delete (input as Record<string, unknown>).duplicate_of_type;
        delete (input as Record<string, unknown>).duplicate_of_lead;
        delete (input as Record<string, unknown>).duplicate_of_contact;
        delete (input as Record<string, unknown>).duplicate_status;
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
    // second implementation that could only drift. The messages below therefore
    // have to carry the whole story — hence the attempted-field list.
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
          // Every lookup on `crm_lead` a referential clear can attack. The
          // engine's `cascadeDeleteRelations` pass clears a `set_null` lookup
          // by UPDATING the row that holds it, so deleting the account /
          // contact / opportunity a converted lead points at (or the lead /
          // contact it was flagged as a duplicate of) arrives here as an
          // ordinary `beforeUpdate` — and nothing in the hook context says the
          // write came from a cascade (measured on 17.0.0-rc.2: the ctx carries
          // no cascade marker, and `session` is the caller's own). So a delete
          // of an opportunity was reported as an *edit* of a *lead* (#693).
          // Both messages below therefore describe the LOCK and the LINK rather
          // than assuming which record the caller addressed.
          const REFERENCE_FIELDS = new Set([
            'converted_account', 'converted_contact', 'converted_opportunity',
            'duplicate_of_lead', 'duplicate_of_contact',
          ]);
          const person = [previous?.first_name, previous?.last_name]
            .filter((part) => typeof part === 'string' && part.trim() !== '')
            .join(' ');
          const name = person || (typeof previous?.company === 'string' ? previous.company : '');
          const leadId =
            (typeof previous?.id === 'string' && previous.id) ||
            (typeof input.id === 'string' && input.id) ||
            '';
          const label = [name, leadId ? `(${leadId})` : ''].filter(Boolean).join(' ');

          // A refusal made up ENTIRELY of links being cleared is the shape a
          // delete of the linked record produces — describe it that way. A
          // user nulling the same field by hand gets the same (true) sentence.
          const detached = violating.filter(
            (k) => REFERENCE_FIELDS.has(k) && input[k] === null && previous?.[k] != null,
          );
          if (detached.length === violating.length) {
            throw new Error(
              `${label ? `Converted lead ${label}` : 'A converted lead'} is locked, so its link(s) ${detached.join(', ')} cannot be cleared — which also blocks deleting the record(s) they point at. Delete the lead first, or have an admin clear the link with a system write.`,
            );
          }
          throw new Error(
            `Cannot edit ${label ? `converted lead ${label}` : 'a converted lead'} (attempted: ${violating.join(', ')}). Make changes on the converted records instead.`,
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

      try {
        await api.object('crm_task').insert({
          subject: `Follow up with qualified lead${leadId ? ` (${leadId})` : ''}`,
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
 * Three jobs, all `before`-phase so the values land in the same write:
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
