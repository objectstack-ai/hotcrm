// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { PermissionSetSchema } from '@objectstack/spec/security';
import stack from './helpers/composed-stack';
import { allProfiles } from '../objectstack.composition';
import { TenantAdminProfile } from '../src/sales/profiles/tenant-admin.profile';

/**
 * Every HotCRM permission set says who holds it (#2294).
 *
 * Setup → Permission Sets lists each set with its `description`. Before #2294
 * six of HotCRM's sets showed none and the other two showed a multi-sentence
 * English paragraph, so an administrator picking a set for a new user could
 * not tell a sales rep from a sales manager. This pins the business fact that
 * every set HotCRM declares carries a one-sentence description: who holds it,
 * what it opens, what it withholds. The sibling for positions is
 * `test/position-descriptions.test.ts` (#2249).
 *
 * The roster is the seven sets the community app serves plus `tenant_admin`,
 * which only the SaaS composition registers (`test/saas-composition.test.ts`
 * pins that swap). Sets the platform itself ships — `admin_full_access`,
 * `organization_admin`, `member_default` and the rest — are the platform's to
 * describe and are not in it.
 *
 * English only, measured on @objectstack/spec 18.1.0: the translation bundle
 * (`TranslationDataSchema`) answers `unrecognized_keys` to a `permissions`,
 * `permissionSets` or `positions` slot, so a set's description cannot be
 * translated yet. objectstack#25652 adds that slot; the locale packs carry the
 * translations once a released `@objectstack/*` does.
 *
 * A sentence here means what it means for positions: non-empty, starts with a
 * capital letter, ends with one full stop and contains no other sentence
 * break. It is deliberately not a copy of the wording, which the profile owns.
 */
type AnyRec = Record<string, any>;

const served: AnyRec[] = ((stack as AnyRec).permissions ?? []) as AnyRec[];
const declared: AnyRec[] = [...Object.values(allProfiles), TenantAdminProfile] as AnyRec[];

describe('permission set descriptions (#2294)', () => {
  it('the community app serves every set the profiles barrel declares', () => {
    expect(served.map((p) => p.name).sort()).toEqual(
      Object.values(allProfiles).map((p) => (p as AnyRec).name).sort(),
    );
  });

  it.each(declared.map((p) => [p.name as string, p]))(
    '%s has a one-sentence business description',
    (_name, set) => {
      const description = (set as AnyRec).description;
      expect(typeof description).toBe('string');
      const text = String(description).trim();
      expect(text).toMatch(/^[A-Z].*\.$/);
      // One sentence: the only full stop (or ? / !) followed by a space or the end is the last character.
      expect(text.slice(0, -1)).not.toMatch(/[.!?](\s|$)/);
      expect(text.length).toBeLessThanOrEqual(160);
      // The platform's own schema keeps the key (a stripped key would read back undefined).
      expect(PermissionSetSchema.parse(set).description).toBe(description);
    },
  );

  it('gives no two sets the same description', () => {
    const texts = declared.map((p) => p.description);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
