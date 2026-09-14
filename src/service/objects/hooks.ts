// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Service hook registrations. See `src/sales/objects/hooks.ts` for why these
 * are named re-exports rather than an assembled array, and why a `*.hook.ts`
 * lives beside the `*.object.ts` it names.
 */

export { default as articleFeedbackHook } from './article_feedback.hook';
export { default as caseHook } from './case.hook';
export { default as knowledgeArticleHook } from './knowledge_article.hook';
