// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Keep the project's Team and Project Manager in step with its staffing.
 *
 * After any member is added, changed or removed, the project's `team_members`
 * is set to every person staffed on it, and `project_manager` to the person
 * staffed with the Project Manager responsibility (the earliest such row when there are several;
 * empty when there is none). Both fields are read-only to people, so the
 * project's approver and the team the sharing rules read are typed once, here.
 *
 * `runAs: 'system'` (AGENTS.md rule 9): a read-only field is stripped from a
 * non-system write, and the person editing the staffing may not edit the
 * project. Every read is keyed to this one project's id (rule 10), and the
 * elevated `ctx.api` keeps the trigger's tenant. It writes only when a value
 * changed, so re-saving a member is no write at all.
 */
const projectTeamSync: Hook = {
  name: 'project_team_sync',
  object: 'crm_project_member',
  events: ['afterInsert', 'afterUpdate', 'afterDelete'],
  priority: 100,
  runAs: 'system',
  description: 'Keep the project\'s Team and Project Manager in step with its staffing rows.',
  handler: async (ctx: HookContext) => {
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const api = ctx.api as HookApi | undefined;
    if (!api) return;
    const input = (ctx.input ?? {}) as Record<string, unknown>;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    // A member moved to another project changes both projects' teams.
    const projectIds = [refId(input.crm_project), refId(previous.crm_project)]
      .filter((id, i, all) => id !== '' && all.indexOf(id) === i);

    for (const projectId of projectIds) {
      const members = await api.object('crm_project_member').find({
        where: { crm_project: projectId },
        fields: ['id', 'person', 'responsibility', 'created_at'],
        top: 500,
      });
      members.sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
      const team: string[] = [];
      let manager = '';
      for (const m of members) {
        const person = refId(m.person);
        if (!person) continue;
        if (team.indexOf(person) < 0) team.push(person);
        if (!manager && m.responsibility === 'project_manager') manager = person;
      }
      team.sort();
      const project = await api.object('crm_project').findOne({
        where: { id: projectId },
        fields: ['id', 'team_members', 'project_manager'],
      });
      if (!project) continue;
      const held = (Array.isArray(project.team_members) ? project.team_members : [])
        .map((v: unknown) => refId(v)).filter((v: string) => v !== '').sort();
      const sameTeam = held.length === team.length && held.every((v: string, i: number) => v === team[i]);
      const sameManager = refId(project.project_manager) === manager;
      if (sameTeam && sameManager) continue;
      await api.object('crm_project').update(
        { id: projectId, team_members: team, project_manager: manager || null },
        { where: { id: projectId } },
      );
    }
  },
};

export default [projectTeamSync];
