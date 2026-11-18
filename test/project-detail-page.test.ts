// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { Project } from '../src/psa/objects/project.object';
import { ProjectDetailPage } from '../src/psa/pages/project_detail.page';

type Rec = Record<string, any>;

/**
 * The project page's Overview draws the project's fields above its Gantt.
 *
 * On @object-ui 18.5.0 a `record:details` with neither `sections` nor `fields`
 * draws the object's `highlightFields` less the ones the highlights strip
 * already shows (objectui#12433). The page authored exactly that bare node, so
 * the Overview of every project drew no field, only the Gantt (measured on
 * main 2026-11-17: `<div data-obj-type="record:details"><div class="space-y-6"></div></div>`).
 * The body now names the object's field groups, as the synthesized tab does.
 */
describe('the project page\'s Overview body', () => {
  const details = (ProjectDetailPage.slots!.details as Rec[]).find((n) => n.type === 'record:details')!;
  const groups = (Project.fieldGroups as Rec[]).map((g) => g.key);

  it('names every field group of the project, in declared order', () => {
    expect(details, 'the details slot keeps its record:details').toBeTruthy();
    expect((details.properties?.sections as Rec[]).map((s) => s.group)).toEqual(groups);
  });

  it('every project field sits in one of those groups, so none is left off the Overview', () => {
    const ungrouped = Object.entries(Project.fields as Record<string, Rec>)
      .filter(([, f]) => !groups.includes(f.group))
      .map(([name]) => name);
    expect(ungrouped).toEqual([]);
  });
});
