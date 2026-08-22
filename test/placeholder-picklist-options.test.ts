// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { type AnyRec, objects, localePacks } from './helpers/metadata-fixtures';

/**
 * Placeholder picklists never ship as production metadata (#1061).
 *
 * `crm_opportunity.competitors` was a `multiple` select whose entire option set
 * was `Competitor A` / `Competitor B` / `Competitor C` — invented names, shipped
 * in the reference app and translated into all four locale packs (`競合 A`,
 * `Competidor A`, `竞争对手 A`). Nothing consumed it: no list column, filter,
 * detail-page section, dashboard, report, dataset, flow, hook or AI skill read
 * the value, and no seed row ever set one, so the only thing the field did was
 * teach every reader — human or model — that inventing option values is how you
 * author a picklist here. #1061 retired the field rather than re-spelling it.
 *
 * Two assertions, deliberately at different altitudes:
 *
 *  1. The FAMILY rule — no option label anywhere is placeholder-shaped, i.e.
 *     ends in a bare Latin capital used as a serial marker (`… A`, `…B`). This
 *     is what catches the next `Vendor A / Vendor B` before it is translated
 *     four times, and it reads the locale packs too, because a placeholder that
 *     survives only in translation is still shipped text.
 *  2. The SPECIFIC pin — `competitors` is gone from the object and from every
 *     pack. The family rule alone would go green again the moment someone
 *     re-added the field with honest-looking names, which is the outcome the
 *     ruling on #1061 rejected: the field needs a display surface and a real
 *     source of names, not better placeholders.
 *
 * Reverse-verified: restoring the field definition + its four pack entries on
 * top of this file turns BOTH assertions red (family: 12 labels across 4 packs
 * plus the 3 English option labels; pin: the field resolves again). Restoring
 * only the object definition turns the pin red on the object arm alone — the
 * arms fail independently, which is why they are separate expectations.
 */

type Hit = { where: string; label: string };

/**
 * A label ending in a serial-marker capital: `Competitor A`, `競合 A`, `竞争对手C`.
 *
 * The capital must follow a non-letter (space, CJK character, start of string).
 * That boundary is deliberate and is what keeps the rule usable: dropping it to
 * also catch a run-together `VendorB` would fail every acronym-tailed label
 * (`IBM`, `SMB`) the moment one is authored. A run-together placeholder is out
 * of reach here — the four locale packs all space their option labels, so the
 * shape this rule exists to stop is the shape it matches.
 */
const PLACEHOLDER_SERIAL = /(?:^|[^A-Za-z])([A-Z])\s*$/;

const optionLabelsFromObjects = (): Hit[] => {
  const out: Hit[] = [];
  for (const obj of objects) {
    for (const [fieldName, def] of Object.entries((obj.fields ?? {}) as Record<string, AnyRec>)) {
      const options = def?.options;
      if (!Array.isArray(options)) continue;
      for (const opt of options as AnyRec[]) {
        if (typeof opt?.label === 'string') {
          out.push({ where: `${obj.name}.${fieldName}`, label: opt.label });
        }
      }
    }
  }
  return out;
};

const optionLabelsFromPacks = (): Hit[] => {
  const out: Hit[] = [];
  for (const [locale, pack] of localePacks) {
    for (const [objectName, objEntry] of Object.entries((pack.objects ?? {}) as Record<string, AnyRec>)) {
      for (const [fieldName, fieldEntry] of Object.entries(
        (objEntry?.fields ?? {}) as Record<string, AnyRec>,
      )) {
        for (const [value, label] of Object.entries((fieldEntry?.options ?? {}) as Record<string, unknown>)) {
          if (typeof label === 'string') {
            out.push({ where: `${locale}: ${objectName}.${fieldName}.${value}`, label });
          }
        }
      }
    }
  }
  return out;
};

describe('no picklist ships placeholder option labels (#1061)', () => {
  it('the scan reaches both option surfaces', () => {
    // Guard the guard: either walker returning nothing would make the rule below
    // pass while reading no labels at all — the failure mode that let
    // `Competitor A/B/C` sit in production metadata unnoticed in the first place.
    expect(optionLabelsFromObjects().length, 'no option labels read off the objects').toBeGreaterThan(80);
    expect(optionLabelsFromPacks().length, 'no option labels read off the locale packs').toBeGreaterThan(200);
  });

  it('no option label is a serial placeholder ("Competitor A")', () => {
    const bad = [...optionLabelsFromObjects(), ...optionLabelsFromPacks()].filter((h) =>
      PLACEHOLDER_SERIAL.test(h.label),
    );
    expect(
      bad.map((h) => `${h.where} = "${h.label}"`),
      'placeholder-shaped option labels — name the real thing or retire the field',
    ).toEqual([]);
  });

  it('the serial detector can actually fail', () => {
    // Without this, a regex that stopped matching would report a clean sweep.
    for (const label of ['Competitor A', 'Competidor B', '競合 A', '竞争对手C', 'Vendor B ']) {
      expect(PLACEHOLDER_SERIAL.test(label), `${label} should read as a placeholder`).toBe(true);
    }
    // `IBM` pins the boundary documented on the regex: an acronym tail is not a
    // serial marker, and a rule that read it as one would be unusable.
    for (const label of ['Closed Won', 'Lost to Competitor', '输给竞争对手', 'Email Campaign', 'IBM']) {
      expect(PLACEHOLDER_SERIAL.test(label), `${label} should NOT read as a placeholder`).toBe(false);
    }
  });
});

describe('the retired competitors field stays retired (#1061)', () => {
  const opportunity = objects.find((o) => o.name === 'crm_opportunity');

  it('reads a real crm_opportunity definition', () => {
    expect(opportunity, 'crm_opportunity is not in the stack — this pin asserts nothing').toBeTruthy();
    expect(Object.keys(opportunity?.fields ?? {}).length).toBeGreaterThan(20);
  });

  it('crm_opportunity declares no competitors field', () => {
    expect(Object.keys(opportunity?.fields ?? {})).not.toContain('competitors');
  });

  it('no locale pack carries a competitors entry', () => {
    const stale = localePacks
      .filter(([, pack]) => pack.objects?.crm_opportunity?.fields?.competitors !== undefined)
      .map(([locale]) => locale);
    expect(stale, 'locale packs still translating a field that no longer exists').toEqual([]);
  });
});
