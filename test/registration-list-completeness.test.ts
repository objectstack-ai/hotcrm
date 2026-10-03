// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import {
  allHooks,
  allSkills,
  CrmSharingRules,
  CrmSeedData,
  CrmPositions,
} from '../objectstack.composition';
import stack from '../objectstack.config';
import {
  barrelPath,
  barrelExports,
  packagesOnDisk,
  registrableEntries,
  strangers,
  misfiledExemptions,
  staleExemptions,
  unregistered,
  offBarrel,
  type RegistrationSpec,
} from './helpers/registration-lists';

import * as salesHooks from '../src/sales/objects/hooks';
import * as serviceHooks from '../src/service/objects/hooks';
import * as revenueHooks from '../src/revenue/objects/hooks';
import * as marketingHooks from '../src/marketing/objects/hooks';

import * as salesSkills from '../src/sales/skills';
import * as serviceSkills from '../src/service/skills';

import * as salesSharing from '../src/sales/sharing';
import * as serviceSharing from '../src/service/sharing';
import * as marketingSharing from '../src/marketing/sharing';

import * as salesData from '../src/sales/data';
import * as serviceData from '../src/service/data';
import * as revenueData from '../src/revenue/data';
import * as marketingData from '../src/marketing/data';

/**
 * Registration completeness for the four remaining hand-maintained lists
 * (#1938): `allHooks`, `allSkills`, `CrmSharingRules` and `CrmSeedData`.
 *
 * `objectstack.composition.ts` carries five explicit ordered arrays. A symbol
 * exported from its package barrel but never written into the matching array
 * is handed to `defineStack()` by NOBODY — it is registered by nothing, and
 * `pnpm validate` stays at exit 0 and names it nowhere. #1930 / PR #1936
 * measured the surface and guarded one of the five; `allFlows` keeps its own
 * file, `flow-registration-completeness.test.ts`, which landed first. This one
 * covers the other four, because their criteria are NOT the same rule four
 * times over and that difference is the whole card:
 *
 *  - `allHooks` and `CrmSharingRules` FLATTEN. One export may carry several
 *    entries (`taskHook` is four hooks; `TerritorySharingRules` is two rules),
 *    so the unit that owes a registration is the element, not the export.
 *  - `allSkills` is the shape `allFlows` has: one export, one entry.
 *  - `CrmSharingRules` needs an EXEMPTION. The sales sharing barrel exports
 *    nine names against eight rules, and the difference — `CrmPositions` — is
 *    not an unregistered rule at all. See the block at the bottom, which
 *    measures where it does go instead of taking the exemption on trust.
 *  - `CrmSeedData` needed a ruling before it could be guarded at all: its
 *    barrels export seed helpers, the composition knob and a price table
 *    beside the seed families, so "every export owes a registration" is simply
 *    false for it. The rule below is "every export that IS a seed", with every
 *    non-seed export named and reasoned in `exemptions`.
 *
 * Both directions are asserted for each, because the two failure modes are
 * opposite: an entry the barrel exports and the list drops (registered by
 * nothing), and an entry the list carries straight from its source file
 * without the barrel (registered, but invisible to every suite that reads the
 * barrels, `test/helpers/src-roster.ts` among them).
 *
 * MEASURED before the rules were written, on d9c2ef2 — the reading that
 * decided each spec below, and #1930's numbers re-measured on this tree:
 *
 *   allHooks         19 barrel exports, 39 hooks after flattening, 39 registered
 *   allSkills         6 barrel exports,  6 skills,                  6 registered
 *   CrmSharingRules   9 barrel exports, 10 rules after flattening, 10 registered
 *                     (the ninth export is CrmPositions: 12 positions, 0 rules)
 *   CrmSeedData      29 barrel exports, 19 of them seeds,          19 registered
 *                     (the other 10 are seed helpers, the composition knob
 *                      and the opportunity line price table)
 *
 * So no list is missing anything today. That is the finding, not a reason to
 * skip the guard: all four were complete on the day `allFlows` was complete
 * too, and nothing was holding any of them there.
 */

type Spec = RegistrationSpec & {
  /** Plural noun for prose: `hooks`, `seed families`. */
  readonly nouns: string;
  /** What silence costs when an entry never reaches the list. */
  readonly consequence: string;
};

const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const named = (value: unknown): string => String(record(value)?.name ?? '<unnamed>');

/**
 * The four classifiers, each keyed on the fields its own registration is
 * useless without, so a value that has stopped being one is rejected rather
 * than half-recognised. Measured shapes on d9c2ef2:
 *
 *   hook          name, object, events[], priority, description, handler()
 *   skill         name, label, description, surface, instructions, tools[], active
 *   sharing rule  name, label, object, type, condition, accessLevel, sharedWith
 *   seed          object, externalId, mode, env[], records[]   (no `name`)
 *   position      name, label                                   (and nothing else)
 */
const isHook = (value: unknown): boolean => {
  const entry = record(value);
  return (
    !!entry &&
    typeof entry.name === 'string' &&
    typeof entry.object === 'string' &&
    Array.isArray(entry.events) &&
    typeof entry.handler === 'function'
  );
};

const isSkill = (value: unknown): boolean => {
  const entry = record(value);
  return (
    !!entry &&
    typeof entry.name === 'string' &&
    typeof entry.surface === 'string' &&
    typeof entry.instructions === 'string'
  );
};

const isSharingRule = (value: unknown): boolean => {
  const entry = record(value);
  return (
    !!entry &&
    typeof entry.name === 'string' &&
    typeof entry.object === 'string' &&
    typeof entry.accessLevel === 'string'
  );
};

const isSeed = (value: unknown): boolean => {
  const entry = record(value);
  return !!entry && typeof entry.object === 'string' && Array.isArray(entry.records);
};

/** The reason every non-seed export of a data barrel owes no registration. */
const SEED_EXEMPTIONS: Record<string, string> = {
  COMPOSITION_ENV_VAR: 'the environment variable name resolveComposition() reads — a string.',
  HOTCRM_COMPOSITIONS: 'the accepted composition values, exported for diagnostics and tests.',
  resolveComposition:
    'the resolver objectstack.config.ts calls to choose WHICH seed list is registered. It selects seeds; it is not one.',
  OPPORTUNITY_LINES:
    'the line table sales.seed.ts prices its deals from. The rows it feeds are crm_opportunity_line_item, seeded by the revenue package from this table along the revenue -> sales edge.',
  celDaysAgo: 'seed authoring helper — a CEL date expression builder shared by the family modules.',
  celDaysFromNow: 'seed authoring helper — a CEL date expression builder shared by the family modules.',
  lineTotal: 'seed authoring helper — arithmetic over one line spec.',
  linesTotal: 'seed authoring helper — arithmetic over a list of line specs.',
  catalogPrice: 'seed authoring helper — a price lookup over the catalogue rows.',
  lineItemRecords: 'seed authoring helper — a row builder used by the revenue seed families.',
};

const SPECS: Spec[] = [
  {
    noun: 'hook',
    nouns: 'hooks',
    listName: 'allHooks',
    kind: 'objects',
    barrelFile: 'hooks.ts',
    barrels: {
      sales: salesHooks,
      service: serviceHooks,
      revenue: revenueHooks,
      marketing: marketingHooks,
    },
    list: allHooks,
    isEntry: isHook,
    grouped: true,
    exemptions: {},
    label: named,
    consequence:
      'the hook never attaches to its object, so nothing derives the fields it owns and nothing enforces the writes it refuses',
  },
  {
    noun: 'skill',
    nouns: 'skills',
    listName: 'allSkills',
    kind: 'skills',
    barrelFile: 'index.ts',
    barrels: { sales: salesSkills, service: serviceSkills },
    list: allSkills,
    isEntry: isSkill,
    grouped: false,
    exemptions: {},
    label: named,
    consequence:
      'the skill reaches no agent surface — the app is AI-native through skills only, so an unregistered one is an AI capability that exists as a file and nowhere else',
  },
  {
    noun: 'sharing rule',
    nouns: 'sharing rules',
    listName: 'CrmSharingRules',
    kind: 'sharing',
    barrelFile: 'index.ts',
    barrels: { sales: salesSharing, service: serviceSharing, marketing: marketingSharing },
    list: CrmSharingRules,
    isEntry: isSharingRule,
    grouped: true,
    exemptions: {
      CrmPositions:
        'positions metadata, not a sharing rule: the twelve CRM positions objectstack.config.ts registers under the stack key `positions`. The block at the bottom of this file measures that, so the exemption is not taken on trust.',
    },
    label: named,
    consequence:
      'the rule never installs, and under a private sharing model the records it was written to open stay invisible to the very people it names',
  },
  {
    noun: 'seed family',
    nouns: 'seed families',
    listName: 'CrmSeedData',
    kind: 'data',
    barrelFile: 'index.ts',
    barrels: {
      sales: salesData,
      service: serviceData,
      revenue: revenueData,
      marketing: marketingData,
    },
    list: CrmSeedData,
    isEntry: isSeed,
    grouped: false,
    exemptions: SEED_EXEMPTIONS,
    label: (value) => String(record(value)?.object ?? '<unknown object>'),
    consequence:
      'the family never replays — the org comes up without those rows, and every later family that resolves a lookup against them by natural key seeds broken',
  },
];

for (const spec of SPECS) {
  describe(`${spec.listName} registration completeness`, () => {
    /**
     * Anti-phantom. Every rule below is "this set has no gaps", which an empty
     * set satisfies: a barrel that stopped resolving, a classifier the upstream
     * shape outgrew, or a fifth package whose barrel nobody added here would
     * all leave the rules passing over nothing.
     */
    it(`reads every package that carries a ${spec.kind}/${spec.barrelFile} barrel, and each carries ${spec.nouns}`, () => {
      const onDisk = packagesOnDisk(spec);
      expect(
        onDisk.length,
        `no package under src/ carries a ${spec.kind}/${spec.barrelFile} barrel — the tree moved`,
      ).toBeGreaterThan(0);
      expect(
        onDisk,
        `a package carries a ${spec.kind}/${spec.barrelFile} barrel but this guard does not read ` +
          `it — add it to the barrels of the ${spec.listName} spec`,
      ).toEqual(Object.keys(spec.barrels).sort());

      for (const pkg of Object.keys(spec.barrels)) {
        expect(
          barrelExports({ ...spec, barrels: { [pkg]: spec.barrels[pkg]! } }).length,
          `${barrelPath(spec, pkg)} exports nothing — the barrel stopped resolving`,
        ).toBeGreaterThan(0);
        expect(
          registrableEntries({ ...spec, barrels: { [pkg]: spec.barrels[pkg]! } }).length,
          `${barrelPath(spec, pkg)} exports no ${spec.noun} this guard recognises — either the ` +
            `barrel stopped resolving, or the shape of a ${spec.noun} changed and the classifier ` +
            'in this file did not',
        ).toBeGreaterThan(0);
      }

      expect(
        spec.list.length,
        `${spec.listName} is empty — objectstack.composition.ts did not load`,
      ).toBeGreaterThan(0);
    });

    it(`every export of a ${spec.kind} barrel is a ${spec.noun}, or an exemption with a reason`, () => {
      const unclassified = strangers(spec);
      expect(
        unclassified,
        `exported from a ${spec.kind} barrel but not recognised as a ${spec.noun}, and not ` +
          `exempted:\n  ${unclassified.join('\n  ')}\n` +
          `Either it IS a ${spec.noun} and must be registered in ${spec.listName}, or it is not ` +
          'and belongs in this spec\'s exemptions with the reason written down.',
      ).toEqual([]);

      const misfiled = misfiledExemptions(spec);
      expect(
        misfiled,
        `exempted from ${spec.listName}, but it IS a ${spec.noun} — an exemption cannot excuse a ` +
          `real registration:\n  ${misfiled.join('\n  ')}`,
      ).toEqual([]);

      const stale = staleExemptions(spec);
      expect(
        stale,
        `the ${spec.listName} exemptions name exports no barrel has any more — delete them, an ` +
          `exemption nobody needs silently excuses the next export that takes the name:\n  ${stale.join('\n  ')}`,
      ).toEqual([]);
    });

    it(`every ${spec.noun} a package barrel exports is registered in ${spec.listName}`, () => {
      const missing = unregistered(spec);
      expect(
        missing,
        `exported from a package barrel but missing from \`${spec.listName}\` — registered by ` +
          `NOTHING, and pnpm validate stays at exit 0 while ${spec.consequence}:\n  ` +
          `${missing.join('\n  ')}\n` +
          `Import each one in objectstack.composition.ts and add it to the ${spec.listName} array.`,
      ).toEqual([]);
    });

    it(`every ${spec.noun} registered in ${spec.listName} comes from a package barrel`, () => {
      const orphans = offBarrel(spec);
      expect(
        orphans,
        `registered in \`${spec.listName}\` but re-exported by no package barrel — the app runs ` +
          'it, and every suite that reads the barrels (test/helpers/src-roster.ts) is blind to ' +
          `it:\n  ${orphans.join('\n  ')}\n` +
          `Re-export each one from its package's ${spec.kind} barrel.`,
      ).toEqual([]);
    });
  });
}

/**
 * The one exemption above that excuses a real, populated export — measured
 * rather than asserted.
 *
 * `CrmPositions` is the reason the sales sharing barrel exports nine names
 * against eight rules, and it is the reason #1930 left this collection alone.
 * The claim "it is registered somewhere else" is exactly the kind of claim a
 * comment cannot carry: it goes stale the day someone drops the `positions`
 * key from the stack, and the sharing guard above would keep excusing the
 * export for a registration that no longer happens.
 *
 * `defineStack()` parses and returns a copy, so both halves are read by NAME
 * off the stack definition the app actually ships.
 */
describe('the CrmPositions exemption is a different registration, not a missing one', () => {
  const positionNames = CrmPositions.map((position) => String(position.name));

  it('every position the sharing barrel exports reaches the stack under `positions`', () => {
    expect(positionNames.length, 'CrmPositions is empty — the barrel stopped resolving').toBeGreaterThan(0);
    const registered = (stack.positions ?? []).map((position) => String(position.name));
    const missing = positionNames.filter((name) => !registered.includes(name));
    expect(
      missing,
      'exempted from CrmSharingRules because it is positions metadata, but the stack does not ' +
        `register it under \`positions\` either — then it is registered by nothing after all:\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('and reaches `sharingRules` as nothing at all', () => {
    const rules = (stack.sharingRules ?? []).map((rule) => String(rule.name));
    const leaked = positionNames.filter((name) => rules.includes(name));
    expect(
      leaked,
      `a CRM position is registered as a sharing rule:\n  ${leaked.join('\n  ')}`,
    ).toEqual([]);
  });
});
