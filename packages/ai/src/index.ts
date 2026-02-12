/**
 * @hotcrm/ai - Unified AI Service Layer
 * 
 * Central AI/ML infrastructure for HotCRM
 * Provides model registry, prediction services, and shared utilities
 */

export { ModelRegistry, ModelConfig, ModelType, ModelProvider } from './model-registry';
export { PredictionService, PredictionRequest, PredictionResponse } from './prediction-service';
export { default as AIUtils } from './utils';

// Provider exports
export * from './providers';

// Cache and monitoring exports
export { CacheManager } from './cache-manager';
export { PerformanceMonitor } from './performance-monitor';
export { ExplainabilityService } from './explainability-service';

// Object exports (disabled until dependencies are resolved)
// export { default as ai_prediction } from './ai_prediction.object';
// export { default as ai_model_performance } from './ai_model_performance.object';

// GenAI Reporting
export {
  processNaturalLanguageQuery,
  parseNaturalLanguageQuery,
  recommendVisualization,
  generateNarrative,
  suggestFollowUps
} from './genai_reporting.action';
export type {
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
  ParsedQuery,
  QueryResult
} from './genai_reporting.action';

// MCP Server Configuration
export { hotcrmMCPServerConfig } from './mcp_server.config';

// Agent Workflows
export {
  AgentWorkflows,
  LeadToClosePipeline,
  Customer360Intelligence,
  ChurnPreventionWorkflow,
  IntelligentCaseResolution,
  TalentAcquisitionPipeline,
  RevenueOptimizationWorkflow,
} from './agent_workflows';
export type { AgentWorkflow, AgentStep } from './agent_workflows';

// Agent Definitions (AgentSchema-validated)
export {
  AgentDefinitions,
  LeadToCloseAgent,
  Customer360Agent,
  ChurnPreventionAgent,
  CaseResolutionAgent,
  TalentAcquisitionAgent,
  RevenueOptimizationAgent,
} from './agent_definitions';

// RAG Pipeline Configurations
export { RAGPipelines, KnowledgeBaseRAG, SalesIntelligenceRAG } from './rag_pipeline.config';

// Model Registry Configuration
export { HotCRMModelRegistry } from './model_registry.config';

// NLQ Configuration
export {
  hotcrmNLQConfig,
  crmAccountsQuery,
  crmOpportunitiesQuery,
  supportCasesQuery,
  hrPositionsQuery,
  crmFieldMappings,
  supportFieldMappings,
  hrFieldMappings,
} from './nlq.config';
export type { NLQConfig } from './nlq.config';

// Performance Benchmarking
export { Benchmark, BenchmarkSuite, formatBenchmarkResults } from './benchmark';
export type { BenchmarkResult, BenchmarkOptions, BenchmarkSuiteEntry } from './benchmark';

// Re-export all utilities
export {
  calculateConfidence,
  normalizeScore,
  weightedAverage,
  sigmoid,
  cosineSimilarity,
  standardDeviation,
  detectOutliers,
  movingAverage,
  exponentialSmoothing,
  calculateTrend,
  minMaxScale,
  zScoreNormalize,
  pearsonCorrelation,
  kMeansClustering
} from './utils';
