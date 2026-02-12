/**
 * Model Registry Configuration
 *
 * Defines the central AI model registry for HotCRM,
 * validated against the @objectstack/spec ModelRegistrySchema.
 */

import { ModelRegistrySchema } from '@objectstack/spec/ai';
import type { ModelRegistry as ModelRegistryType } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// HotCRM Model Registry
// ---------------------------------------------------------------------------

export const HotCRMModelRegistry: ModelRegistryType = ModelRegistrySchema.parse({
  name: 'hotcrm_models',
  defaultModel: 'gpt-4',
  enableAutoFallback: true,
  models: {
    'gpt-4': {
      model: {
        id: 'gpt-4',
        name: 'GPT-4',
        version: '2024-04-09',
        provider: 'openai',
        description: 'Complex reasoning and multi-step analysis',
        capabilities: {
          textGeneration: true,
          textEmbedding: false,
          imageGeneration: false,
          imageUnderstanding: true,
          functionCalling: true,
          codeGeneration: true,
          reasoning: true,
        },
        limits: {
          maxTokens: 8192,
          contextWindow: 128000,
        },
        pricing: {
          currency: 'USD',
          inputCostPer1kTokens: 0.03,
          outputCostPer1kTokens: 0.06,
        },
        deprecated: false,
        tags: ['reasoning', 'complex', 'flagship'],
        recommendedFor: ['agent_orchestration', 'deal_analysis', 'case_resolution'],
      },
      status: 'active',
      priority: 10,
      fallbackModels: ['gpt-4o-mini'],
    },
    'gpt-4o-mini': {
      model: {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        version: '2024-07-18',
        provider: 'openai',
        description: 'Fast and cost-effective for simple tasks',
        capabilities: {
          textGeneration: true,
          textEmbedding: false,
          imageGeneration: false,
          imageUnderstanding: true,
          functionCalling: true,
          codeGeneration: true,
          reasoning: false,
        },
        limits: {
          maxTokens: 16384,
          contextWindow: 128000,
        },
        pricing: {
          currency: 'USD',
          inputCostPer1kTokens: 0.00015,
          outputCostPer1kTokens: 0.0006,
        },
        deprecated: false,
        tags: ['fast', 'cost-effective', 'lightweight'],
        recommendedFor: ['classification', 'summarisation', 'simple_queries'],
      },
      status: 'active',
      priority: 5,
      fallbackModels: ['gpt-4'],
    },
    'text-embedding-3-small': {
      model: {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        version: '2024-01-25',
        provider: 'openai',
        description: 'Efficient embedding model for vector search and RAG',
        capabilities: {
          textGeneration: false,
          textEmbedding: true,
          imageGeneration: false,
          imageUnderstanding: false,
          functionCalling: false,
          codeGeneration: false,
          reasoning: false,
        },
        limits: {
          maxTokens: 8191,
          contextWindow: 8191,
        },
        pricing: {
          currency: 'USD',
          embeddingCostPer1kTokens: 0.00002,
        },
        deprecated: false,
        tags: ['embedding', 'vector-search', 'rag'],
        recommendedFor: ['knowledge_search', 'semantic_similarity', 'rag_pipeline'],
      },
      status: 'active',
      priority: 10,
    },
  },
});

export default HotCRMModelRegistry;
