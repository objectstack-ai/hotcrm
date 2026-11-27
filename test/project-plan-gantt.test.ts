// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec } from './helpers/composed-stack';
import { ProjectTaskViews } from '../src/psa/views/project_task.view';

/**
 * A project's plan is read on the Project Plan view, not on the project.
 *
 * Maintainer ruling 2026-11-25 on #2740 (「2A+ 删甘特图」): the project's authored
 * record page, which drew its tasks on a Gantt under the fields in Overview,
 * is deleted, and the project opens on the platform's default record page (its
 * tasks in the Related tab). This supersedes the 2026-11-21 keep of that Gantt
 * (#2665 row 6). The chart stays one click away: Project Tasks › Project Plan
 * draws every task the reader may see on a Gantt, with a quick filter by
 * project. The navigation entry to it is pinned in
 * `test/psa-module-package.test.ts`.
 */
describe('the project plan after the project page went (#2740)', () => {
  const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

  it('the project has no authored record page: it opens on the default page', () => {
    expect(pages.filter((p) => p.object === 'crm_project').map((p) => p.name)).toEqual([]);
  });

  it('Project Plan is a Gantt of the project tasks that filters by project in one click', () => {
    const plan = (ProjectTaskViews.listViews as Record<string, AnyRec>).project_plan!;
    expect(plan.type).toBe('gantt');
    expect(plan.data).toEqual({ provider: 'object', object: 'crm_project_task' });
    expect(plan.gantt.startDateField).toBe('planned_start');
    expect(plan.gantt.endDateField).toBe('planned_end');
    expect(plan.gantt.dependenciesField).toBe('predecessors');
    expect((plan.gantt.quickFilters as AnyRec[]).map((f) => f.field)).toContain('crm_project');
  });
});
