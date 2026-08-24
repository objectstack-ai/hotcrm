// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Object-aware field consumer ledger (#1193).
 *
 *   pnpm scan:fields               # the ledger a human reads
 *   pnpm scan:fields --all         # every field, with its verdict
 *   pnpm scan:fields --sites <obj>.<field>   # where one field is read
 *   pnpm scan:fields --json        # the same measurement, machine-readable
 *
 * ## Why this exists — the false negative that cannot show up in a grep
 *
 * #1182 adjudicated ten declared-but-inert fields. Its row set came from a scan
 * that called a field consumed when its NAME appeared in a `src/**\/*.ts` file
 * outside `views/` and `translations/`. That scan is line-oriented and
 * **object-blind**, and one field paid for it: `crm_product.tax_rate` read as
 * consumed because `crm_quote_line_item.tax_rate` — a different object's field,
 * with its own formula reading its own rate — spells the same token. The
 * product's rate reached no card. `is_taxable`, two declarations away in the
 * same field group and inert for exactly the same reason, did reach it, because
 * its name happens to be unique.
 *
 * The failure mode is what makes it worth a tool rather than a fix. A false
 * NEGATIVE is invisible by construction: the scan's own output cannot show what
 * it filtered out, so re-running it — however carefully — re-derives the same
 * blind spot, and every field whose name is shared across objects keeps the same
 * immunity. There is no amount of care with a grep that closes this.
 *
 * ## What "object-aware" means here
 *
 * A hit is resolved to **the object whose declaration it sits inside**, not to
 * the file it appears in. The whole consumer surface of this app is the
 * registered stack, so the scan walks `objectstack.config.ts` itself and carries
 * an OBJECT CONTEXT down the tree: `object` / `objectName` / `targetObject` /
 * `data.object` / `list.data.object`, and `dataset` resolved through the
 * dataset's own object. A view column, a flow node config, a hook body and a
 * validation predicate each answer "which object?" from the declaration that
 * encloses them.
 *
 * Text blobs — hook handlers, action bodies, CEL sources, skill instructions —
 * are scanned with the same rule applied WITHIN the blob: an object named in the
 * text (`api.object('crm_product')`, a bare `crm_product`) sets the context for
 * everything after it. Two candidates are credited for each token, the nearest
 * preceding mention and the enclosing declaration's own object, and only when
 * that object actually declares the token. Crediting both is a deliberate,
 * stated approximation: a handler that reads its own object and one it loads
 * genuinely reads both, and under-crediting the declaring object would invent
 * inert fields, which is the noisy direction rather than the silent one.
 *
 * Any token that resolves to NO object is counted and reported (`unresolved`),
 * never dropped. A scan that silently discards what it cannot place is how the
 * previous one granted immunity.
 *
 * ## Consumption is not one thing — the three buckets
 *
 * #1182 removed fields that a view column displayed (`quantity_on_hand` had a
 * whole list view), and kept one that a roll-up computed. So a boolean
 * "consumed" would have argued against that card's own verdicts. Every site is
 * therefore bucketed, and the verdict reads off the buckets:
 *
 *   - **behaviour** — the field makes something happen: a formula or summary
 *     expression, a validation predicate, a view FILTER / sort / grouping (they
 *     decide which records you see), a flow node, a hook or action body, a
 *     dataset dimension or measure, a dashboard or report config, a sharing-rule
 *     condition, a skill's instructions.
 *   - **display** — the field is only drawn: a view column, a form or page
 *     field, `highlightFields`, `searchableFields`, an index.
 *   - **carrier** — the field is merely carried along: locale bundles, seed
 *     values, import-mapping columns, and prose (`label` / `description` /
 *     `message` …). These are what a REMOVAL must clean up; none of them is
 *     evidence that anything reads the field.
 *
 *   `live` = at least one behaviour site.
 *   `display-only` = drawn somewhere, but nothing reads it.
 *   `inert` = neither. This is the ledger #1182 adjudicated row by row.
 *
 * ## Report-only, deliberately — this is not a `pnpm verify` gate
 *
 * Argued in the PR for #1193 and recorded here because the next reader will ask.
 * The maintainer ruling of 2026-08-17 was 「逐个 enforce-or-remove（推荐）」 —
 * per-field adjudication, not a blanket rule. A gate that failed on any inert
 * field would encode the blanket rule the ruling declined to make, and would go
 * red the moment someone lands a field one PR before its consumer, which is
 * ordinary in a metadata app. What this card actually needed fixed was not
 * inertness but INVISIBILITY, and a tool that prints a ledger fixes that.
 *
 * The capability is guarded instead of the count: `test/field-consumer-scan.test.ts`
 * pins that the resolver stays object-aware — a field name shared across two
 * objects must resolve to the object that declares the reader, not to both —
 * and re-derives #1182's own verdicts from this scan. A gate on the number
 * would have been cheaper and would have guarded the wrong thing.
 */

import stack from '../objectstack.config';
import { isMainModule } from './lib/main-module.mjs';

type AnyRec = Record<string, unknown>;

/** Where one field name was read, and what kind of surface read it. */
export type Site = {
  object: string;
  field: string;
  /** Top-level `objectstack.config.ts` key the site was found under. */
  root: string;
  /** Dotted path from that key, so a ledger row can be checked by hand. */
  path: string;
  bucket: Bucket;
};

export type Bucket = 'behaviour' | 'display' | 'carrier';
export type Verdict = 'live' | 'display-only' | 'inert';

/**
 * Stack roots whose contents carry a field without reading it.
 *
 * `translations` is the reason the previous scan excluded it too: a locale row
 * is a label for a field, not a consumer of one. `data` seeds VALUES — every
 * one of #1182's removed fields was seeded, `is_taxable` on all 13 catalog
 * products — and a seeded value that nothing reads is precisely the shape being
 * hunted. `mappings` offers an import column, which is a customer-facing
 * surface a removal must clean, not evidence of a reader.
 */
const CARRIER_ROOTS = new Set(['translations', 'data', 'mappings']);

/**
 * Leaf keys whose value is prose for a human, not a reference.
 *
 * A field name occurring inside a sentence is not a read. Bucketed as `carrier`
 * rather than dropped, so `--sites` still shows the sentence: prose that names a
 * field is exactly what has to be rewritten when the field goes.
 */
const PROSE_KEYS = new Set([
  'label', 'pluralLabel', 'description', 'message', 'successMessage', 'errorMessage',
  'title', 'placeholder', 'helpText', 'emptyText', 'tooltip', 'subtitle',
]);

/**
 * Path segments that make a site presentational.
 *
 * `views` and `pages` are display by default and earn `behaviour` back through
 * BEHAVIOUR_SEGMENTS below — a column draws a field, a filter decides which rows
 * exist at all, and #1182 turned on exactly that distinction.
 */
const DISPLAY_ROOTS = new Set(['views', 'pages', 'apps']);
const DISPLAY_SEGMENTS = ['highlightFields', 'searchableFields', 'indexes'];

/** Inside a display root, these segments still change behaviour. */
const BEHAVIOUR_SEGMENTS = [
  'filter', 'filters', 'runtimeFilter', 'where', 'sort', 'grouping', 'groupBy',
  'groupField', 'startField', 'endField', 'dateField', 'coverField', 'titleField',
  'colorField', 'latitudeField', 'longitudeField', 'addressField', 'kanban',
  'calendar', 'gantt', 'timeline', 'map', 'rowTint', 'conditionalFormatting',
];

/** Keys whose object VALUE is a predicate map — `{ is_active: true }`. */
const PREDICATE_KEYS = new Set([
  'filter', 'filters', 'runtimeFilter', 'where', 'criteria', 'defaultFilter', 'conditions',
]);

/**
 * Keys whose object VALUE spells fields as keys it WRITES — a flow's
 * `fields: { added_date: '{NOW()}' }`.
 *
 * Recorded as `carrier`, not as a read, and that is the whole point of naming
 * them separately: a value that automation stamps and nothing ever reads is
 * exactly the shape #1182 removed nine fields for (`is_taxable` was seeded on
 * all 13 catalog products). Recording it keeps `--sites` honest — an adjudicator
 * needs to see that a flow writes the field before deciding to delete it — while
 * keeping the verdict on whether anything READS it.
 */
const WRITE_KEYS = new Set(['fields', 'values', 'set', 'record', 'data', 'input']);

/**
 * Keys whose value is a literal from some other vocabulary, never a field name.
 *
 * Without this list the scan reads `type: 'summary'` on a roll-up field as a
 * reference to `crm_case.summary`, and `accept: ['image/png']` as a reference to
 * `crm_account.image`. Both are accidents of two vocabularies sharing a word,
 * which is the same class of mistake this whole script exists to stop making —
 * one level down, on field TYPES instead of object names. Skipping them cut the
 * unplaceable-token count from 4,374 to a set small enough to read.
 */
const LITERAL_KEYS = new Set([
  'type', 'reference', 'reference_to', 'accept', 'provider', 'dialect', 'operator',
  'aggregate', 'mode', 'severity', 'language', 'surface', 'format', 'icon', 'variant',
  'colorVariant', 'align', 'order', 'defaultValue', 'value', 'sourceFormat', 'transform',
  'name', 'id', 'events', 'locations', 'version', 'width', 'cardSize', 'coverFit',
  'env', 'pinned', 'summary', 'chartType', 'dateGranularity',
]);

/**
 * The shapes a field name takes when it is actually being REFERENCED.
 *
 * A bare word inside a sentence is not a read; `record.tax_rate`,
 * `fields: ['list_price']`, `{product_code}` and `input.unit_price` are. Applied
 * to every blob alongside the whole-string rule below, so short declarative
 * values (`field: 'annual_revenue'`) and code bodies are read by one rule set.
 */
const REFERENCE_SHAPES = [
  /\.([A-Za-z_][A-Za-z0-9_]*)\b/g, //            record.x · input.x · l.x
  /['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g, //      'x' · "x" · `x`
  /\{([A-Za-z_][A-Za-z0-9_]*)\}/g, //            {x} in a template string
  /\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g, //          { x: … } object-literal key
];

const S = stack as unknown as AnyRec;
const OBJECTS = (S.objects ?? []) as AnyRec[];

/** Declared field names, per object. Read from the stack, never hand-listed. */
export const fieldsByObject = new Map<string, Set<string>>(
  OBJECTS.map((o) => [String(o.name), new Set(Object.keys((o.fields ?? {}) as AnyRec))]),
);

/** Field name → every object declaring it. The masking analysis reads this. */
export const objectsByField = ((): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const [object, fields] of fieldsByObject) {
    for (const field of fields) out.set(field, [...(out.get(field) ?? []), object]);
  }
  return out;
})();

/** Dataset name → the object it reads, so a report/widget inherits a context. */
const datasetObject = new Map<string, string>(
  ((S.datasets ?? []) as AnyRec[]).map((d) => [String(d.name), String(d.object)]),
);

/** Every `crm_*` token in a blob, with the index its mention ENDS at. */
const mentionsIn = (text: string): { end: number; object: string }[] => {
  const out: { end: number; object: string }[] = [];
  for (const m of text.matchAll(/\bcrm_[a-z0-9_]+\b/g)) {
    if (fieldsByObject.has(m[0])) out.push({ end: (m.index ?? 0) + m[0].length, object: m[0] });
  }
  return out;
};

const sites: Site[] = [];
/** Tokens that looked like a field but resolved to no object. Never dropped. */
export const unresolved: { token: string; root: string; path: string }[] = [];

/** Every declared field name anywhere — the vocabulary the text scan matches. */
const ALL_FIELD_NAMES = new Set(objectsByField.keys());

const bucketFor = (root: string, path: string, leafKey: string): Bucket => {
  if (CARRIER_ROOTS.has(root)) return 'carrier';
  if (PROSE_KEYS.has(leafKey)) return 'carrier';
  const segments = path.split('.');
  if (BEHAVIOUR_SEGMENTS.some((s) => segments.includes(s))) return 'behaviour';
  if (DISPLAY_ROOTS.has(root)) return 'display';
  if (DISPLAY_SEGMENTS.some((s) => segments.includes(s))) return 'display';
  return 'behaviour';
};

const record = (object: string, field: string, root: string, path: string, leafKey: string): void => {
  sites.push({ object, field, root, path, bucket: bucketFor(root, path, leafKey) });
};

/**
 * Scan one text blob (a string value, or a stringified handler) for field names.
 *
 * The nearest preceding `crm_*` mention and the enclosing declaration's object
 * are both candidates; a token is credited to each candidate that DECLARES it.
 * See the header for why both rather than one.
 */
const scanText = (text: string, ctx: string | undefined, root: string, path: string, leafKey: string): void => {
  if (text.length === 0 || text.length > 200_000) return;
  if (LITERAL_KEYS.has(leafKey)) return;
  const mentions = mentionsIn(text);
  /** Every reference-shaped occurrence: the captured token and where it began. */
  const hits: { token: string; at: number }[] = [];
  const trimmed = text.trim();
  if (ALL_FIELD_NAMES.has(trimmed)) hits.push({ token: trimmed, at: 0 });
  for (const shape of REFERENCE_SHAPES) {
    for (const m of text.matchAll(shape)) {
      hits.push({ token: m[1], at: (m.index ?? 0) + m[0].indexOf(m[1]) });
    }
  }
  for (const m of hits) {
    const token = m.token;
    if (!ALL_FIELD_NAMES.has(token)) continue;
    const at = m.at;
    let nearest: string | undefined;
    for (const mention of mentions) {
      if (mention.end <= at) nearest = mention.object;
      else break;
    }
    const candidates = [...new Set([nearest, ctx])].filter((c): c is string => c !== undefined);
    const credited = candidates.filter((c) => fieldsByObject.get(c)?.has(token));
    if (credited.length === 0) {
      unresolved.push({ token, root, path });
      continue;
    }
    for (const object of credited) record(object, token, root, path, leafKey);
  }
};

/** The object context a node establishes for its own subtree, if any. */
const contextOf = (node: AnyRec, ctx: string | undefined): string | undefined => {
  const named = (v: unknown): string | undefined =>
    typeof v === 'string' && fieldsByObject.has(v) ? v : undefined;
  const nested = (v: unknown, key: string): string | undefined =>
    v && typeof v === 'object' ? named((v as AnyRec)[key]) : undefined;
  return (
    named(node.object) ??
    named(node.objectName) ??
    named(node.targetObject) ??
    nested(node.data, 'object') ??
    nested(node.config, 'objectName') ??
    nested(node.config, 'object') ??
    // A `views` element is `{ list, form, listViews }` with the object named
    // only inside `list.data` — without this hoist the FORM section's fields
    // would resolve to nothing, which is the same silent drop being fixed.
    (node.list && typeof node.list === 'object'
      ? nested((node.list as AnyRec).data, 'object')
      : undefined) ??
    named(node.name) ??
    (typeof node.dataset === 'string' ? datasetObject.get(node.dataset) : undefined) ??
    // A flow names its object on the TRIGGER node, and its later nodes read
    // `{record.x}` with no object of their own — `billing-handoff`'s http body
    // reads eleven contract fields that way. Without this hoist those eleven
    // resolve to nothing and eleven live fields read as inert, which is the
    // loud direction of the same mistake rather than the silent one, but still
    // wrong. Per-node `objectName` still wins inside its own subtree.
    (Array.isArray(node.nodes)
      ? (node.nodes as AnyRec[])
          .map((n) => nested(n.config, 'objectName') ?? nested(n.config, 'object'))
          .find((o) => o !== undefined)
      : undefined) ??
    ctx
  );
};

const walk = (node: unknown, ctx: string | undefined, root: string, path: string, leafKey: string): void => {
  if (node === null || node === undefined) return;
  if (typeof node === 'function') {
    scanText(Function.prototype.toString.call(node), ctx, root, path, leafKey);
    return;
  }
  if (typeof node === 'string') {
    scanText(node, ctx, root, path, leafKey);
    return;
  }
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, ctx, root, `${path}[${i}]`, leafKey));
    return;
  }
  const rec = node as AnyRec;
  const inner = contextOf(rec, ctx);
  const isFieldDeclarationMap = root === 'objects' && /^\[\d+\]\.fields$/.test(path);
  for (const [key, value] of Object.entries(rec)) {
    const childPath = `${path}.${key}`;
    // A predicate map spells the field as its KEY: `{ is_active: true }`.
    // Nowhere else are keys treated as references — `type`, `name` and `label`
    // are ubiquitous schema keys AND plausible field names, and crediting them
    // wholesale would hand out exactly the immunity this scan removes.
    const keyIsReference =
      !isFieldDeclarationMap &&
      ALL_FIELD_NAMES.has(key) &&
      (PREDICATE_KEYS.has(leafKey) || WRITE_KEYS.has(leafKey));
    if (keyIsReference) {
      const owner = inner && fieldsByObject.get(inner)?.has(key) ? inner : undefined;
      if (!owner) unresolved.push({ token: key, root, path });
      else if (WRITE_KEYS.has(leafKey)) sites.push({ object: owner, field: key, root, path, bucket: 'carrier' });
      else record(owner, key, root, path, leafKey);
    }
    // A map KEYED by object name — `translations[].en.objects.crm_campaign`,
    // `permissions[].objects.crm_lead` — names its object in a position no
    // `object:` lookup reaches. Without this the locale rows for every field
    // resolve to nothing, and the ledger cannot show an adjudicator the four
    // bundles a removal has to clean.
    walk(value, fieldsByObject.has(key) ? key : inner, root, childPath, key);
  }
};

for (const [key, value] of Object.entries(S)) {
  if (key === 'manifest' || key === 'i18n' || key === 'requires') continue;
  walk(value, undefined, key, '', key);
}

// ─────────────────────────────────────────────────────────── the ledger ──

export type Row = {
  object: string;
  field: string;
  verdict: Verdict;
  behaviour: number;
  display: number;
  carrier: number;
  /** Other objects declaring the same field name — the masking set. */
  sharedWith: string[];
};

const byField = new Map<string, Site[]>();
for (const s of sites) byField.set(`${s.object}.${s.field}`, [...(byField.get(`${s.object}.${s.field}`) ?? []), s]);

export const rows: Row[] = [...fieldsByObject].flatMap(([object, fields]) =>
  [...fields].map((field) => {
    const found = byField.get(`${object}.${field}`) ?? [];
    const count = (b: Bucket): number => found.filter((s) => s.bucket === b).length;
    const behaviour = count('behaviour');
    const display = count('display');
    return {
      object,
      field,
      verdict: (behaviour > 0 ? 'live' : display > 0 ? 'display-only' : 'inert') as Verdict,
      behaviour,
      display,
      carrier: count('carrier'),
      sharedWith: (objectsByField.get(field) ?? []).filter((o) => o !== object),
    };
  }),
);

export const sitesOf = (object: string, field: string): Site[] => byField.get(`${object}.${field}`) ?? [];

/**
 * Why `--sites` validates its argument, and why no other path needs to (#1255).
 *
 * `--json` and the default ledger both ENUMERATE `fieldsByObject`, so neither
 * can name a field that does not exist. `--sites` is the only path that takes a
 * field name from **argv**, and it used to hand whatever it was given straight
 * to `sitesOf`, which answers `[]` for a misspelling exactly as it does for a
 * field nothing reads. Both then printed the same sentence and exited 0.
 *
 * That sentence — `(none — this field is inert)` — is the one quoted into an
 * enforce-or-remove decision; #1198 and #1199 are both adjudications driven by
 * this reading. A typo producing it verbatim with a green exit is silent AND
 * self-confirming: re-running the same misspelled command re-derives the same
 * confident answer, forever. A tool that answers questions about fields that do
 * not exist manufactures evidence, so an unresolvable name is now a refusal.
 *
 * Measured while fixing this: **no declared field currently has zero sites** —
 * every one has at least a locale row — so on today's stack the inert sentence
 * was reachable ONLY through a name that does not exist. The zero-site branch
 * is kept regardless (a field can lose its last carrier, and then the sentence
 * is the true answer); what changed is that a typo no longer reaches it.
 *
 * This is a lookup, not new machinery: `fieldsByObject` already holds the
 * declared set the ledger itself is built from, and `objectsByField` already
 * answers "this field exists — on which object?". Near-misses are named from
 * those two maps and nothing else; there is deliberately **no fuzzy matching**,
 * so the correction offered is always a fact rather than a guess.
 *
 * @returns the refusal lines, or `null` when `target` names a declared field.
 */
export const refuseSitesTarget = (target: string): string[] | null => {
  const objectList = `  registered objects: ${[...fieldsByObject.keys()].sort().join(', ')}`;
  const dot = target.lastIndexOf('.');
  if (dot <= 0 || dot === target.length - 1) {
    return [
      target.length === 0
        ? '✗ --sites needs an <object>.<field> argument; none was given.'
        : `✗ --sites needs <object>.<field>, not '${target}'.`,
      objectList,
    ];
  }
  const [object, field] = [target.slice(0, dot), target.slice(dot + 1)];
  /** Pure lookup: the objects that really do declare this name, if any. */
  const elsewhere = objectsByField.get(field) ?? [];
  const alsoOn =
    elsewhere.length > 0
      ? `  '${field}' is declared on ${elsewhere.join(', ')}.`
      : `  no registered object declares a field named '${field}'.`;
  const declared = fieldsByObject.get(object);
  if (declared === undefined) {
    return [`✗ no object named '${object}' is registered in this stack.`, alsoOn, objectList];
  }
  if (!declared.has(field)) {
    return [
      `✗ '${object}' declares no field named '${field}'.`,
      alsoOn,
      `  'pnpm scan:fields --json' lists every declared field with its verdict.`,
    ];
  }
  return null;
};

// ───────────────────────────────────────────────────────────── reporting ──

const argv = process.argv.slice(2);
const has = (flag: string): boolean => argv.includes(flag);

const inert = rows.filter((r) => r.verdict === 'inert');
const displayOnly = rows.filter((r) => r.verdict === 'display-only');
/**
 * The card's headline set: inert AND sharing its name with another object's
 * field, so the old token grep read it as consumed and it could never have
 * reached a sweep. `crm_product.tax_rate` is the row that produced #1193.
 */
const masked = inert.filter((r) => r.sharedWith.length > 0);

const main = (): void => {
  if (has('--json')) {
    console.log(JSON.stringify({ rows, unresolved: unresolved.length }, null, 2));
    return;
  }

  const sitesFlag = argv.indexOf('--sites');
  if (sitesFlag !== -1) {
    const target = argv[sitesFlag + 1] ?? '';
    // Refuse before reporting: `sitesOf` cannot tell a misspelling from a field
    // nothing reads, so the check has to happen here. See `refuseSitesTarget`.
    const refusal = refuseSitesTarget(target);
    if (refusal !== null) {
      for (const line of refusal) console.error(line);
      process.exitCode = 1;
      return;
    }
    const dot = target.lastIndexOf('.');
    const [object, field] = [target.slice(0, dot), target.slice(dot + 1)];
    const found = sitesOf(object, field);
    console.log(`${target} — ${found.length} site(s)\n`);
    for (const s of found) console.log(`  ${s.bucket.padEnd(9)} ${s.root}${s.path}`);
    if (found.length === 0) console.log('  (none — this field is inert)');
    return;
  }

  console.log(
    `Field consumer ledger — ${rows.length} declared fields across ${fieldsByObject.size} objects\n` +
      '  resolved against the registered stack, per OBJECT rather than per file\n',
  );
  console.log(
    `  live ${rows.filter((r) => r.verdict === 'live').length}` +
      ` · display-only ${displayOnly.length}` +
      ` · inert ${inert.length}` +
      ` · unresolved tokens ${unresolved.length}\n`,
  );

  const table = (label: string, list: Row[]): void => {
    if (list.length === 0) {
      console.log(`  ${label}: none\n`);
      return;
    }
    console.log(`  ${label} (${list.length}):`);
    for (const r of [...list].sort((a, b) => `${a.object}.${a.field}`.localeCompare(`${b.object}.${b.field}`))) {
      const shared = r.sharedWith.length ? `  ← name also on ${r.sharedWith.join(', ')}` : '';
      console.log(`    ${`${r.object}.${r.field}`.padEnd(46)}${shared}`);
    }
    console.log('');
  };

  table('INERT — read by nothing, drawn nowhere', inert);
  table('MASKED — inert, and invisible to a name-only grep', masked);
  if (has('--all')) {
    table('DISPLAY-ONLY — drawn, but nothing reads it', displayOnly);
  } else {
    console.log(`  display-only: ${displayOnly.length} (re-run with --all to list them)\n`);
  }

  // A scan that finds nothing to place has stopped working; say so rather than
  // printing a confident empty ledger.
  if (sites.length === 0) {
    console.error('✗ no field reference resolved anywhere — the stack shape moved; fix this scan.');
    process.exitCode = 1;
    return;
  }
  console.log(
    '  This is a ledger, not a gate: each inert row is a separate enforce-or-remove\n' +
      '  decision (maintainer ruling 2026-08-17, 「逐个 enforce-or-remove（推荐）」),\n' +
      '  and removing a published field is the maintainer’s call, not the sweep’s.\n',
  );
};

// Run only when invoked directly; `rows`, `sitesOf` and friends stay importable
// for `test/field-consumer-scan.test.ts`, so importing must not run the scan.
//
// The comparison lives in `scripts/lib/main-module.mjs` and is never hand-rolled
// here: this line used to read `process.argv[1].includes('scan-field-consumers')`,
// which survives symlinks by accident but silently stops matching the day this
// file is renamed — `pnpm scan:fields` would then print nothing and exit 0,
// which is indistinguishable from a clean ledger (#1252).
if (isMainModule(import.meta.url)) main();
