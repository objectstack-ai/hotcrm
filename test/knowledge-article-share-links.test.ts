// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SysUser } from '@objectstack/platform-objects';
import { ExpressionEngine } from '@objectstack/formula';
import { materializeDeclaredFields } from '@objectstack/objectql/core';
import {
  ShareLinkService,
  SysShareLink,
  registerShareLinkRoutes,
  objectCanCarryShareLinks,
} from '@objectstack/plugin-sharing';
import stack from '../objectstack.config';

/**
 * Share-link publishing for public knowledge articles (#1104, from #601 item 3).
 *
 * ### What this file is for
 *
 * `crm_knowledge_article` holds a MIX of public and internal records, and
 * `publicSharing` mints links that a caller with **no principal at all** can
 * redeem. The only thing between those two facts is
 * `publicSharing.eligibility`. So the acceptance criterion for #1104 is
 * two-sided, and the second half is the whole test:
 *
 *   1. an unauthenticated visitor reaches a PUBLISHED, PUBLIC article;
 *   2. an INTERNAL-audience article and a DRAFT are NOT reachable.
 *
 * ⛔ Half 1 alone is not evidence of anything. It passed on 17.0.0-rc.6 when
 * `eligibility` had no consumer whatsoever — `getPolicy()` dropped the key and
 * `createLink()` evaluated no predicate — and on that version half 2 FAILED:
 * a draft and an internal article each minted a `public` link and each was
 * served anonymously. That is why the block was withheld from the object until
 * now, and why declaring it back then would have OPENED anonymous access to
 * internal articles rather than restricting links to public ones.
 *
 * ### Why it runs on the real service and the real routes
 *
 * A predicate that evaluates `false` in isolation is not a refused link, and a
 * grep count of `eligibility` in the plugin's `dist` is not enforcement — the
 * unblocking evidence for this card was exactly such a count (8 hits on
 * `@objectstack/plugin-sharing@17.1.0` against sibling controls), which
 * establishes only that the key is READ. Everything below therefore drives the
 * real `ShareLinkService` over a real `ObjectQL` engine, through the real
 * `registerShareLinkRoutes` REST surface, with the anonymous half issued by a
 * caller whose execution context is literally `{}`.
 *
 * ### The two spelling traps this file pins
 *
 * Both produce a block that reads as declared and silently is not:
 *
 *   - `eligibility` must be a PLAIN STRING; the `P` tagged template used for
 *     `validations[].condition` returns `{ dialect, source }`, which
 *     `getPolicy()` discards on a `typeof === 'string'` check.
 *   - reads must be `record.`-PREFIXED. The bare-identifier spelling #601
 *     wrote — `status == 'published' && audience == 'public'` — COMPILES and
 *     then fails at evaluate with `Unknown variable: audience`, which fails
 *     closed into "no link ever mints". Pinned in the last describe block.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const ARTICLE = byName('crm_knowledge_article');
const POLICY = (ARTICLE.publicSharing ?? {}) as AnyRec;

const SIGNED_IN = { userId: 'user_author', isSystem: false, positions: [], permissions: [] };
const ANONYMOUS = {};

// ────────────────────────────────────────────── the declaration itself ──

describe('crm_knowledge_article declares publicSharing in the shape the platform reads', () => {
  it('is enabled, view-only, and never widens to signed_in or email audiences', () => {
    expect(POLICY.enabled).toBe(true);
    expect(POLICY.allowedPermissions).toEqual(['view']);
    expect([...(POLICY.allowedAudiences ?? [])].sort()).toEqual(['link_only', 'public']);
    // `signed_in` is a different feature and `email` needs a per-link allowlist;
    // neither is what "publish a public article" means.
    expect(POLICY.allowedAudiences).not.toContain('signed_in');
    expect(POLICY.allowedAudiences).not.toContain('email');
  });

  it('the platform agrees the object can carry share links', () => {
    expect(objectCanCarryShareLinks(ARTICLE)).toBe(true);
  });

  it('spells eligibility as a PLAIN STRING, not a P`` Expression envelope', () => {
    // `getPolicy()` keeps the key only when `typeof raw.eligibility === 'string'`.
    // An Expression object here does not narrow anything — it makes the whole
    // predicate vanish and every link mint unconditionally.
    expect(typeof POLICY.eligibility).toBe('string');
    expect(POLICY.eligibility.trim().length).toBeGreaterThan(0);
  });

  it('reads only record.-prefixed fields, and every one of them is has()-guarded and real', () => {
    const source: string = POLICY.eligibility;
    const read = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
    expect(read.sort()).toEqual(['audience', 'status']);
    for (const field of read) {
      expect(source, `eligibility reads ${field} unguarded`).toContain(`has(record.${field})`);
      expect(Object.keys(ARTICLE.fields), `eligibility reads unknown field ${field}`).toContain(field);
    }
    // A bare identifier is the #601 spelling and does not evaluate — see the
    // last describe block. Nothing outside `record.` may be referenced.
    expect(source.replace(/record\.\w+|has|"[^"]*"|'[^']*'/g, '')).not.toMatch(/[A-Za-z_]\w*/);
  });

  it('redacts staff-only fields, and each named field exists', () => {
    expect([...(POLICY.redactFields ?? [])].sort())
      .toEqual(['last_reviewed_at', 'owner_id', 'related_to_case']);
    for (const field of POLICY.redactFields) {
      expect(Object.keys(ARTICLE.fields), `redactFields names unknown field ${field}`).toContain(field);
    }
  });
});

// ──────────────────────────────── both halves, on the real service ──

/** Minimal `IHttpServer` — records handlers so the real routes can be driven. */
class TestRouter {
  routes = new Map<string, Function>();
  private add(method: string, path: string, handler: Function) {
    this.routes.set(`${method} ${path}`, handler);
  }
  get(p: string, h: Function) { this.add('GET', p, h); }
  post(p: string, h: Function) { this.add('POST', p, h); }
  put(p: string, h: Function) { this.add('PUT', p, h); }
  delete(p: string, h: Function) { this.add('DELETE', p, h); }
  patch(p: string, h: Function) { this.add('PATCH', p, h); }
  use() { /* no middleware in this harness */ }

  async call(
    method: string,
    pattern: string,
    req: { params?: AnyRec; query?: AnyRec; body?: AnyRec; headers?: AnyRec } = {},
  ): Promise<{ status: number; body: AnyRec }> {
    const handler = this.routes.get(`${method} ${pattern}`);
    if (!handler) throw new Error(`no route registered for ${method} ${pattern}`);
    let status = 200;
    let body: AnyRec = {};
    const res = {
      status(code: number) { status = code; return res; },
      json(payload: AnyRec) { body = payload; return res; },
      send(payload: AnyRec) { body = payload; return res; },
    };
    await handler({ params: {}, query: {}, headers: {}, ...req }, res);
    return { status, body };
  }
}

describe('the two-sided acceptance criterion, on the real ShareLinkService', () => {
  let ql: AnyRec;
  let api: AnyRec;
  let service: AnyRec;
  let router: TestRouter;
  const article: Record<string, string> = {};

  /** Every (status, audience) pair that matters, with the verdict it must get. */
  const FIXTURES: Array<[key: string, status: string, audience: string, eligible: boolean]> = [
    ['published_public',   'published', 'public',   true],
    ['published_internal', 'published', 'internal', false],
    ['draft_public',       'draft',     'public',   false],
    ['draft_internal',     'draft',     'internal', false],
    ['in_review_public',   'in_review', 'public',   false],
    ['archived_public',    'archived',  'public',   false],
  ];

  beforeEach(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_knowledge_article: ARTICLE,
        crm_case: byName('crm_case'),
        crm_account: byName('crm_account'),
        crm_contact: byName('crm_contact'),
        sys_user: SysUser,
        sys_share_link: SysShareLink,
      } as never,
    })) as never;
    api = ql.createContext({ isSystem: true });

    for (const [key, status, audience] of FIXTURES) {
      const row = await api.object('crm_knowledge_article').insert({
        title: `Article ${key}`,
        summary: `Summary for ${key}`,
        body: `Body for ${key}`,
        status,
        audience,
        category: 'how_to',
        language: 'en',
        last_reviewed_at: '2026-08-01T00:00:00.000Z',
      });
      article[key] = row.id;
    }

    service = new (ShareLinkService as any)({ engine: ql });
    router = new TestRouter();
    // The signed-in/anonymous split is decided per request, exactly as a real
    // deployment resolves auth off the request.
    registerShareLinkRoutes(router as never, service as never, ql as never, {
      contextFromRequest: (req: AnyRec) =>
        req.headers?.['x-test-principal'] === 'author' ? SIGNED_IN : ANONYMOUS,
    } as never);
  });

  afterEach(async () => {
    await ql?.close();
  });

  const mint = (key: string, audience = 'public') =>
    service.createLink(
      { object: 'crm_knowledge_article', recordId: article[key], audience },
      SIGNED_IN,
    );

  const refusal = async (key: string, audience = 'public') => {
    let error: AnyRec | undefined;
    try {
      await mint(key, audience);
    } catch (err) {
      error = err as AnyRec;
    }
    return error;
  };

  const linkRowCount = async (key: string) =>
    (await api.object('sys_share_link').find({ where: { record_id: article[key] } })).length;

  // ─────────────────────────────────────── half 1: reachable ──

  it('HALF 1 — an unauthenticated visitor reaches a published, public article', async () => {
    const link = await mint('published_public');
    expect(link.token).toBeTruthy();

    // Resolve with a context of literally `{}` — no principal, no session.
    const res = await router.call('GET', '/api/v1/share-links/:token/resolve', {
      params: { token: link.token },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.record.id).toBe(article['published_public']);
    expect(res.body.data.record.title).toBe('Article published_public');
    expect(res.body.data.record.body).toBe('Body for published_public');
  });

  it('HALF 1 — and the staff-only fields are stripped from what it serves', async () => {
    const link = await mint('published_public');
    const res = await router.call('GET', '/api/v1/share-links/:token/resolve', {
      params: { token: link.token },
    });

    expect(res.status).toBe(200);
    for (const field of POLICY.redactFields as string[]) {
      expect(Object.keys(res.body.data.record), `${field} leaked to an anonymous reader`)
        .not.toContain(field);
    }
    // Proof the redaction is doing work rather than the field being absent: the
    // seeded value IS on the row the engine holds.
    const stored = await api.object('crm_knowledge_article')
      .findOne({ where: { id: article['published_public'] } });
    expect(stored.last_reviewed_at).toBeTruthy();
  });

  // ──────────────────────────── half 2: NOT reachable (the test) ──

  it.each(FIXTURES.filter(([, , , eligible]) => !eligible))(
    'HALF 2 — %s mints NO link: RECORD_NOT_ELIGIBLE, and sys_share_link stays empty',
    async (key) => {
      const error = await refusal(key);
      expect(error, `${key} minted a share link — anonymous access to a non-public article`)
        .toBeDefined();
      expect(error!.code).toBe('RECORD_NOT_ELIGIBLE');
      expect(error!.status).toBe(422);
      expect(await linkRowCount(key)).toBe(0);
    },
  );

  it('HALF 2 — an internal article is refused over the REST create route too, not just in-process', async () => {
    const res = await router.call('POST', '/api/v1/share-links', {
      headers: { 'x-test-principal': 'author' },
      body: { object: 'crm_knowledge_article', recordId: article['published_internal'], audience: 'public' },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RECORD_NOT_ELIGIBLE');
    expect(await linkRowCount('published_internal')).toBe(0);
  });

  it('HALF 2 — a draft is refused over the REST create route too', async () => {
    const res = await router.call('POST', '/api/v1/share-links', {
      headers: { 'x-test-principal': 'author' },
      body: { object: 'crm_knowledge_article', recordId: article['draft_public'], audience: 'public' },
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('RECORD_NOT_ELIGIBLE');
    expect(await linkRowCount('draft_public')).toBe(0);
  });

  it('HALF 2 — there is no token to redeem, so the anonymous route has nothing to serve', async () => {
    await refusal('published_internal');
    await refusal('draft_public');
    const all = await api.object('sys_share_link').find({ where: {} });
    expect(all).toHaveLength(0);
  });

  // ───────────────────────────── the siblings, still enforced ──

  it('refuses an audience the object did not allow', async () => {
    const error = await refusal('published_public', 'signed_in');
    expect(error?.code).toBe('AUDIENCE_NOT_ALLOWED');
    expect(error?.status).toBe(422);
  });

  it('refuses a permission the object did not allow', async () => {
    let error: AnyRec | undefined;
    try {
      await service.createLink(
        { object: 'crm_knowledge_article', recordId: article['published_public'], permission: 'edit' },
        SIGNED_IN,
      );
    } catch (err) { error = err as AnyRec; }
    expect(error?.code).toBe('PERMISSION_NOT_ALLOWED');
    expect(error?.status).toBe(422);
  });

  it('an anonymous caller cannot mint links at all', async () => {
    const res = await router.call('POST', '/api/v1/share-links', {
      body: { object: 'crm_knowledge_article', recordId: article['published_public'] },
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

// ──────────────────────── the evaluator, and the spelling that isn't ──

describe('the eligibility predicate runs on the record-level CEL evaluator', () => {
  const FIELDS = ARTICLE.fields as AnyRec;

  const verdictFor = (source: string, record: AnyRec) => {
    const expr = { dialect: 'cel' as const, source };
    const compiled = ExpressionEngine.compile(expr);
    if (!compiled.ok) return { stage: 'compile' as const, ok: false, value: undefined };
    const v = ExpressionEngine.evaluate(expr, {
      record: materializeDeclaredFields({ ...record }, FIELDS),
    });
    return { stage: 'evaluate' as const, ok: v.ok, value: v.value };
  };

  it('answers true only for published + public, and never aborts', () => {
    const cases: Array<[AnyRec, boolean]> = [
      [{ status: 'published', audience: 'public' }, true],
      [{ status: 'published', audience: 'internal' }, false],
      [{ status: 'draft', audience: 'public' }, false],
      [{ status: 'in_review', audience: 'public' }, false],
      [{ status: 'archived', audience: 'public' }, false],
      [{}, false], // a record with no keys at all — total, not an abort
    ];
    for (const [record, expected] of cases) {
      const v = verdictFor(POLICY.eligibility, record);
      expect(v.ok, `predicate aborted on ${JSON.stringify(record)}`).toBe(true);
      expect(v.value, `wrong verdict for ${JSON.stringify(record)}`).toBe(expected);
    }
  });

  it('#601 spelled it with bare identifiers, which compiles and then never evaluates', () => {
    // Kept as a live assertion rather than a comment: it is the difference
    // between a feature and a feature-shaped no-op. `assertEligible` turns this
    // into ELIGIBILITY_UNEVALUABLE 422 — fail-closed, so not a hole, but no
    // link would ever mint and the object would look correctly configured.
    const v = verdictFor(`status == 'published' && audience == 'public'`, {
      status: 'published',
      audience: 'public',
    });
    expect(v.stage).toBe('evaluate');
    expect(v.ok).toBe(false);
    expect(POLICY.eligibility).not.toBe(`status == 'published' && audience == 'public'`);
  });
});
