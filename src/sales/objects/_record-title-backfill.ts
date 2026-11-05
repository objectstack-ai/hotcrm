// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from './_hook-api';

/**
 * An untitled record, read, is titled by re-sending one of its own fields (#2414).
 *
 * Four objects title their records with a stored field the engine computes
 * from the row: `crm_contact.full_name`, and `display_title` on `crm_lead`,
 * `crm_case` and `crm_forecast` (#2230, 6.1.0). The engine computes it on
 * every insert and every update by id, and on nothing else. A row written
 * before 6.1.0 and not edited since holds no title, so a lookup that shows the
 * record by its title (an opportunity's Primary Contact) shows another field
 * or the id instead.
 *
 * Self-hosted operators can run `scripts/backfill-record-titles.ts`. A hosted
 * environment cannot: the script signs in with a password, and hosted sign-in
 * is single sign-on only. The platform's own fill, `os migrate
 * stored-expressions` (objectstack#29961), is a command too, and is in no
 * release HotCRM pins yet. An installed package gets no upgrade-time code
 * path (the #2168 reading: package `migrations` are retired, `onEnable` does
 * not survive the JSON artifact, and seeds do not run where sample data is
 * off). So the trigger is the first read that shows such a row, the route
 * #2168 took for line-item product titles.
 *
 * For each row in the read that shows the title field and holds no title, it
 * re-sends the row's own value of one field, unchanged — the same write the
 * script makes. That is an update by id, so the engine computes the title
 * from the stored row and stores it. Nothing else about the row changes;
 * a frozen row (a closed case, a converted lead) accepts it, because a value
 * re-sent unchanged is not a change.
 *
 * It does not fix the response that triggered it. A hosted hook body hands
 * only `input` back to the engine, never `result`, so the first read after an
 * upgrade still shows the empty title and the next one shows it filled.
 *
 * Bounded so a converged org pays nothing and an unconverged one never loops:
 *
 * - a person's read is the trigger; a system read (an update's own look at
 *   the row it writes, an automation's read, this hook's own read) is not.
 *   Measured on 18.3.0, the re-send reads its row back as a system read,
 *   which would otherwise start a second pass over the row;
 * - it looks only at the rows the read returned, and only at a row whose
 *   title field is in the read (a read that does not show the title cannot
 *   show it empty). While every row is titled it makes no database call;
 * - its own read of the row asks for the id and the re-sent field, never the
 *   title, so that read cannot start another pass;
 * - a row whose re-sent field is empty is left alone: the expression would
 *   give it no title, and the read would write it again every time it ran
 *   (the 5.1.1 trap #2171 fixed). Three of the four fields are required and
 *   `forecast_derive_period` fills the fourth on every write, so that row is
 *   one written around the engine;
 * - at most {@link ROWS_PER_READ} rows per read, to stay inside the hosted
 *   sandbox's wall-clock ceiling; the next read finds the rest.
 *
 * `async`, so it runs off the read's response path; `runAs: 'system'`, so a
 * reader who may not edit the row still gets it titled (the write changes no
 * value the reader could not already see). It reads and writes by id only,
 * rows the caller's own read returned, so no organization predicate is owed
 * (AGENTS.md rule 10 governs scans).
 *
 * Side effects. The write is an ordinary update: a hook's `ctx.api` write
 * cannot carry the engine's `skipAutomations` (measured on 18.3.0, the
 * repository sets its own context over the caller's options), so
 * `updated_at` moves, `updated_by` is the reader, the audit log records the
 * title being set, and the `record-after-update` automation runs as for a
 * person's edit. The one that could act on it is `case_escalation`, and it
 * sits this write out: its condition skips the update that first stores a
 * case's title (`previous.display_title` empty), so an open Critical case
 * that was never escalated is titled and left as it is, and its next edit
 * escalates it. Every other after-update hook on the four objects acts on a
 * change of a field this write does not carry.
 *
 * A factory, so each object's hook sits in that object's own `*.hook.ts`
 * (ADR-0130 R4) while the body exists once. The handler is lowered body-only
 * into a QuickJS sandbox, so its table lives inside it.
 */
export function createRecordTitleBackfill(name: string, object: string): Hook {
  return {
    name,
    object,
    events: ['afterFind'],
    priority: 900,
    runAs: 'system',
    async: true,
    onError: 'log',
    description: 'Re-send one of its own fields for every untitled row a read returns, so the engine stores its title.',
    handler: async (ctx: HookContext) => {
      // Inside the handler, not at module scope: a lowered body has none.
      const ROWS_PER_READ = 10;
      const TITLES: Record<string, { title: string; resend: string }> = {
        crm_contact: { title: 'full_name', resend: 'last_name' },
        crm_lead: { title: 'display_title', resend: 'company' },
        crm_forecast: { title: 'display_title', resend: 'period_label' },
        crm_case: { title: 'display_title', resend: 'subject' },
      };
      // A person's read is the trigger. A read the system makes for itself —
      // an update's own look at the row it writes, an automation's read, this
      // hook's own read — never starts a pass: measured on 18.3.0, the re-send
      // below reads its row back as a system read, which would otherwise
      // start a second pass over the same row before the first one landed.
      if ((ctx.session as { isSystem?: unknown } | undefined)?.isSystem === true) return;
      const target = typeof ctx.object === 'string' ? ctx.object : '';
      const spec = TITLES[target];
      if (!spec) return;
      const api = ctx.api as HookApi | undefined;
      if (!api) return;
      const result = (ctx as { result?: unknown }).result;
      const rows: unknown[] = Array.isArray(result) ? result : result && typeof result === 'object' ? [result] : [];
      const ids: string[] = [];
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const r = row as Record<string, unknown>;
        if (!Object.prototype.hasOwnProperty.call(r, spec.title)) continue;
        const title = r[spec.title];
        if (typeof title === 'string' && title.trim() !== '') continue;
        if (typeof r.id === 'string' && r.id !== '' && !ids.includes(r.id)) ids.push(r.id);
        if (ids.length >= ROWS_PER_READ) break;
      }
      for (const id of ids) {
        // Never the title here: a read showing it empty would start another pass.
        const row = await api.object(target).findOne({ where: { id }, fields: ['id', spec.resend] });
        const value = row ? row[spec.resend] : undefined;
        if (typeof value !== 'string' || value.trim() === '') continue;
        await api.object(target).update({ id, [spec.resend]: value }, { where: { id } });
      }
    },
  };
}
