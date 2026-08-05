// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ExpressionEngine, buildScope, collectCelRootIdentifiers } from '@objectstack/formula';
import stack from '../objectstack.config';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * ═══ HOUSE RULE: view predicates are `record.`-bound AND TOTAL ═════════════
 *
 * **Every predicate in `src/views/*.view.ts` reads its field values through the
 * `record` namespace, and every `record.x` read carries a `has(record.x)`
 * guard** (plus `!= null` when the comparison is an ordering one). A form
 * predicate must return a verdict for every record shape the renderer can hand
 * it — never abort. This file enforces it; you do not have to remember it.
 *
 * This is the SAME totality rule `test/object-validation-predicates.test.ts`
 * states for object `validations[]` and `test/flow-condition-totality.test.ts`
 * states for record-change flow conditions, applied to a **third surface with a
 * third failure mode**. Per #633 the surfaces were measured separately rather
 * than assumed alike, and this one is the worst of the three:
 *
 *   | surface                  | unevaluable predicate ⇒                      |
 *   | ------------------------ | -------------------------------------------- |
 *   | object `validations[]`   | write REJECTED, named rule (17.0.0-rc.2)     |
 *   | flow condition           | run FAILS, logged at ERROR                   |
 *   | view `visibleWhen` (here)| FAILS OPEN — field shown, no diagnostic      |
 *
 * A silently-visible field is not a cosmetic defect, because a *visible* field
 * carries its `required: true` into the console's client-side submit check. So
 * a predicate that cannot answer does not degrade to "shown but optional" — it
 * makes the form unsatisfiable.
 *
 * ### What that cost, and the two measurements the rule rests on (#688)
 *
 * Console → Leads → New was unusable on 17.0.0-rc.2: submit was blocked with
 * five "required" errors for fields that cannot apply to a brand-new lead, and
 * zero network writes fired. `duplicate_of_lead` and `duplicate_of_contact` are
 * mutually exclusive by design, so the form demanded something no input could
 * satisfy. REST create returned 201 for the same payload — the object's
 * `requiredWhen` predicates were already `record.`-bound AND guarded, so the
 * server half was right the whole time. Only the form half was wrong.
 *
 * Both halves of the mechanism were measured on the platform's own engine
 * (`ExpressionEngine` from `@objectstack/formula` — the evaluator the console
 * bundle drives, per objectstack#5149's `a.evaluate(Ie(e), { record, previous, … })`):
 *
 *   1. **Namespace.** Values bind under `record`; a bare field name is an
 *      unbound identifier, so it fails for EVERY record — the predicate is not
 *      "sometimes wrong", it never evaluates at all:
 *
 *          evaluate('status == "unqualified"', { record: { status: 'unqualified' } })
 *            → ok:false  kind=type  "Unknown variable: status"
 *          evaluate('record.status == "unqualified"', { record: { status: 'new' } })
 *            → ok:true   false
 *          evaluate('record.status == "unqualified"', { record: { status: 'unqualified' } })
 *            → ok:true   true
 *
 *   2. **Totality.** Prefixing alone does not finish the job. A *new* record has
 *      no key for a field the user has not touched, and strict CEL aborts on the
 *      read — which fails open again, for exactly the five fields in the report:
 *
 *          evaluate('record.duplicate_of_type == "crm_lead"', { record: {} })
 *            → ok:false  "No such key: duplicate_of_type"
 *          evaluate('has(record.duplicate_of_type) && record.duplicate_of_type == "crm_lead"',
 *                                                            { record: {} })
 *            → ok:true   false
 *
 * `!= null` is not a substitute for `has(...)`, and `isBlank(record.f)` /
 * `coalesce(record.f, "")` abort on an absent key too — see the measured table
 * in `test/object-validation-predicates.test.ts`. Ordering comparisons need
 * both guards, because `has()` alone still admits `dyn<null> < int`.
 *
 * ### Scope of this file vs. the platform half
 *
 * The fail-open behaviour itself — an unevaluable `visibleWhen` defaulting to
 * *visible*, with no diagnostic anywhere — is a platform question and stays
 * upstream at objectstack-ai/objectstack#5149. It is deliberately NOT worked
 * around here, and this file cannot reproduce it: the fail-open wrapper lives
 * in the console bundle, not in `@objectstack/formula`. What this file pins is
 * the half HotCRM owns and can keep true forever — that no predicate this app
 * ships can fail to evaluate in the first place, whichever way the platform
 * later decides to treat one that does.
 */

type AnyRec = Record<string, any>;

/**
 * The namespace roots the evaluator actually binds — read off `buildScope`
 * rather than hand-listed, so this file tracks the platform instead of drifting
 * from it. Measured on 17.0.0-rc.2:
 * `record, previous, input, current_user, user, ctx, os`.
 */
const BOUND_ROOTS = new Set(
  Object.keys(
    buildScope({
      record: {},
      previous: {},
      input: {},
      user: { id: 'u' },
      org: { id: 'o' },
      env: 'test',
    }),
  ),
);

/**
 * Every expression the compiled stack carries under `views`, enumerated by
 * walking the artifact — NOT from a hand-kept list of view files or of
 * predicate key names.
 *
 * Two reasons the walk collects *envelopes* (`{ dialect, source }`) rather than
 * looking up known keys: `visibleOn` does not survive compilation (ADR-0089 D2
 * folds it into `visibleWhen` at the schema boundary), and a key list cannot
 * grow when the platform adds a predicate-bearing key. Anything expression-
 * shaped anywhere under `stack.views` is in scope by construction. Measured on
 * 17.0.0-rc.2: 49 envelopes, all of them `visibleWhen`, all `dialect: 'cel'`.
 */
function collectExpressions(root: unknown, path: string, out: { path: string; expr: AnyRec }[]) {
  if (Array.isArray(root)) {
    root.forEach((n, i) => collectExpressions(n, `${path}[${i}]`, out));
    return;
  }
  if (!root || typeof root !== 'object') return;
  const node = root as AnyRec;
  if (typeof node.dialect === 'string' && ('source' in node || 'ast' in node)) {
    out.push({ path, expr: node });
    return;
  }
  for (const [key, value] of Object.entries(node)) collectExpressions(value, `${path}.${key}`, out);
}

/** Object names referenced anywhere inside one view bundle — used for labels. */
function objectsOf(view: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(view)) {
    view.forEach((v) => objectsOf(v, found));
    return found;
  }
  if (view && typeof view === 'object') {
    const node = view as AnyRec;
    if (typeof node.object === 'string') found.add(node.object);
    Object.values(node).forEach((v) => objectsOf(v, found));
  }
  return found;
}

const viewBundles: AnyRec[] = ((stack as AnyRec).views ?? []) as AnyRec[];

const predicates = viewBundles.flatMap((view, index) => {
  const label = [...objectsOf(view)].filter((n) => n.startsWith('crm_'))[0] ?? `views[${index}]`;
  const found: { path: string; expr: AnyRec }[] = [];
  collectExpressions(view, `views[${index}]`, found);
  return found.map(({ path, expr }) => ({
    id: `${label} ${path.replace(`views[${index}]`, '')}`,
    path,
    dialect: String(expr.dialect),
    source: String(expr.source ?? ''),
  }));
});

/**
 * A record shape with EVERY conditional field populated — the "shown" side of
 * each predicate has to be reachable, or a rule that always answers `false`
 * would pass the totality sweep while hiding the field forever.
 */
const POPULATED_LEAD = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  company: 'Analytical Engines',
  email: 'ada@example.com',
  status: 'unqualified',
  rating: 5,
  lead_source: 'web',
  industry: 'technology',
  owner_id: 'user-1',
  notes: 'duplicate of an existing record',
  disqualification_reason: 'duplicate',
  duplicate_of_type: 'crm_lead',
  duplicate_of_lead: 'lead-1',
  duplicate_of_contact: null,
  duplicate_status: 'confirmed',
};

function evaluatePredicate(source: string, record: AnyRec) {
  return ExpressionEngine.evaluate({ dialect: 'cel', source }, { record });
}

describe('view predicates — the sweep itself', () => {
  it('finds a predicate for every one authored in src/views', () => {
    const viewsDir = join(REPO_ROOT, 'src', 'views');
    const authored = readdirSync(viewsDir)
      .filter((f) => f.endsWith('.view.ts'))
      .reduce((total, file) => {
        const src = readFileSync(join(viewsDir, file), 'utf8');
        // Assignments only — the word also appears in prose comments.
        return total + (src.match(/^\s*(visibleOn|visibleWhen):/gm) ?? []).length;
      }, 0);

    // Anti-vacuity. Every assertion below is `for (const p of predicates)`, so an
    // enumeration that silently collected nothing would make this whole file
    // pass by producing no verdicts at all. Tie it to the source of truth on
    // disk: the compiled stack must carry at least as many predicates as the
    // view files declare (`>=`, because one authored constant is spread into
    // several forms).
    expect(authored).toBeGreaterThan(0);
    expect(predicates.length).toBeGreaterThanOrEqual(authored);
  });

  it('only produces predicates the CEL engine handles', () => {
    for (const p of predicates) {
      expect(p.dialect, `${p.id} — non-CEL dialect on a visibility predicate`).toBe('cel');
      expect(p.source.trim(), `${p.id} — empty predicate source`).not.toBe('');
    }
  });
});

describe('view predicates are record-bound', () => {
  it('references only namespaces the evaluator binds', () => {
    const offenders: string[] = [];
    for (const p of predicates) {
      const roots = collectCelRootIdentifiers(p.source);
      if (!roots.ok) {
        offenders.push(`${p.id}: does not parse — ${roots.error}`);
        continue;
      }
      const unbound = roots.roots.filter((r) => !BOUND_ROOTS.has(r));
      if (unbound.length > 0) {
        offenders.push(
          `${p.id}: unbound root(s) ${unbound.join(', ')} in \`${p.source}\` — ` +
            `field values bind under \`record\`, so write \`record.${unbound[0]}\``,
        );
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('a bare field name really is unbound — the premise this rule rests on', () => {
    // Reverse verification, pinned rather than assumed. If a future platform
    // release starts binding bare field names, this flips and the reader is
    // told the rule's premise changed instead of quietly guarding nothing.
    // Direction is deliberate: the bare spelling must fail even when the record
    // DOES carry the field, because the identifier — not the value — is missing.
    const bare = evaluatePredicate('status == "unqualified"', { status: 'unqualified' });
    expect(bare.ok).toBe(false);
    if (!bare.ok) expect(bare.error.message).toContain('Unknown variable: status');

    const bound = evaluatePredicate('record.status == "unqualified"', { status: 'unqualified' });
    expect(bound).toEqual({ ok: true, value: true });
  });
});

describe('view predicates are TOTAL on the real engine', () => {
  it('answers on a brand-new record with no keys at all', () => {
    // The shape the console hands a `New` form. This is the assertion that
    // would have caught #688: on 17.0.0-rc.2 every one of the five lead fields
    // failed here, and a failed predicate is a VISIBLE, REQUIRED field.
    const offenders: string[] = [];
    for (const p of predicates) {
      const result = evaluatePredicate(p.source, {});
      if (!result.ok) {
        offenders.push(`${p.id}: ${result.error.kind} — ${result.error.message.split('\n')[0]}`);
      } else if (typeof result.value !== 'boolean') {
        offenders.push(`${p.id}: returned ${typeof result.value}, not a boolean verdict`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('answers on a fully populated record', () => {
    const offenders: string[] = [];
    for (const p of predicates) {
      const result = evaluatePredicate(p.source, POPULATED_LEAD);
      if (!result.ok) {
        offenders.push(`${p.id}: ${result.error.kind} — ${result.error.message.split('\n')[0]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('answers when every field is present but null', () => {
    // `has()` is true for a present-but-null key, so this shape is what catches
    // an ordering comparison guarded by `has()` alone (`dyn<null> < int`).
    const allNull = Object.fromEntries(Object.keys(POPULATED_LEAD).map((k) => [k, null]));
    const offenders: string[] = [];
    for (const p of predicates) {
      const result = evaluatePredicate(p.source, allNull);
      if (!result.ok) {
        offenders.push(`${p.id}: ${result.error.kind} — ${result.error.message.split('\n')[0]}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

/**
 * The reported form, end to end at the metadata level (#688).
 *
 * Totality alone is not the acceptance criterion — a predicate hard-wired to
 * `false` is total and useless. Each of the five fields is checked in BOTH
 * directions: hidden on the new lead the report could not create, and shown in
 * the state that is supposed to summon it.
 */
describe('crm_lead — the five fields that blocked lead creation', () => {
  const leadView = viewBundles.find((v) => objectsOf(v).has('crm_lead'));

  /** Field entries of the default form, keyed by field name, from the artifact. */
  const formFields = new Map<string, AnyRec>();
  for (const section of (leadView?.form?.sections ?? []) as AnyRec[]) {
    for (const field of (section.fields ?? []) as unknown[]) {
      if (field && typeof field === 'object' && typeof (field as AnyRec).field === 'string') {
        formFields.set((field as AnyRec).field, field as AnyRec);
      }
    }
  }

  const NEW_LEAD = {
    first_name: 'Grace',
    last_name: 'Hopper',
    company: 'UNIVAC',
    email: 'grace@example.com',
    status: 'new',
  };

  const CASES = [
    {
      field: 'disqualification_reason',
      shownWhen: { ...NEW_LEAD, status: 'unqualified' },
      why: 'status is Unqualified',
    },
    {
      field: 'duplicate_of_type',
      shownWhen: { ...NEW_LEAD, status: 'unqualified', disqualification_reason: 'duplicate' },
      why: 'the reason is Duplicate',
    },
    {
      field: 'duplicate_of_lead',
      shownWhen: {
        ...NEW_LEAD,
        status: 'unqualified',
        disqualification_reason: 'duplicate',
        duplicate_of_type: 'crm_lead',
      },
      why: 'the survivor is a lead',
    },
    {
      field: 'duplicate_of_contact',
      shownWhen: {
        ...NEW_LEAD,
        status: 'unqualified',
        disqualification_reason: 'duplicate',
        duplicate_of_type: 'crm_contact',
      },
      why: 'the survivor is a contact',
    },
    {
      field: 'duplicate_status',
      shownWhen: { ...NEW_LEAD, status: 'unqualified', disqualification_reason: 'duplicate' },
      why: 'the reason is Duplicate',
    },
  ] as const;

  it('all five are still declared, still required, still conditional', () => {
    // The fix is the predicate, not the requirement: dropping `required` would
    // "fix" the report by letting a lead be saved in a state the server rejects.
    for (const { field } of CASES) {
      const entry = formFields.get(field);
      expect(entry, `${field} missing from the crm_lead default form`).toBeDefined();
      expect(entry!.required, `${field} lost its required flag`).toBe(true);
      expect(entry!.visibleWhen?.source, `${field} lost its visibility predicate`).toBeTruthy();
    }
  });

  it('is hidden on a brand-new lead, and shown in the state that summons it', () => {
    for (const { field, shownWhen, why } of CASES) {
      const source = String(formFields.get(field)!.visibleWhen.source);

      const onNew = evaluatePredicate(source, NEW_LEAD);
      expect(onNew, `${field}: predicate did not evaluate on a new lead`).toHaveProperty('ok', true);
      expect((onNew as AnyRec).value, `${field} must be hidden on a brand-new lead`).toBe(false);

      const onTrigger = evaluatePredicate(source, shownWhen);
      expect(onTrigger, `${field}: predicate did not evaluate when ${why}`).toHaveProperty('ok', true);
      expect((onTrigger as AnyRec).value, `${field} must be shown when ${why}`).toBe(true);
    }
  });

  it('never demands both duplicate lookups at once', () => {
    // The core of the report: the form asked for a lead that duplicates BOTH an
    // existing lead AND an existing contact. They are mutually exclusive by
    // design, so a form that shows both is unsatisfiable however it is filled.
    const base = { ...NEW_LEAD, status: 'unqualified', disqualification_reason: 'duplicate' };
    const lookups = ['duplicate_of_lead', 'duplicate_of_contact'] as const;

    for (const record of [
      base,
      { ...base, duplicate_of_type: 'crm_lead' },
      { ...base, duplicate_of_type: 'crm_contact' },
    ]) {
      const shown = lookups.filter((field) => {
        const result = evaluatePredicate(String(formFields.get(field)!.visibleWhen.source), record);
        return result.ok && result.value === true;
      });
      expect(
        shown.length,
        `both duplicate lookups visible at once for duplicate_of_type=${String(
          (record as AnyRec).duplicate_of_type ?? '<unset>',
        )} — the form cannot be satisfied`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('says the same thing the object says — form and server agree', () => {
    // The lookups' `visibleWhen` and the object's `requiredWhen` must be the
    // same predicate: a field the server will demand has to be reachable on the
    // form, and a field the form demands has to be one the server wants. They
    // drifted into different dialects once (#688); pin them together.
    const leadObject = ((stack as AnyRec).objects ?? []).find((o: AnyRec) => o.name === 'crm_lead');
    expect(leadObject, 'crm_lead object missing from the stack').toBeDefined();

    for (const field of ['duplicate_of_lead', 'duplicate_of_contact'] as const) {
      const declared = (leadObject.fields as AnyRec)[field];
      expect(declared?.requiredWhen?.source, `${field} has no requiredWhen on the object`).toBeTruthy();
      expect(String(formFields.get(field)!.visibleWhen.source)).toBe(String(declared.requiredWhen.source));
    }
  });
});
