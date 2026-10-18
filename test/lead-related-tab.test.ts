// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec, localePacks } from './helpers/composed-stack';

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

/**
 * The lead record's Related tab (#2127).
 *
 * It held one list, Tasks. A rep could not reach the lead's events, the
 * campaigns it belongs to, or the account, contact and opportunity it was
 * converted into, from the record. The tab now carries four sections: the
 * Tasks list as before, an Events list (upcoming first), a Campaign Members
 * list, and a Conversion section.
 *
 * What this file pins is the business shape, read from the composed stack:
 * which records each section lists and how they reach this lead, the order
 * that makes "upcoming first" true, the condition under which the Conversion
 * section draws at all, and the wording of the two new panel labels.
 *
 * The rows themselves were read in a browser against `objectstack dev` on the
 * pinned console (the PR body has the reading). The platform draws each list's
 * "+ New" button from the caller's create permission on the child object, and
 * nothing on this page authors it, so nothing here asserts it.
 */

const byName = (name: string): AnyRec => {
  const obj = objects.find((o) => o.name === name);
  if (!obj) throw new Error(`no object named "${name}" in the composed stack`);
  return obj;
};
const LEAD = byName('crm_lead');

const leadPage = pages.find((p) => p.name === 'lead_detail_page') as AnyRec;
const mainTabs = (leadPage?.regions ?? [])
  .flatMap((r: AnyRec) => r.components ?? [])
  .find((c: AnyRec) => c.id === 'main_tabs') as AnyRec;
const relatedTab = (mainTabs?.properties?.items ?? []).find((t: AnyRec) => t.label === 'Related') as AnyRec;
const relatedChildren: AnyRec[] = relatedTab?.children ?? [];
const accordion = relatedChildren.find((c) => c.type === 'page:accordion') as AnyRec;
const accordionItems: AnyRec[] = accordion?.properties?.items ?? [];

/** The one related list an accordion item holds. */
const listOf = (item: AnyRec): AnyRec => {
  const lists = (item.children ?? []).filter((c: AnyRec) => c.type === 'record:related_list');
  expect(lists, `accordion item ${JSON.stringify(item.label)} holds one related list`).toHaveLength(1);
  return lists[0];
};
const listFor = (objectName: string): AnyRec => {
  const item = accordionItems.find((i) => listOf(i).properties?.objectName === objectName);
  if (!item) throw new Error(`no Related-tab list over ${objectName}`);
  return listOf(item);
};

describe('the lead Related tab carries its four sections', () => {
  it('is the tab this suite thinks it is', () => {
    // A rename that unhooked the assertions below from the real tab would
    // otherwise leave them passing over an empty list.
    expect(leadPage?.object).toBe('crm_lead');
    expect(relatedTab, 'lead_detail_page has a tab labelled "Related"').toBeDefined();
    expect(accordion?.id).toBe('related_accordion');
  });

  it('lists tasks, events and campaign memberships, then the conversion section', () => {
    expect(accordionItems.map((i) => listOf(i).properties.objectName)).toEqual([
      'crm_task',
      'crm_event',
      'crm_campaign_member',
    ]);
    // The conversion section sits after the accordion, not inside it: inside,
    // an unconverted lead would show a panel heading over nothing.
    expect(relatedChildren.map((c) => c.type)).toEqual(['page:accordion', 'record:details']);
    const conversion = relatedChildren[1];
    expect(conversion.id).toBe('related_conversion');
    expect(conversion.properties.sections).toEqual([{ group: 'conversion' }]);
  });

  it('reaches each list through a lookup on the child that points at the lead', () => {
    for (const objectName of ['crm_task', 'crm_event', 'crm_campaign_member']) {
      const list = listFor(objectName);
      const field = byName(objectName).fields?.[list.properties.relationshipField];
      expect(field?.type, `${objectName}.${list.properties.relationshipField}`).toBe('lookup');
      // The RESOLVED field names its target `reference`.
      expect(field?.reference, `${objectName}.${list.properties.relationshipField}`).toBe('crm_lead');
    }
  });

  it('opens Events and Campaign Members on arrival, beside Tasks', () => {
    // The renderer opens a panel only for a strict `collapsed: false`, and only
    // more than one when the accordion allows it.
    expect(accordion.properties.allowMultiple).toBe(true);
    for (const item of accordionItems) expect(item.collapsed).toBe(false);
  });
});

describe('the Events list puts upcoming events first', () => {
  const events = listFor('crm_event');

  it('sorts by start, newest first', () => {
    // A booked event starts after every event that already happened, so a
    // descending start puts the future on top and keeps the history under it.
    // Ascending would lead with the oldest held call.
    expect(events.properties.sort).toEqual([{ field: 'start_datetime', order: 'desc' }]);
  });

  it('sorts on a start every event has', () => {
    // A row with no start would sort as if it were the oldest (or the newest,
    // on a driver that puts nulls first), out of place either way.
    const start = byName('crm_event').fields.start_datetime;
    expect(start.required).toBe(true);
    expect(start.storage?.notNull).toBe(true);
  });

  it('shows the start beside the subject, where a narrow window still draws it', () => {
    expect(events.properties.columns.slice(0, 2)).toEqual(['subject', 'start_datetime']);
  });
});

describe('the Conversion section draws once the conversion links are set', () => {
  const conversion = relatedChildren.find((c) => c.id === 'related_conversion') as AnyRec;
  const hidden: string[] = conversion?.properties?.hideFields ?? [];
  const members = Object.entries((LEAD.fields ?? {}) as Record<string, AnyRec>).filter(
    ([, f]) => f?.group === 'conversion' && f?.hidden !== true,
  );
  const shown = members.filter(([name]) => !hidden.includes(name));

  it('links the converted account, contact and opportunity', () => {
    const targets = Object.fromEntries(
      shown.filter(([, f]) => f.type === 'lookup').map(([name, f]) => [name, f.reference]),
    );
    expect(targets).toEqual({
      converted_account: 'crm_account',
      converted_contact: 'crm_contact',
      converted_opportunity: 'crm_opportunity',
    });
  });

  it('leaves out the Converted flag, the one member an unconverted lead fills', () => {
    // `is_converted` defaults to false, and false is a value the section draws
    // ("No"). Left in, it would put the section on every lead.
    expect(LEAD.fields.is_converted.group).toBe('conversion');
    expect(LEAD.fields.is_converted.defaultValue).toBe(false);
    expect(hidden).toEqual(['is_converted']);
  });

  it('keeps only members that stay empty until conversion writes them', () => {
    // A section whose members are all empty renders nothing, heading included.
    // That is the whole condition: a member here with a default would draw the
    // section on every unconverted lead.
    expect(shown.map(([name]) => name).sort()).toEqual(
      ['converted_account', 'converted_contact', 'converted_date', 'converted_opportunity'].sort(),
    );
    for (const [name, f] of shown) expect(f.defaultValue, `crm_lead.${name}`).toBeUndefined();
  });
});

describe('the new panel labels use the language-pack wording', () => {
  // The two panels over a list whose heading comes from its object: the list
  // carries no `title`, so it reads the pack's `pluralLabel`, and the panel
  // label above it is an inline map that must say the same thing.
  const derived = accordionItems.filter((i) => typeof i.label === 'object' && i.label !== null);

  it('covers both new panels, and their lists author no title of their own', () => {
    expect(derived.map((i) => listOf(i).properties.objectName)).toEqual(['crm_event', 'crm_campaign_member']);
    for (const item of derived) expect(listOf(item).properties.title).toBeUndefined();
  });

  it("matches each locale pack's plural label, in every shipped locale", () => {
    expect(localePacks.length).toBeGreaterThan(0);
    for (const item of derived) {
      const objectName = listOf(item).properties.objectName as string;
      expect(Object.keys(item.label).sort()).toEqual(localePacks.map(([locale]) => locale).sort());
      for (const [locale, pack] of localePacks) {
        const plural = pack.objects?.[objectName]?.pluralLabel;
        expect(plural, `${locale}: objects.${objectName}.pluralLabel`).toBeTruthy();
        expect(item.label[locale], `${locale}: panel over ${objectName}`).toBe(plural);
      }
    }
  });
});
