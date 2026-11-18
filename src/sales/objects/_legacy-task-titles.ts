// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * UPGRADE CONTINUITY — the English titles the app's automations wrote before
 * their records carried an `automation_key` (#2494, #2522).
 *
 * Since the automatic task titles became text in the organization's language,
 * three gates find their own task by `crm_task.automation_key` instead of by
 * its title: `case_close_escalation_task` (`src/service/objects/case.hook.ts`),
 * the stall sweep (`src/sales/flows/opportunity-stagnation.flow.ts`) and the
 * renewal sweep (`src/sales/flows/contract-renewal.flow.ts`). A task written
 * before that release has no key, and an organization that upgrades with such
 * a task still open must not get a second stall task or renewal reminder, nor
 * keep an escalation task its case's close no longer completes. So each gate
 * ALSO matches a task that has no `automation_key` and carries the exact title
 * its gate matched before: those tasks were only ever written in English, so
 * the old shape is one language, and these constants are it.
 *
 * ⛔ Nothing new is written in these shapes, and nothing else may read them.
 * They exist only so pre-release rows keep being recognised; a task written
 * since carries its key in every language.
 *
 * The case hook cannot import them — a hook body runs in a QuickJS sandbox
 * with no module scope (AGENTS.md, Tech Stack rule 3) — so it spells the two
 * escalation titles inline, and `test/legacy-task-titles.test.ts` holds that
 * copy equal to these.
 */

/** `case_status_side_effects`' old titles: `Escalated: <number · subject>`, or the untitled sentence. */
export const LEGACY_ESCALATION_TITLE_PREFIX = 'Escalated: ';
export const LEGACY_ESCALATION_TITLE_UNTITLED = 'Escalated case needs attention';

/** The stall sweep's old titles: `Advance stalled deal: <name>` (cut to 254 + `…` past 255), or the private one. */
export const LEGACY_STALL_TITLE_PREFIX = 'Advance stalled deal: ';
export const LEGACY_STALL_TITLE_PRIVATE = 'Advance stalled deal (private opportunity)';

/** The renewal sweep's old reminder title: `Renewal due: contract <contract number>`. */
export const LEGACY_RENEWAL_TITLE_PREFIX = 'Renewal due: contract ';

/** The old titles' cut: over `crm_task.subject`'s 255, the first 254 characters and an ellipsis. */
export const LEGACY_TITLE_CAP = 255;
