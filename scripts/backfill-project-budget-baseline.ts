// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.
//
// One-time project-budget carry-over (#2547): give every project whose
// Approved Budget was typed before budget versions a version 1 holding it.
//
//   pnpm exec tsx scripts/backfill-project-budget-baseline.ts --url https://<your-org> --email <admin> --password <pw>
//   pnpm exec tsx scripts/backfill-project-budget-baseline.ts ... --apply   # without this it only reports
//
// From #2547 a project's Approved Budget is not typed: it is the total of the
// project's baseline budget version (`crm_project_budget`), summed by the
// platform. A project saved before then holds the figure that was typed, and
// has no version. The stored figure reads as it was until the project's
// versions change, when the platform sums them and, with none, the project
// would read no budget at all.
//
// For each project with a typed Approved Budget and no budget version, it
// makes version 1 with one `other` line of that figure ("Approved Budget
// carried over"), so the total equals what was typed:
//
//   • a project already approved (Approved, Active, On Hold, Completed,
//     Closed, Cancelled): the version is written Approved, and
//     `project_budget_baseline` makes it the baseline. The Approved Budget is
//     then summed from it and reads the same figure. A later change is a
//     top-up version, through its approval.
//   • a project not yet sent (Draft, Rejected): the version is written Draft,
//     and goes for approval with the project when it is sent.
//   • a project In Approval: left alone and listed. Its approval reads the
//     typed figure as before; run this again once it is decided.
//
// The version is written as the administrator signed in, which
// `project_budget_rules` lets start Approved (a person's starts as Draft) and
// `project_budget_line_amount` lets add a line to it.
//
// Safe by construction:
//   • report-only unless `--apply` is passed;
//   • rerunnable: a project with any budget version is never touched, so a
//     second pass over a converged org reports zero projects.
//
// ⛔ Run against your own org only. The HotCRM maintainers never run it
// against a hosted org: the hosted tenants' owner decides when and whether
// it runs there.

type Json = Record<string, any>;

const DEFAULT_URL = 'http://localhost:4001';

/** `--flag value` / `--flag=value`, else the env var, else the fallback. */
function arg(name: string, envName: string, fallback: string): string {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env[envName]?.trim() || fallback;
}

const APPLY = process.argv.slice(2).includes('--apply');

class Api {
  private cookie = '';
  constructor(private readonly base: URL) {}

  private async call(method: string, path: string, body?: Json): Promise<{ status: number; json: Json }> {
    const res = await fetch(new URL(path, this.base), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: this.base.origin,
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) this.cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    const text = await res.text();
    let json: Json = {};
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return { status: res.status, json };
  }

  private static message(json: Json): string {
    return String(json?.error?.message ?? json?.error ?? json?.message ?? JSON.stringify(json));
  }

  async signIn(email: string, password: string): Promise<Json> {
    const { status, json } = await this.call('POST', '/api/v1/auth/sign-in/email', { email, password });
    if (status !== 200 || !json?.user?.id) {
      throw new Error(`sign-in failed for ${email} (${status}: ${json?.message ?? json?.code ?? 'unknown'})`);
    }
    return json.user as Json;
  }

  /**
   * Every row of `object`, paged. The body is the shape the installed query
   * schema accepts: `sort` as `[{ field, order }]` and no `filters` key at all
   * (an empty `filters: []` and a string `sort: 'id asc'` are both refused by
   * the 17.6.0 query door, #1999). `test/backfill-query-bodies.test.ts` keeps it there.
   */
  async all(object: string, fields: string[]): Promise<Json[]> {
    const out: Json[] = [];
    for (let skip = 0; ; ) {
      const { status, json } = await this.call('POST', `/api/v1/data/${object}/query`, {
        fields, sort: [{ field: 'id', order: 'asc' }], skip, top: 200,
      });
      if (status < 200 || status >= 300) throw new Error(`query ${object} → ${status}: ${Api.message(json)}`);
      const rows = (json.records ?? []) as Json[];
      out.push(...rows);
      if (rows.length < 200) return out;
      skip += rows.length;
    }
  }

  async post(object: string, body: Json): Promise<Json> {
    const { status, json } = await this.call('POST', `/api/v1/data/${object}`, body);
    if (status < 200 || status >= 300) throw new Error(`POST ${object} → ${status}: ${Api.message(json)}`);
    return (json.record ?? json.data ?? json) as Json;
  }

  async patch(object: string, id: string, body: Json): Promise<void> {
    const { status, json } = await this.call('PATCH', `/api/v1/data/${object}/${id}`, body);
    if (status < 200 || status >= 300) throw new Error(`PATCH ${object}/${id} → ${status}: ${Api.message(json)}`);
  }
}

const APPROVED = ['approved', 'active', 'on_hold', 'completed', 'closed', 'cancelled'];
const NOT_SENT = ['draft', 'rejected'];

async function main(): Promise<void> {
  const url = arg('url', 'HOTCRM_URL', DEFAULT_URL);
  const email = arg('email', 'HOTCRM_ADMIN_EMAIL', 'admin@objectos.ai');
  const password = arg('password', 'HOTCRM_ADMIN_PASSWORD', 'admin123');

  const api = new Api(new URL(url));
  const me = await api.signIn(email, password);
  console.log(`Signed in as ${me.email ?? me.id} at ${url}`);
  console.log(APPLY ? 'Mode: APPLY (records will be written)' : 'Mode: REPORT ONLY (pass --apply to write)');

  const projects = await api.all('crm_project', ['id', 'project_number', 'name', 'status', 'approved_budget']);
  const versions = await api.all('crm_project_budget', ['id', 'crm_project']);
  const projectId = (v: unknown): string => String(typeof v === 'object' && v !== null ? (v as Json).id : v ?? '');
  const withVersions = new Set(versions.map((v) => projectId(v.crm_project)));
  const typed = projects.filter((p) => Number(p.approved_budget ?? 0) > 0 && !withVersions.has(String(p.id)));
  const waiting = typed.filter((p) => p.status === 'in_approval');
  const todo = typed.filter((p) => p.status !== 'in_approval');

  console.log(`\ncrm_project: ${projects.length} row(s), ${typed.length} with a typed Approved Budget and no budget version.`);
  for (const p of todo) {
    const as = APPROVED.includes(String(p.status)) ? 'Approved baseline' : 'Draft';
    console.log(`  ${p.project_number ?? p.id} ${p.name} (${p.status}): ${p.approved_budget} → version 1, ${as}`);
  }
  for (const p of waiting) {
    console.log(`  ${p.project_number ?? p.id} ${p.name}: In Approval, left alone — run again once it is decided.`);
  }
  if (todo.length === 0 || !APPLY) {
    if (!APPLY) console.log('\nReport only. Re-run with --apply to write.');
    return;
  }

  let failed = 0;
  for (const p of todo) {
    const status = NOT_SENT.includes(String(p.status)) ? 'draft' : 'approved';
    try {
      const version = await api.post('crm_project_budget', {
        crm_project: p.id,
        status,
        notes: 'Carried over from the Approved Budget typed before budget versions (#2547).',
      });
      await api.post('crm_project_budget_line', {
        crm_project_budget: version.id,
        category: 'other',
        description: 'Approved Budget carried over',
        quantity: 1,
        unit_cost: Number(p.approved_budget),
      });
    } catch (err) {
      failed++;
      console.log(`  ${p.name}: ${(err as Error).message}`);
    }
  }
  // Read back rather than trusting the POST answers.
  const after = new Set((await api.all('crm_project_budget', ['id', 'crm_project'])).map((v) => projectId(v.crm_project)));
  const left = todo.filter((p) => !after.has(String(p.id)));
  console.log(`  Carried over ${todo.length - left.length}/${todo.length}; ${left.length} still without a version.`);
  if (failed > 0 || left.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nBackfill failed: ${(err as Error).message}`);
  process.exitCode = 1;
});

// A module, not a global script: the other backfills declare the same names.
export {};
