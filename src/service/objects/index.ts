// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service object barrel.
 *
 * Re-exports this package's *.object.ts definitions; the `*.hook.ts` files
 * beside them register through `./hooks.ts`. The canonical note on the
 * collaboration capabilities (`enable.files`, `enable.feeds`) that every
 * object in this app points at is written once, in
 * `src/sales/objects/index.ts`.
 */

export { ArticleFeedback } from './article_feedback.object';
export { Case } from './case.object';
export { KnowledgeArticle } from './knowledge_article.object';
