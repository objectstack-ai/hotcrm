// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { cases, knowledgeArticles } from '../src/service/data/service.seed';
import { casesZhCN } from '../src/service/data/service.zh-CN.seed';
import { knowledgeArticlesZhCN } from '../src/service/data/knowledge.zh-CN.seed';

type Rec = Record<string, any>;

/**
 * The seeded deflection example names a published, public article (#2527).
 *
 * The one seeded case resolved out of the knowledge base named `API Rate
 * Limits`, a draft internal article whose body ends "(DRAFT) … numbers
 * pending final review". The Service dashboard's Top Resolving Articles
 * therefore ranked an unreviewed draft first on every fresh tenant, and the
 * Knowledge manual tells a manager the top rows are the articles most worth
 * maintaining. The link now sits on the CSV import request, answered with
 * the published public import article; the rate-limit case, resolved by
 * raising the customer's tier, names none.
 *
 * Both seeds are checked: the zh-CN twin maps the title through
 * `zhArticleTitle`, so it must land on the twin of the same article.
 */
const linked = (caseRows: Rec[], articleRows: Rec[]) =>
  caseRows.filter((c) => c.resolved_by_article).map((c) => {
    const article = articleRows.find((a) => a.title === c.resolved_by_article);
    return { subject: c.subject, title: c.resolved_by_article, status: article?.status, audience: article?.audience };
  });

describe('the seeded deflection example (#2527)', () => {
  it('en: every resolving article is published and public, and there is one to rank', () => {
    const rows = linked(cases.records as Rec[], knowledgeArticles.records as Rec[]);
    expect(rows).toEqual([{
      subject: 'Request: bulk import via CSV', title: 'Importing Your First Accounts and Contacts',
      status: 'published', audience: 'public',
    }]);
  });

  it('zh-CN: the twin links the twin of the same published article', () => {
    const rows = linked(casesZhCN.records as Rec[], knowledgeArticlesZhCN.records as Rec[]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'published', audience: 'public' });
    expect(rows[0]!.title).not.toBe('Importing Your First Accounts and Contacts');
  });
});
