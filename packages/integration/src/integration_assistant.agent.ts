// Agent definition for @objectstack/spec/ai

/**
 * Integration Assistant Agent
 * Assists with connector setup, field mapping, sync troubleshooting, and optimization.
 * Part of Phase 13D-7: Integration Cloud.
 */
export const IntegrationAssistantAgent = {
  name: 'integration_assistant',
  label: 'Integration Assistant',
  role: 'Integration Assistant',
  description: 'Integration intelligence agent that assists with connector setup, field mapping configuration, sync troubleshooting, and webhook validation',

  instructions: `You are an expert integration assistant specializing in connector setup, data synchronization, and API management.

Your responsibilities:
1. Diagnose connection issues and suggest fixes for authentication or network errors
2. Suggest optimal field mappings between source and target systems
3. Analyze sync error patterns and recommend corrective actions
4. Validate webhook configurations and payload structures
5. Optimize sync schedules based on data volume and API rate limits
6. Provide guidance on best practices for data integration

Guidelines:
- Always verify connection health before suggesting changes
- Prioritize data integrity and consistency
- Consider API rate limits and throttling when recommending sync schedules
- Suggest field mappings based on data type compatibility and naming conventions
- Flag potential data loss scenarios proactively
- Recommend retry strategies for transient failures

Tone: Technical, precise, and solution-oriented.`,

  tools: [
    {
      type: 'action',
      name: 'diagnoseConnection',
      description: 'Diagnose connection issues by testing endpoint availability, authentication, and network configuration',
      action: 'connection_diagnosis',
      parameters: {
        connector_id: {
          type: 'string',
          required: true,
          description: 'The connector ID to diagnose'
        },
        include_network_trace: {
          type: 'boolean',
          defaultValue: false,
          description: 'Include detailed network trace in diagnosis'
        }
      },
      returns: {
        status: 'string',
        latency_ms: 'number',
        auth_valid: 'boolean',
        issues: 'array',
        recommendations: 'array'
      }
    },

    {
      type: 'action',
      name: 'suggestFieldMapping',
      description: 'Suggest optimal field mappings between source and target objects based on data types and naming conventions',
      action: 'field_mapping_suggestion',
      parameters: {
        source_object: {
          type: 'string',
          required: true,
          description: 'Source object name'
        },
        target_object: {
          type: 'string',
          required: true,
          description: 'Target object name'
        },
        confidence_threshold: {
          type: 'number',
          defaultValue: 0.7,
          description: 'Minimum confidence score for mapping suggestions'
        }
      },
      returns: {
        mappings: 'array',
        unmapped_source_fields: 'array',
        unmapped_target_fields: 'array',
        confidence_scores: 'object'
      }
    },

    {
      type: 'action',
      name: 'analyzeSyncErrors',
      description: 'Analyze sync error patterns and recommend corrective actions for failed synchronizations',
      action: 'sync_error_analysis',
      parameters: {
        sync_config_id: {
          type: 'string',
          required: true,
          description: 'The sync configuration ID to analyze'
        },
        time_range: {
          type: 'string',
          enum: ['1h', '24h', '7d', '30d'],
          defaultValue: '24h',
          description: 'Time range for error analysis'
        }
      },
      returns: {
        error_count: 'number',
        error_categories: 'array',
        root_causes: 'array',
        recommendations: 'array',
        trend: 'string'
      }
    },

    {
      type: 'action',
      name: 'validateWebhook',
      description: 'Validate webhook configuration including endpoint availability, payload structure, and security settings',
      action: 'webhook_validation',
      parameters: {
        webhook_id: {
          type: 'string',
          required: true,
          description: 'The webhook subscription ID to validate'
        }
      },
      returns: {
        endpoint_reachable: 'boolean',
        ssl_valid: 'boolean',
        payload_valid: 'boolean',
        security_score: 'number',
        issues: 'array'
      }
    },

    {
      type: 'action',
      name: 'optimizeSyncSchedule',
      description: 'Optimize sync schedule based on data volume, API rate limits, and system load patterns',
      action: 'sync_schedule_optimization',
      parameters: {
        connector_id: {
          type: 'string',
          required: true,
          description: 'The connector ID to optimize scheduling for'
        },
        optimization_goal: {
          type: 'string',
          enum: ['freshness', 'efficiency', 'balanced'],
          defaultValue: 'balanced',
          description: 'Optimization priority'
        }
      },
      returns: {
        recommended_interval: 'string',
        recommended_window: 'object',
        estimated_api_usage: 'number',
        current_vs_optimal: 'object',
        reasoning: 'string'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000,
    topP: 1.0
  },

  memory: {
    type: 'conversational',
    maxMessages: 15,
    summaryThreshold: 12,
    persistAcrossSessions: true
  },

  safety: {
    enableContentFilter: true,
    allowedDomains: ['integration', 'connector_management', 'data_sync'],
    restrictedActions: [
      'delete_connection',
      'modify_credentials',
      'access_api_keys'
    ],
    requireApprovalFor: [
      'update_sync_schedule',
      'modify_field_mapping',
      'enable_webhook'
    ]
  },

  capabilities: {
    canDiagnoseConnections: true,
    canSuggestMappings: true,
    canAnalyzeErrors: true,
    canValidateWebhooks: true,
    canOptimizeSchedules: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'My Salesforce connector keeps failing with auth errors',
      assistant: '[Using diagnoseConnection tool]\n\n🔍 **Connection Diagnosis - Salesforce Connector**\n- Status: 🔴 Authentication Failed\n- Last Successful Auth: 3 hours ago\n- Error: OAuth refresh token expired\n\n🎯 **Recommended Actions:**\n1. **Re-authorize the connection** - Your OAuth refresh token has expired. Navigate to connector settings and click "Re-authorize".\n2. **Enable token auto-refresh** - Set up automatic token renewal before expiry.\n3. **Check API permissions** - Verify the connected app still has required scopes.\n\n⚡ **Impact**: 47 records pending sync will resume after re-authorization.'
    },
    {
      user: 'Help me map fields between our HubSpot contacts and CRM accounts',
      assistant: '[Using suggestFieldMapping tool]\n\n📋 **Field Mapping Suggestions - HubSpot → CRM**\n- Confidence: High (92%)\n\n✅ **Auto-Mapped (8 fields):**\n1. `company_name` → `name` (99%)\n2. `email` → `primary_email` (98%)\n3. `phone` → `phone` (97%)\n4. `website` → `website` (96%)\n\n⚠️ **Review Required (3 fields):**\n1. `lifecyclestage` → `account_type` (72%) - Values may need transformation\n2. `annual_revenue` → `annual_revenue` (85%) - Currency format differs\n\n❌ **Unmapped Source Fields:** `hs_object_id`, `custom_score`\n\nWould you like me to set up value transformations for the review items?'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default IntegrationAssistantAgent;
