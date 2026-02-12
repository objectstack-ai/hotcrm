import { describe, it, expect } from 'vitest';
import { AgentSchema, RAGPipelineConfigSchema, ModelRegistrySchema, NLQRequestSchema, NLQFieldMappingSchema } from '@objectstack/spec/ai';
import {
  LeadToCloseAgent,
  Customer360Agent,
  ChurnPreventionAgent,
  CaseResolutionAgent,
  TalentAcquisitionAgent,
  RevenueOptimizationAgent,
  AgentDefinitions,
} from '../../../src/agent_definitions';
import { KnowledgeBaseRAG, SalesIntelligenceRAG, RAGPipelines } from '../../../src/rag_pipeline.config';
import { HotCRMModelRegistry } from '../../../src/model_registry.config';
import {
  crmAccountsQuery,
  crmOpportunitiesQuery,
  supportCasesQuery,
  hrPositionsQuery,
  crmFieldMappings,
  supportFieldMappings,
  hrFieldMappings,
  hotcrmNLQConfig,
} from '../../../src/nlq.config';

describe('AI Schema Compliance', () => {
  describe('Agent Definitions', () => {
    const agents = [
      { name: 'LeadToCloseAgent', agent: LeadToCloseAgent },
      { name: 'Customer360Agent', agent: Customer360Agent },
      { name: 'ChurnPreventionAgent', agent: ChurnPreventionAgent },
      { name: 'CaseResolutionAgent', agent: CaseResolutionAgent },
      { name: 'TalentAcquisitionAgent', agent: TalentAcquisitionAgent },
      { name: 'RevenueOptimizationAgent', agent: RevenueOptimizationAgent },
    ];

    it('AgentDefinitions collection should be defined with all 6 agents', () => {
      expect(AgentDefinitions).toBeDefined();
      expect(Object.keys(AgentDefinitions)).toHaveLength(6);
    });

    describe.each(agents)('$name', ({ agent }) => {
      it('should be defined (validated at module load)', () => {
        expect(agent).toBeDefined();
      });

      it('should re-validate against AgentSchema', () => {
        expect(() => AgentSchema.parse(agent)).not.toThrow();
      });
    });
  });

  describe('RAG Pipelines', () => {
    it('RAGPipelines collection should be defined', () => {
      expect(RAGPipelines).toBeDefined();
    });

    it('KnowledgeBaseRAG should re-validate against RAGPipelineConfigSchema', () => {
      expect(() => RAGPipelineConfigSchema.parse(KnowledgeBaseRAG)).not.toThrow();
    });

    it('SalesIntelligenceRAG should re-validate against RAGPipelineConfigSchema', () => {
      expect(() => RAGPipelineConfigSchema.parse(SalesIntelligenceRAG)).not.toThrow();
    });
  });

  describe('Model Registry', () => {
    it('should be defined', () => {
      expect(HotCRMModelRegistry).toBeDefined();
    });

    it('should re-validate against ModelRegistrySchema', () => {
      expect(() => ModelRegistrySchema.parse(HotCRMModelRegistry)).not.toThrow();
    });
  });

  describe('NLQ Config', () => {
    it('hotcrmNLQConfig should be defined', () => {
      expect(hotcrmNLQConfig).toBeDefined();
    });

    it('should contain sampleQueries and fieldMappings', () => {
      expect(hotcrmNLQConfig.sampleQueries).toBeDefined();
      expect(hotcrmNLQConfig.fieldMappings).toBeDefined();
    });

    describe('NLQ Sample Queries', () => {
      const queries = [
        { name: 'crmAccountsQuery', query: crmAccountsQuery },
        { name: 'crmOpportunitiesQuery', query: crmOpportunitiesQuery },
        { name: 'supportCasesQuery', query: supportCasesQuery },
        { name: 'hrPositionsQuery', query: hrPositionsQuery },
      ];

      describe.each(queries)('$name', ({ query }) => {
        it('should be defined (validated at module load)', () => {
          expect(query).toBeDefined();
        });

        it('should re-validate against NLQRequestSchema', () => {
          expect(() => NLQRequestSchema.parse(query)).not.toThrow();
        });
      });
    });

    describe('NLQ Field Mappings', () => {
      const mappings = [
        { name: 'crmFieldMappings', mapping: crmFieldMappings },
        { name: 'supportFieldMappings', mapping: supportFieldMappings },
        { name: 'hrFieldMappings', mapping: hrFieldMappings },
      ];

      describe.each(mappings)('$name', ({ mapping }) => {
        it('should be defined and non-empty', () => {
          expect(mapping).toBeDefined();
          expect(mapping.length).toBeGreaterThan(0);
        });

        it('each entry should validate against NLQFieldMappingSchema', () => {
          for (const entry of mapping) {
            expect(() => NLQFieldMappingSchema.parse(entry)).not.toThrow();
          }
        });
      });
    });
  });
});
