// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { packageStacks } from '../objectstack.composition';
import { servedApps, type AnyRec } from './helpers/composed-stack';

/**
 * Each HotCRM app draws its own mark on the home page and in the app switcher (#2666).
 *
 * The console draws an app's `branding.logo` when it declares one, and otherwise its
 * lucide `icon` on a tile filled with its `branding.primaryColor` (the 18.6.0 home apps
 * strip and `AppMark`). Every app used to set `logo` to the one HotCRM mark, so the home
 * page showed the same orange tile six times and no app's `icon` was ever drawn.
 *
 * So: the app package's app alone draws the HotCRM mark; a module's app declares no
 * `logo`, keeps the HotCRM mark as its browser-tab `favicon`, and is told apart by its
 * `icon` and its colour, which no two apps share. The apps are read as served
 * (`servedApps`), and which package declares each is read from the package stacks, so a
 * new module app is held to the same rule without being listed here.
 */
describe('every HotCRM app has a mark of its own (#2666)', () => {
  const typeOfPackage = new Map<string, string>();
  for (const stack of packageStacks as AnyRec[]) {
    for (const app of (stack.apps ?? []) as AnyRec[]) {
      typeOfPackage.set(String(app.name), String(stack.manifest?.type));
    }
  }
  const apps = servedApps();
  const branding = (app: AnyRec) => (app.branding ?? {}) as { logo?: string; favicon?: string; primaryColor?: string };
  const appPackageApps = apps.filter((app) => typeOfPackage.get(app.name) === 'app');
  const moduleApps = apps.filter((app) => typeOfPackage.get(app.name) === 'module');

  it('reads one app-package app and the module apps beside it', () => {
    expect(appPackageApps.map((app) => app.name)).toEqual(['crm_enterprise']);
    expect(moduleApps.length).toBeGreaterThan(1);
    expect(appPackageApps.length + moduleApps.length).toBe(apps.length);
  });

  it('draws the HotCRM mark on the app-package app only', () => {
    const mark = branding(appPackageApps[0]).logo;
    expect(mark).toMatch(/^data:image\/svg\+xml,/);
    for (const app of moduleApps) {
      expect({ app: app.name, logo: branding(app).logo }).toEqual({ app: app.name, logo: undefined });
      // The browser tab stays HotCRM in every app.
      expect({ app: app.name, favicon: branding(app).favicon }).toEqual({ app: app.name, favicon: mark });
    }
  });

  it('gives every app an icon and a hex colour of its own', () => {
    const icons = apps.map((app) => app.icon);
    const colours = apps.map((app) => String(branding(app).primaryColor ?? '').toUpperCase());
    for (const [i, app] of apps.entries()) {
      expect({ app: app.name, icon: typeof icons[i] === 'string' && icons[i] !== '' }).toEqual({ app: app.name, icon: true });
      expect({ app: app.name, colour: colours[i] }).toEqual({ app: app.name, colour: expect.stringMatching(/^#[0-9A-F]{6}$/) });
    }
    const shared = (values: string[]) => values.filter((value, i) => values.indexOf(value) !== i);
    expect(shared(icons)).toEqual([]);
    expect(shared(colours)).toEqual([]);
  });
});
