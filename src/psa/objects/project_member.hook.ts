// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { Hook, HookContext } from '@objectstack/spec/data';
import type { HookApi } from '../../sales/objects/_hook-api';

/**
 * Keep the project's Team and Project Manager in step with its staffing.
 *
 * After any member is added, changed or removed, the project's `project_manager`
 * is set to the person staffed with the Project Manager responsibility (the
 * earliest such row when there are several; empty when there is none), and
 * `team_members` to every other person staffed on it. The manager is left out
 * of the team on purpose: they read and edit through `project_manager_edit`,
 * so each person on a project is named by exactly one rule (objectstack#33683
 * keeps one share row per user and record, and a team read written after the
 * manager's edit would replace it). Both fields are read-only to people, so the
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
        if (!manager && person && m.responsibility === 'project_manager') manager = person;
      }
      for (const m of members) {
        const person = refId(m.person);
        if (person && person !== manager && team.indexOf(person) < 0) team.push(person);
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

/**
 * One staffing row per person per project. A second row for the same person
 * is refused, naming the project: the time entry reads the person's staffing
 * to pick the rate card, and two rows would make that rate a coin toss.
 * Change the existing row's responsibility or rate card instead.
 *
 * Runs as the caller, before the write: the person staffing a project reads
 * its staffing rows (they are the project's children).
 */
const projectMemberUnique: Hook = {
  name: 'project_member_unique',
  object: 'crm_project_member',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 100,
  refusals: {
    DUPLICATE_VALUE: { message: 'This person is already staffed on this project. Change their existing staffing row instead of adding another.', status: 409 },
  },
  description: 'Refuse a second staffing row for the same person on the same project.',
  handler: async (ctx: HookContext) => {
    // The refusal envelope (#1075). Mirrored from `src/sales/objects/_refusal.ts` because a
    // lowered body has no module scope and `extractHookBody` THROWS on an
    // import; `test/refusal-envelope.test.ts` pins every copy against it.
    function refuse(
      message: string,
      code: string,
      status: number,
      userMessage: string = message,
    ): Error {
      const err = new Error(message) as Error & {
        code: string;
        status: number;
        userMessage: string;
      };
      err.code = code;
      err.status = status;
      err.userMessage = userMessage;
      return err;
    }
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const api = ctx.api as HookApi | undefined;
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!api || !input) return;
    if (ctx.event === 'beforeUpdate' && !('person' in input) && !('crm_project' in input)) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    const projectId = refId('crm_project' in input ? input.crm_project : previous.crm_project);
    const personId = refId('person' in input ? input.person : previous.person);
    if (!projectId || !personId) return;
    const rows = await api.object('crm_project_member').find({
      where: { crm_project: projectId, person: personId },
      fields: ['id'],
      top: 2,
    });
    if (rows.some((r) => r.id !== previous.id)) {
      throw refuse(
        'This person is already staffed on this project. Change their existing staffing row instead of adding another.',
        'DUPLICATE_VALUE',
        409,
      );
    }
  },
};

/**
 * Copy the person's name onto the staffing row; it is the row's title
 * (hotcrm#2568, `project_member.object.ts`).
 *
 * Written on a save that names a person (an insert, a change of person), and
 * on any other update of a row with no copy yet, which is what heals a row
 * stored before the field. A rename of the user is
 * `project_member_person_rename`'s. Runs as the caller: whoever staffs a
 * project reads the person they staff.
 */
const projectMemberPersonName: Hook = {
  name: 'project_member_person_name',
  object: 'crm_project_member',
  events: ['beforeInsert', 'beforeUpdate'],
  priority: 110,
  description: "Copy the person's name onto the staffing row; it is the row's title.",
  handler: async (ctx: HookContext) => {
    function refId(value: unknown): string {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        return String((value as Record<string, unknown>).id);
      }
      return '';
    }
    const api = ctx.api as HookApi | undefined;
    const input = ctx.input as Record<string, unknown> | undefined;
    if (!api || !input) return;
    const previous = (ctx.previous ?? {}) as Record<string, unknown>;
    let personId = '';
    if ('person' in input) {
      personId = refId(input.person);
      if (!personId) {
        input.person_name = null;
        return;
      }
    } else if (ctx.event === 'beforeUpdate' && ctx.dispatch?.mode !== 'per-row'
      && (typeof previous.person_name !== 'string' || previous.person_name.trim() === '')) {
      personId = refId(previous.person);
    }
    if (!personId) return;
    const person = await api.object('sys_user').findOne({ where: { id: personId }, fields: ['id', 'name'] });
    const name = person && typeof person.name === 'string' ? person.name.trim() : '';
    input.person_name = name === '' ? null : name.slice(0, 255);
  },
};

export default [projectTeamSync, projectMemberUnique, projectMemberPersonName];
