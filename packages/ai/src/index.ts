/**
 * @hotcrm/ai - Unified AI Service Layer
 * 
 * Central AI/ML infrastructure for HotCRM
 * Provides model registry, prediction services, and shared utilities
 */

export { ModelRegistry, ModelConfig, ModelType, ModelProvider } from './model-registry.js';
export { PredictionService, PredictionRequest, PredictionResponse } from './prediction-service.js';
export { default as AIUtils } from './utils.js';

// Provider exports
export * from './providers/index.js';

// Cache and monitoring exports
export { CacheManager } from './cache-manager.js';
export { PerformanceMonitor } from './performance-monitor.js';
export { ExplainabilityService } from './explainability-service.js';

// Object exports (disabled until dependencies are resolved)
// export { default as ai_prediction } from './ai_prediction.object.js';
// export { default as ai_model_performance } from './ai_model_performance.object.js';

// GenAI Reporting
export {
  processNaturalLanguageQuery,
  parseNaturalLanguageQuery,
  recommendVisualization,
  generateNarrative,
  suggestFollowUps
} from './genai_reporting.action.js';
export type {
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResponse,
  ParsedQuery,
  QueryResult
} from './genai_reporting.action.js';

// MCP Server Configuration
export { hotcrmMCPServerConfig } from './mcp_server.config.js';

// Agent Workflows
export {
  AgentWorkflows,
  LeadToClosePipeline,
  Customer360Intelligence,
  ChurnPreventionWorkflow,
  IntelligentCaseResolution,
  TalentAcquisitionPipeline,
  RevenueOptimizationWorkflow,
} from './agent_workflows.js';
export type { AgentWorkflow, AgentStep } from './agent_workflows.js';

// Agent Definitions (AgentSchema-validated)
export {
  AgentDefinitions,
  LeadToCloseAgent,
  Customer360Agent,
  ChurnPreventionAgent,
  CaseResolutionAgent,
  TalentAcquisitionAgent,
  RevenueOptimizationAgent,
} from './agent_definitions.js';

// RAG Pipeline Configurations
export { RAGPipelines, KnowledgeBaseRAG, SalesIntelligenceRAG } from './rag_pipeline.config.js';

// Model Registry Configuration
export { HotCRMModelRegistry } from './model_registry.config.js';

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
} from './nlq.config.js';
export type { NLQConfig } from './nlq.config.js';

// AI Orchestrations
export { SalesOrchestration } from './sales_orchestration.orchestration.js';
export { SupportOrchestration } from './support_orchestration.orchestration.js';

// Predictive Models
export { LeadScoringModel } from './lead_scoring.predictive.js';
export { ChurnPredictionModel } from './churn_prediction.predictive.js';
export { DealForecastModel } from './deal_forecast.predictive.js';

// Performance Benchmarking
export { Benchmark, BenchmarkSuite, formatBenchmarkResults } from './benchmark.js';
export type { BenchmarkResult, BenchmarkOptions, BenchmarkSuiteEntry } from './benchmark.js';

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
} from './utils.js';
