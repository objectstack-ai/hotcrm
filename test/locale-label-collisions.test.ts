// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { type AnyRec, localePacks, packFor, servedApp } from './helpers/composed-stack';
import { CrmApp } from '../src/sales/apps/crm.app';
import { Event } from '../src/sales/objects/event.object';
import { Forecast } from '../src/sales/objects/forecast.object';

/**
 * Two things a user reads side by side carry two labels, in every locale
 * (#2060 item 13, findings C-16 and the forecast fold).
 *
 * - **The Activity group and its items.** zh-CN labelled the group and its
 *   Events item both 活动, so the sidebar read 活动 › 活动. Every other pack
 *   names the group by the activity it gathers and the item by the object it
 *   opens: the item's label is the heading of `crm_event`'s list page, its
 *   plural label. The item keeps that, so the fix renamed the group.
 * - **The two period fields of the New Forecast form.** en, es-ES and ja-JP gave
 *   `period` (the Month / Quarter picklist) and `period_label` (the free-text
 *   name) one label, so the form showed "Period" twice, while the field itself
 *   declares "Period Label".
 *
 * Only these pairs are asserted. ⛔ This is not a rule that no two labels may
 * collide anywhere: that would be a lint, and lint is the platform's.
 */

type Locale = string;
const LOCALES: Locale[] = localePacks.map(([locale]) => locale);
const pack = (locale: Locale): AnyRec => packFor(locale) ?? {};

const APP = servedApp((CrmApp as AnyRec).name as string);
const ACTIVITY = ((APP.navigation ?? []) as AnyRec[]).find((entry) => entry?.id === 'group_activity');
const navLabel = (locale: Locale, entry: AnyRec): string =>
  pack(locale).apps?.[APP.name]?.navigation?.[entry.id]?.label ?? entry.label;

const forecastLabel = (locale: Locale, field: 'period' | 'period_label'): string =>
  pack(locale).objects?.crm_forecast?.fields?.[field]?.label ?? (Forecast as AnyRec).fields[field].label;

describe('locale label collisions (#2060 item 13)', () => {
  it('reads the four shipped packs and the Activity group', () => {
    expect(LOCALES).toEqual(expect.arrayContaining(['en', 'zh-CN', 'ja-JP', 'es-ES']));
    expect(ACTIVITY?.type).toBe('group');
    expect((ACTIVITY?.children ?? []).map((child: AnyRec) => child.id)).toContain('nav_event');
  });

  it.each(LOCALES)('%s: the Activity group shares its label with none of its items', (locale) => {
    const group = navLabel(locale, ACTIVITY!);
    const clashes = ((ACTIVITY!.children ?? []) as AnyRec[])
      .filter((child) => navLabel(locale, child) === group)
      .map((child) => child.id);
    expect(clashes, `the group and these items both read "${group}"`).toEqual([]);
  });

  it.each(LOCALES)('%s: the Events item reads as the page it opens', (locale) => {
    const item = ((ACTIVITY!.children ?? []) as AnyRec[]).find((child) => child.id === 'nav_event')!;
    const heading = pack(locale).objects?.crm_event?.pluralLabel ?? (Event as AnyRec).pluralLabel;
    expect(navLabel(locale, item)).toBe(heading);
  });

  it.each(LOCALES)('%s: the forecast form labels Period and Period Label apart', (locale) => {
    expect(forecastLabel(locale, 'period_label')).not.toBe(forecastLabel(locale, 'period'));
  });

  it('en: the two period fields read as they are declared', () => {
    for (const field of ['period', 'period_label'] as const) {
      expect(forecastLabel('en', field)).toBe((Forecast as AnyRec).fields[field].label);
    }
  });
});
