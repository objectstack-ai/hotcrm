// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { Contact } from '../src/objects/contact.object';
import contactHooks from '../src/objects/contact.hook';
import { makeHarness, makeCtx, hookNamed, type Rec } from './helpers/hook-harness';

/**
 * The contact-email rule, as documented vs. as enforced (#648).
 *
 * `content/docs/sales/contacts.mdx` and its two translations used to promise
 * that "an email address must be unique within the same account" and that "the
 * same person can appear under multiple companies (a board member, for
 * example)". Both halves were wrong, and the second one described the exact
 * write the product refuses: a reader following the documentation got
 * `Another contact (…) with email … already exists.`
 *
 * Two independent layers enforce the real rule, and both are pinned here so the
 * prose cannot drift back:
 *
 *   1. `crm_contact.email` declares FIELD-level `unique: true`, which since
 *      framework#3696 materializes as the tenant composite
 *      `(organization_id, email)` — one address per organization, spanning
 *      every account in it. A table-level `indexes` entry would be taken
 *      verbatim (platform-wide) and would make the composite unreachable
 *      (framework#3991 `unique/double-declaration`), so there must not be one.
 *   2. `contact_integrity` (`src/objects/contact.hook.ts`) looks the address up
 *      with NO account scope and rejects the duplicate before the database
 *      does. `test/hooks-runtime-sales.test.ts` owns the full behavioural
 *      coverage of that hook ("rejects a duplicate email GLOBALLY, not just
 *      within one account"); the single run below is here to tie the DOC
 *      sentence to executed behaviour, not to re-test the hook.
 *
 * Same shape as the `crm_account` name rule corrected in #625 / PR #646. This
 * file takes no position on whether "one person, two companies" *should* be
 * supported — that is a product decision and a schema change, not a doc fix.
 */

const DOCS: Array<{ file: string; lang: string }> = [
  { file: 'content/docs/sales/contacts.mdx', lang: 'en' },
  { file: 'content/docs/sales/contacts.zh-Hans.mdx', lang: 'zh-Hans' },
  { file: 'content/docs/sales/contacts.zh-Hant.mdx', lang: 'zh-Hant' },
];

/** The one bullet under "Built-in rules" that states the email constraint. */
function emailRuleLine(file: string): string {
  const text = readFileSync(join(REPO_ROOT, file), 'utf8');
  const line = text
    .split('\n')
    .find((l) => l.trimStart().startsWith('-') && /email|邮箱|郵箱/i.test(l));
  expect(line, `${file}: no email bullet found under the rules list`).toBeTruthy();
  return line as string;
}

describe('contact email uniqueness — docs match what ships (#648)', () => {
  describe.each(DOCS)('$file', ({ file, lang }) => {
    const rule = () => emailRuleLine(file);

    it('scopes the rule to the organization, not to one account', () => {
      const expected =
        lang === 'en' ? /unique within your organization/i
          : lang === 'zh-Hans' ? /在你所在的组织内必须唯一/
            : /在你所屬的組織內必須唯一/;
      expect(rule()).toMatch(expected);
    });

    it('does not resurrect the per-account claim', () => {
      const retired =
        lang === 'en' ? /unique within the same account/i
          : lang === 'zh-Hans' ? /同一个客户内邮箱地址必须唯一/
            : /同一個客戶內郵箱地址必須唯一/;
      expect(rule()).not.toMatch(retired);
    });

    it('does not describe the one-person-two-companies write the product rejects', () => {
      const rejectedExample =
        lang === 'en' ? /appear under multiple companies|board member/i
          : lang === 'zh-Hans' ? /可以出现在多个公司|董事会成员/
            : /可以出現在多個公司|董事會成員/;
      expect(rule()).not.toMatch(rejectedExample);
    });

    it('says the address cannot be reused across accounts', () => {
      const crossAccount =
        lang === 'en' ? /different accounts/i
          : lang === 'zh-Hans' ? /不同的客户/
            : /不同的客戶/;
      expect(rule()).toMatch(crossAccount);
    });
  });
});

describe('the enforcement the contact docs now describe (#648)', () => {
  it('declares email uniqueness on the FIELD, so it is scoped per organization', () => {
    const email = (Contact as any).fields?.email;
    expect(email?.unique).toBe(true);
  });

  it('declares no table-level email index that would re-globalise the constraint', () => {
    const indexes: Array<{ fields?: string[] }> = (Contact as any).indexes ?? [];
    const emailIndex = indexes.find((i) => (i.fields ?? []).includes('email'));
    expect(
      emailIndex,
      'a declared index on `email` is materialized verbatim (platform-wide) and ' +
      'makes the per-tenant composite unreachable — framework#3991',
    ).toBeUndefined();
  });

  it('rejects the same address on two contacts under DIFFERENT accounts', async () => {
    const hook = hookNamed(contactHooks, 'contact_integrity');
    const h = makeHarness({
      crm_contact: [{ id: 'c1', email: 'ada@example.com', crm_account: 'accA' }],
    });
    const input: Rec = { email: 'Ada@Example.com', crm_account: 'accB' };
    await expect(
      hook.handler(makeCtx({ event: 'beforeInsert', input, user: { id: 'user_1' }, api: h.api })),
    ).rejects.toThrow(/already exists/);
  });
});
