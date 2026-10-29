// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { ActionSchema } from '@objectstack/spec/ui';
import stack from './helpers/composed-stack';
import { CloneOpportunityAction } from '../src/sales/actions/opportunity.actions';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';
import { pipeline as en } from '../src/sales/translations/en/objects.pipeline';
import { pipeline as zh } from '../src/sales/translations/zh-CN/objects.pipeline';
import { pipeline as es } from '../src/sales/translations/es-ES/objects.pipeline';
import { pipeline as ja } from '../src/sales/translations/ja-JP/objects.pipeline';

type Rec = Record<string, any>;

/**
 * Clone Opportunity opens the clone (#2247, rulings 6366949124 and 6367379843,
 * #2194 R2-T1-U04).
 *
 * Until #2247 the action showed "Opportunity cloned successfully!" and left the
 * rep on the SOURCE deal; the copy was found only through the list. It now
 * declares the platform's own post-success navigation,
 * `onSuccess: { navigate: '/apps/app.objectstack.hotcrm/crm_opportunity/record/${result.id}' }`:
 * the console's ActionRunner (`@object-ui/core` 18.0.0, `navigateOnSuccess`)
 * resolves `${result.id}` against the body's return value, `{ id }`, and
 * navigates in the same tab (`openIn` defaults to 'self'). `refreshAfter` is gone: the
 * runner refreshes before it navigates, so it only re-read the page being left.
 *
 * The app segment is spelled out until the platform supports an app-relative
 * navigate (upstream gap): measured on `@objectstack/*` 18.0.0, a bare
 * `/crm_opportunity/${result.id}` is resolved against the console's
 * `/_console` basename and lands on `/_console/home`. With the full path, Clone
 * on `.../crm_opportunity/record/<source>` ended on
 * `.../crm_opportunity/record/<clone>`. The app segment is this package's id,
 * declared in `src/sales/index.ts`.
 */

const actions: Rec[] = (stack as Rec).actions ?? [];
const clone = actions.find((a) => a.name === 'clone_opportunity');

describe('clone_opportunity navigates to the clone it wrote', () => {
  it('declares onSuccess.navigate to the new record, and no refreshAfter', () => {
    expect(CloneOpportunityAction.onSuccess).toEqual({ navigate: '/apps/app.objectstack.hotcrm/crm_opportunity/record/${result.id}' });
    expect(CloneOpportunityAction.refreshAfter, 'a refresh of the source page being left').toBeUndefined();
  });

  it('reaches the composed stack opening in the same tab, with refresh off', () => {
    expect(clone, 'clone_opportunity is not registered').toBeTruthy();
    // The composed stack is the parsed one, so the defaults are filled in.
    expect(clone!.onSuccess).toEqual({ navigate: '/apps/app.objectstack.hotcrm/crm_opportunity/record/${result.id}', openIn: 'self' });
    expect(clone!.refreshAfter).toBe(false);
  });

  it('is accepted by the installed ActionSchema, which defaults openIn to self', () => {
    const parsed = ActionSchema.safeParse(CloneOpportunityAction);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect((parsed.data as Rec).onSuccess).toEqual({
      navigate: '/apps/app.objectstack.hotcrm/crm_opportunity/record/${result.id}',
      openIn: 'self',
    });
  });
});

describe('the result the template reads names the new opportunity', () => {
  let verify: VerifyStack;
  let rep: Person;
  beforeAll(async () => {
    verify = await hotcrmStack();
    rep = await signUpPerson(verify, 'rep@clone-opportunity-opens-clone.test', {
      name: 'Clone Rep', positions: ['sales_rep'], permissionSets: ['sales_rep'],
    });
  }, 120_000);

  it('result.id is a different, stored opportunity: the copy of the source', async () => {
    const [account] = await verify.seed('crm_account', [{ name: 'Clone Navigate Co', owner_id: rep.id }]);
    const [source] = await verify.seed('crm_opportunity', [{
      name: 'Harbor Fit-out', amount: 31_000, stage: 'negotiation', close_date: '2030-06-30',
      crm_account: account!.id, owner_id: rep.id, approval_status: 'approved',
    }]);
    const result = (await verify.actions.run('crm_opportunity', 'clone_opportunity', {
      as: rep.token, recordId: source!.id,
    })) as Rec;

    expect(result.id, 'no id for ${result.id} to resolve').toBeTruthy();
    expect(result.id).not.toBe(source!.id);
    const [copy] = await verify.rows('crm_opportunity', { id: result.id });
    expect(copy?.name).toBe('Copy of Harbor Fit-out');
    // `{{ result.name }}` in the success toast reads this (#2371 row 4).
    expect(result.name, 'no name for {{ result.name }} to render').toBe(copy?.name);
    expect(copy?.crm_account).toBe(account!.id);
    expect(copy?.amount).toBe(31_000);
    expect(copy?.stage).toBe('prospecting');
  });
});

/**
 * The toast names the copy (#2371 row 4). The runner navigates to the clone
 * straight after the toast, and the clone's page looks like the source but
 * for the "Copy of" prefix and the stage, so "Opportunity cloned
 * successfully!" left a rep unsure which deal they were on. Every locale's
 * message renders `{{ result.name }}`; a pack without it would win over the
 * source and drop the name again.
 */
describe('the clone toast names the copy (#2371 row 4)', () => {
  const packs: Array<[string, Rec]> = [['en', en], ['zh-CN', zh], ['es-ES', es], ['ja-JP', ja]];

  it('declares a success message that renders the copy\'s name', () => {
    expect(CloneOpportunityAction.successMessage).toContain('{{ result.name }}');
    expect(CloneOpportunityAction.successMessage).not.toMatch(/cloned successfully/i);
  });

  it.each(packs)('%s pack renders the copy\'s name too', (_locale, pack) => {
    const msg = (pack as Rec).crm_opportunity?._actions?.clone_opportunity?.successMessage;
    expect(msg).toContain('{{ result.name }}');
  });
});
