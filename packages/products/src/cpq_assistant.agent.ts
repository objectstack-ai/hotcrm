// Agent definition for @objectstack/spec/ai

/**
 * CPQ Assistant Agent
 * Assists with quote configuration, bundle optimization, and pricing strategies.
 * Part of Phase 13D-3: Products Deep Intelligence.
 */
export const CPQAssistantAgent = {
  name: 'cpq_assistant',
  label: 'CPQ Assistant',
  role: 'CPQ Assistant',
  description: 'AI-powered assistant for Configure-Price-Quote workflows including bundle configuration, pricing optimization, and discount validation',

  instructions: `You are an expert CPQ (Configure-Price-Quote) assistant specializing in product configuration, pricing strategy, and quote generation.

Your responsibilities:
1. Guide users through complex product bundle configuration
2. Optimize pricing based on volume, customer tier, and competitive positioning
3. Validate discount requests against approval policies and margin thresholds
4. Generate accurate quotes with proper line items and terms
5. Analyze product fit based on customer needs and usage patterns
6. Ensure configuration rules and compatibility constraints are satisfied

Guidelines:
- Always validate product compatibility before suggesting bundles
- Consider customer tier, contract terms, and volume commitments for pricing
- Flag discount requests that exceed policy thresholds
- Provide margin impact analysis with every pricing recommendation
- Suggest upsell and cross-sell opportunities based on product fit
- Ensure quotes comply with regional pricing and regulatory requirements

Tone: Precise, consultative, and commercially aware.`,

  tools: [
    {
      type: 'action',
      name: 'configureBundle',
      description: 'Configure a product bundle by validating component compatibility and applying configuration rules',
      action: 'configure_bundle',
      parameters: {
        bundle_id: {
          type: 'string',
          required: true,
          description: 'The bundle template ID to configure'
        },
        account_id: {
          type: 'string',
          required: true,
          description: 'Customer account for tier-based configuration'
        },
        selected_components: {
          type: 'array',
          required: false,
          description: 'Pre-selected component product IDs'
        }
      },
      returns: {
        configured_bundle: 'object',
        compatibility_issues: 'array',
        required_additions: 'array',
        total_list_price: 'number',
        configuration_valid: 'boolean'
      }
    },

    {
      type: 'action',
      name: 'optimizePricing',
      description: 'Optimize pricing for a quote based on customer tier, volume, and competitive analysis',
      action: 'optimize_pricing',
      parameters: {
        quote_id: {
          type: 'string',
          required: true,
          description: 'The quote ID to optimize pricing for'
        },
        optimization_goal: {
          type: 'string',
          enum: ['maximize_margin', 'competitive_match', 'volume_discount', 'customer_retention'],
          defaultValue: 'maximize_margin',
          description: 'Pricing optimization strategy'
        }
      },
      returns: {
        optimized_line_items: 'array',
        total_before: 'number',
        total_after: 'number',
        margin_impact: 'number',
        recommendations: 'array'
      }
    },

    {
      type: 'action',
      name: 'validateDiscount',
      description: 'Validate a discount request against approval policies, margin thresholds, and historical patterns',
      action: 'validate_discount',
      parameters: {
        quote_id: {
          type: 'string',
          required: true
        },
        discount_percent: {
          type: 'number',
          required: true,
          description: 'Requested discount percentage'
        },
        justification: {
          type: 'string',
          required: false,
          description: 'Business justification for the discount'
        }
      },
      returns: {
        approved: 'boolean',
        approval_level: 'string',
        margin_after_discount: 'number',
        policy_violations: 'array',
        alternative_suggestions: 'array'
      }
    },

    {
      type: 'action',
      name: 'generateQuote',
      description: 'Generate a complete quote document with line items, terms, and pricing summary',
      action: 'generate_quote',
      parameters: {
        opportunity_id: {
          type: 'string',
          required: true,
          description: 'The opportunity to generate a quote for'
        },
        template: {
          type: 'string',
          enum: ['standard', 'enterprise', 'renewal', 'expansion'],
          defaultValue: 'standard'
        },
        include_options: {
          type: 'boolean',
          defaultValue: true,
          description: 'Include optional line items in the quote'
        }
      },
      returns: {
        quote_id: 'string',
        quote_number: 'string',
        line_items: 'array',
        total_amount: 'number',
        valid_until: 'string',
        terms_and_conditions: 'string'
      }
    },

    {
      type: 'action',
      name: 'analyzeProductFit',
      description: 'Analyze product fit for a customer based on their needs, usage patterns, and industry',
      action: 'analyze_product_fit',
      parameters: {
        account_id: {
          type: 'string',
          required: true
        },
        product_ids: {
          type: 'array',
          required: false,
          description: 'Specific products to evaluate, or all if empty'
        }
      },
      returns: {
        fit_scores: 'array',
        recommended_products: 'array',
        upsell_opportunities: 'array',
        cross_sell_opportunities: 'array',
        reasoning: 'string'
      }
    }
  ],

  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.4,
    maxTokens: 2500,
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
    allowedDomains: ['cpq', 'products', 'pricing', 'quotes', 'orders'],
    restrictedActions: [
      'delete_quote',
      'override_approval_policy',
      'modify_list_prices',
      'bypass_margin_threshold',
      'approve_own_discount'
    ],
    requireApprovalFor: [
      'apply_discount_above_threshold',
      'generate_custom_terms',
      'override_configuration_rule'
    ]
  },

  capabilities: {
    canAccessProductCatalog: true,
    canConfigureBundles: true,
    canOptimizePricing: true,
    canGenerateQuotes: true,
    canUpdateRecords: false,
    canAccessExternalAPIs: true
  },

  examples: [
    {
      user: 'Configure the Enterprise Cloud bundle for Acme Corp with 500 users',
      assistant: '[Using configureBundle tool]\n\n📦 **Bundle Configuration - Enterprise Cloud (Acme Corp)**\n- Base Platform: Enterprise Edition ✅\n- User Licenses: 500 seats\n- Required Add-ons: SSO Module (auto-included for Enterprise)\n\n[Using optimizePricing tool]\n\n💰 **Pricing Summary:**\n- List Price: $150,000/yr\n- Volume Discount (500+ seats): -12%\n- Customer Tier (Gold): -5%\n- **Optimized Price: $124,950/yr** ($20.83/user/mo)\n\n⚡ **Recommendation**: Adding the Analytics Module (+$15K) would increase adoption by 34% based on similar deployments.'
    },
    {
      user: 'Can we offer a 35% discount on this quote?',
      assistant: '[Using validateDiscount tool]\n\n⚠️ **Discount Validation - 35% Requested**\n- Policy Threshold: 25% (Manager), 35% (VP), 40% (SVP)\n- Margin After Discount: 18.2% (below 20% floor)\n\n🔴 **Status: Requires VP Approval**\n- Exceeds manager authority by 10 points\n- Margin falls below minimum threshold\n\n💡 **Alternatives:**\n1. 28% discount + 3-year term commitment → maintains 22% margin\n2. 30% discount + reduced support tier → maintains 21% margin\n3. 25% discount + value-add training package ($0 cost) → perceived 32% value'
    }
  ],

  monitoring: {
    trackUsage: true,
    trackLatency: true,
    trackAccuracy: true,
    feedbackLoop: true
  }
};

export default CPQAssistantAgent;
