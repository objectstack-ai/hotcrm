/**
 * RAG Pipeline Configurations
 *
 * Defines RAG (Retrieval-Augmented Generation) pipelines for HotCRM,
 * validated against the @objectstack/spec RAGPipelineConfigSchema.
 */

import { RAGPipelineConfigSchema } from '@objectstack/spec/ai';
import type { RAGPipelineConfig } from '@objectstack/spec/ai';

// ---------------------------------------------------------------------------
// 1. Knowledge Base RAG - Support knowledge article search
// ---------------------------------------------------------------------------

export const KnowledgeBaseRAG: RAGPipelineConfig = RAGPipelineConfigSchema.parse({
  name: 'knowledge_base_rag',
  label: 'Knowledge Base RAG',
  description: 'RAG pipeline for semantic search across support knowledge articles',
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
  },
  vectorStore: {
    provider: 'pinecone',
    indexName: 'hotcrm-knowledge-base',
    dimensions: 1536,
    metric: 'cosine',
    batchSize: 100,
    connectionPoolSize: 10,
    timeout: 30000,
  },
  chunking: {
    type: 'markdown' as const,
    maxChunkSize: 800,
    respectHeaders: true,
    respectCodeBlocks: true,
  },
  retrieval: {
    type: 'similarity' as const,
    topK: 5,
    scoreThreshold: 0.7,
  },
  maxContextTokens: 4000,
  enableCache: true,
  cacheTTL: 3600,
  cacheInvalidationStrategy: 'on_update',
});

// ---------------------------------------------------------------------------
// 2. Sales Intelligence RAG - CRM context enrichment
// ---------------------------------------------------------------------------

export const SalesIntelligenceRAG: RAGPipelineConfig = RAGPipelineConfigSchema.parse({
  name: 'sales_intelligence_rag',
  label: 'Sales Intelligence RAG',
  description: 'RAG pipeline for sales context enrichment using CRM data, deal history, and market intelligence',
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
  },
  vectorStore: {
    provider: 'pinecone',
    indexName: 'hotcrm-sales-intelligence',
    dimensions: 1536,
    metric: 'cosine',
    batchSize: 100,
    connectionPoolSize: 10,
    timeout: 30000,
  },
  chunking: {
    type: 'semantic' as const,
    minChunkSize: 150,
    maxChunkSize: 1000,
  },
  retrieval: {
    type: 'similarity' as const,
    topK: 8,
    scoreThreshold: 0.65,
  },
  maxContextTokens: 6000,
  enableCache: true,
  cacheTTL: 1800,
  cacheInvalidationStrategy: 'time_based',
});

// ---------------------------------------------------------------------------
// Collection Export
// ---------------------------------------------------------------------------

export const RAGPipelines = {
  knowledgeBase: KnowledgeBaseRAG,
  salesIntelligence: SalesIntelligenceRAG,
};

export default RAGPipelines;
