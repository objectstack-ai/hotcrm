# @hotcrm/support

Customer Service & Support module for HotCRM - Complete omnichannel case management, SLA tracking, knowledge base, and AI-powered intelligent routing.

## Overview

This package provides comprehensive customer support functionality including multi-channel case management, SLA tracking with breach prediction, intelligent routing, knowledge base with RAG capabilities, and customer portal/community features.

**Package Stats:** 21 Objects | 3 AI Actions | 2 Automation Hook Modules (6 Hooks)

## What's Included

### Business Objects (21 Total)

#### Core Case Management
| Object | Label | Description |
|--------|-------|-------------|
| **case** | Case | Multi-channel cases (Email, Web, Phone, WeChat, Chat, Mobile, Walk-in) with SLA tracking, AI routing, priority/escalation workflows, CSAT tracking, intelligent solution recommendations |
| **case_comment** | Case Comment | Comments, responses, interaction history with sentiment analysis, threading, internal/external visibility, rich text support |

#### Knowledge Management
| Object | Label | Description |
|--------|-------|-------------|
| **knowledge_article** | Knowledge Article | Knowledge base articles with AI scoring, quality metrics, multi-language support, version control, approval workflows, RAG-ready with vector embeddings |

#### SLA & Commitment Management
| Object | Label | Description |
|--------|-------|-------------|
| **sla_template** | SLA Template | Service level templates defining response and resolution time targets by priority |
| **sla_policy** | SLA Policy | Comprehensive SLA policies with multi-tier support (Platinum, Gold, Silver, Bronze, Standard), escalation automation, entitlement rules |
| **sla_milestone** | SLA Milestone | Milestone tracking for case lifecycle events (First Response, In Progress, Resolution) with violation monitoring |

#### Routing & Assignment
| Object | Label | Description |
|--------|-------|-------------|
| **queue** | Queue | Support team queues with 3 routing methods (Round Robin, Skill-Based, AI-Powered), load balancing, overflow handling |
| **queue_member** | Queue Member | Agent assignments with workload tracking, performance metrics, availability status |
| **routing_rule** | Routing Rule | Intelligent routing rules with AI classification, priority-based routing, time-based routing, escalation triggers |
| **skill** | Skill | Skill definitions for skill-based routing with certification requirements, proficiency levels |
| **agent_skill** | Agent Skill | Agent proficiency levels (1-5) with training records, certification management, last assessment dates |

#### Business Configuration
| Object | Label | Description |
|--------|-------|-------------|
| **business_hours** | Business Hours | Working hours calendar for SLA calculations with timezone support, 24/7 option, holiday exclusions |
| **holiday_calendar** | Holiday Calendar | Holiday management for business hours exclusions with regional support |
| **holiday** | Holiday | Individual holiday definitions with recurring support (Annual, One-Time, Floating) |
| **escalation_rule** | Escalation Rule | Automatic escalation based on SLA violations, priority thresholds, age criteria, condition-based triggers |

#### Customer Portal & Community
| Object | Label | Description |
|--------|-------|-------------|
| **portal_user** | Portal User | Customer portal access with tier-based permissions (Basic, Premium, Enterprise), case submission, knowledge access |
| **forum_topic** | Forum Topic | Community forum discussion topics with categories, moderation, pinning, view/reply counts |
| **forum_post** | Forum Post | Forum post replies with voting (helpful/not helpful), quality scoring, spam detection, moderation |

#### Case Intake Channels
| Object | Label | Description |
|--------|-------|-------------|
| **email_to_case** | Email to Case | Email-to-case automation with threading, AI categorization, spam detection, attachment handling, auto-response |
| **web_to_case** | Web to Case | Web form configuration for case submission with CAPTCHA, spam protection, field mapping, auto-assignment |
| **social_media_case** | Social Media Case | Social platform integration (WeChat, WhatsApp, Twitter, Facebook, Instagram, LinkedIn) with sentiment analysis, auto-response |

### AI Actions (3 Total)

| Action | Purpose |
|--------|---------|
| **case_ai** | Auto-categorization, intelligent assignment (skill-based, workload-based, AI-powered), knowledge RAG (semantic search), SLA breach prediction, sentiment analysis, solution recommendations |
| **knowledge_ai** | Article recommendations (context-aware, similar articles), auto-tagging with categories, quality scoring (0-100), RAG-based answer generation, gap analysis (missing documentation), search analytics |
| **sla_prediction** | Breach probability prediction (0-100%), resolution time estimation, proactive escalation triggers, workload optimization, agent performance analytics, compliance trend analysis |

### Automation Hooks (2 Modules, 6 Total Hooks)

#### **case.hook.ts** (1 Hook)
| Hook | Triggers | Purpose |
|------|----------|---------|
| **CaseEntitlementCheck** | beforeInsert | Verifies account contracts, applies appropriate SLA level (Platinum/Gold/Silver/Bronze/Standard), calculates target resolution dates based on business hours |

#### **knowledge.hook.ts** (5 Hooks)
| Hook | Triggers | Purpose |
|------|----------|---------|
| **KnowledgeArticleScoringTrigger** | beforeInsert, beforeUpdate | Calculates quality score (structure, completeness, readability) and popularity score (views, usage in cases) |
| **KnowledgeArticleAIEnhancementTrigger** | afterInsert, afterUpdate | Auto-categorization, intelligent tagging, summary generation, keyword extraction |
| **KnowledgeArticleWorkflowTrigger** | afterUpdate | Auto-archival of outdated articles, review reminders, version tracking, approval workflow automation |
| **KnowledgeArticleUsageTracker** | afterUpdate | Tracks article usage in case resolution, effectiveness measurement, ROI calculation |
| **KnowledgeArticleSearchAnalytics** | afterFind | Search pattern tracking, query analysis, gap identification, trending topics |

## Business Capabilities

### 🎯 Omnichannel Case Management
- **7 Intake Channels**: Email, Web, Phone, WeChat, Chat Bot, Mobile App, Walk-in
- **Case Lifecycle**: New → Assigned → In Progress → On Hold → Escalated → Resolved → Closed
- **Priority Management**: 5 levels (P1-Critical to P5-Low) with auto-escalation
- **Multi-Language Support**: Global customer support in multiple languages
- **CSAT Tracking**: Built-in customer satisfaction measurement and feedback
- **Case Threading**: Related cases, parent-child relationships, email threading

### ⏱️ SLA Management & Breach Prevention
- **5 SLA Tiers**: Platinum (1h/4h), Gold (2h/8h), Silver (4h/16h), Bronze (8h/24h), Standard (24h/72h)
- **Milestone Tracking**: First Response, In Progress, Resolution with violation monitoring
- **Business Hours Calendar**: Timezone-aware SLA calculation with holiday exclusions
- **Breach Prediction**: ML-based prediction of SLA violations (0-100% probability)
- **Auto-Escalation**: Automatic escalation when SLA at risk or violated
- **Compliance Analytics**: SLA performance trending and compliance reporting

### 🤖 AI-Powered Intelligence
- **Auto-Categorization**: Automatically categorize cases by type/reason using NLP
- **Intelligent Assignment**: Skill-based, workload-balanced, AI-powered routing to best agent
- **Solution Recommendations**: RAG-based knowledge article suggestions from case description
- **Sentiment Analysis**: Detect customer sentiment (positive, neutral, negative, urgent)
- **SLA Breach Prediction**: Predict which cases will breach SLA with confidence levels
- **Knowledge Gap Analysis**: Identify missing documentation based on case patterns
- **Resolution Time Estimation**: Predict how long case will take to resolve

### 📚 Knowledge Management & RAG
- **Article Lifecycle**: Draft → In Review → Published → Archived
- **Quality Scoring**: AI-calculated quality score (0-100) based on structure, completeness, readability
- **Popularity Metrics**: View counts, usage in case resolution, helpfulness ratings
- **Auto-Tagging**: AI-powered categorization and tag suggestions
- **Multi-Language**: Support for international knowledge bases
- **Version Control**: Track article revisions with approval workflows
- **RAG-Ready**: Vector embeddings for semantic search and answer generation
- **Search Analytics**: Track what customers search for, identify trending topics

### 👥 Agent Management & Routing
- **3 Routing Methods**: Round Robin, Skill-Based, AI-Powered
- **Skill Proficiency**: 5-level proficiency (1-Beginner to 5-Expert) tracking
- **Workload Balancing**: Distribute cases based on agent capacity and availability
- **Queue Management**: Team-based queues with overflow handling
- **Performance Metrics**: Track agent SLA compliance, resolution time, CSAT scores
- **Certification Tracking**: Manage agent certifications and training records

### 🌐 Customer Portal & Community
- **Self-Service Portal**: Customers can submit cases, search knowledge base, track status
- **3 User Tiers**: Basic, Premium, Enterprise with different permission levels
- **Community Forum**: Public discussion forums with topics, posts, voting
- **Moderation Tools**: Flag inappropriate content, pin important topics
- **Knowledge Access**: Role-based access to internal vs public articles

### 📊 Analytics & Reporting
- **SLA Compliance**: Track response and resolution time compliance by tier
- **Agent Performance**: Individual and team performance metrics
- **Channel Analytics**: Volume and performance by intake channel
- **Knowledge Effectiveness**: Article usage, helpfulness, gap analysis
- **Customer Satisfaction**: CSAT trends by category, agent, product
- **Trending Issues**: Identify common problems and patterns

## Usage

### Importing Schemas
```typescript
import { 
  Case,
  CaseComment,
  KnowledgeArticle,
  SLAPolicy,
  Queue,
  PortalUser,
  EscalationRule
} from '@hotcrm/support';

console.log(Case.label); // "Case"
console.log(KnowledgeArticle.label); // "Knowledge Article"
```

### Working with Cases
```typescript
import { db } from '@hotcrm/core';

// Create a case (auto-checks entitlement and assigns SLA)
const supportCase = await db.create('case', {
  account: 'acc_123',
  contact: 'cont_456',
  subject: 'Unable to login to system',
  description: 'Getting error message when trying to login',
  priority: 'High',
  origin: 'Email',
  type: 'Problem',
  category: 'Technical'
});
// → CaseEntitlementCheck hook: Verifies contract, applies SLA (e.g., Gold: 2h/8h), calculates target dates

// Add a comment
const comment = await db.create('case_comment', {
  case: supportCase.id,
  comment: 'Investigated issue, found authentication service down',
  is_internal: true,
  sentiment: 'neutral'
});

// Close case with resolution
await db.update('case', supportCase.id, {
  status: 'Resolved',
  resolution: 'Restarted authentication service, issue fixed'
});
```

### Using AI Actions
```typescript
import { 
  autoCategorizeCasе,
  assignCaseIntelligently,
  recommendKnowledgeArticles,
  predictSLABreach,
  analyzeSentiment
} from '@hotcrm/support';

// Auto-categorize case
const categorization = await autoCategorizeCase({
  caseId: 'case_123',
  subject: 'Unable to login',
  description: 'Getting authentication error'
});
console.log(categorization.type); // 'Problem'
console.log(categorization.category); // 'Technical'
console.log(categorization.reason); // 'Login Issue'
console.log(categorization.confidence); // 0.95

// Intelligent case assignment
const assignment = await assignCaseIntelligently({
  caseId: 'case_123',
  routingMethod: 'AI-Powered'
});
console.log(assignment.assignedAgent); // Best available agent
console.log(assignment.reasoning); // Why this agent
console.log(assignment.skillMatch); // Skill match score (0-100)

// Recommend knowledge articles (RAG)
const articleRecs = await recommendKnowledgeArticles({
  caseId: 'case_123',
  query: 'login authentication error',
  topN: 5
});
console.log(articleRecs.articles); // Top 5 relevant articles
console.log(articleRecs.relevanceScores); // Semantic similarity scores
console.log(articleRecs.suggestedAnswer); // RAG-generated answer

// Predict SLA breach
const breachPrediction = await predictSLABreach({
  caseId: 'case_123'
});
console.log(breachPrediction.probability); // 0-100%
console.log(breachPrediction.estimatedResolutionTime); // Hours
console.log(breachPrediction.recommendation); // 'Escalate immediately'
console.log(breachPrediction.riskFactors); // Contributing factors

// Analyze sentiment
const sentiment = await analyzeSentiment({
  text: 'This is extremely frustrating! I need help NOW!'
});
console.log(sentiment.sentiment); // 'negative'
console.log(sentiment.urgency); // 'high'
console.log(sentiment.emotionScores); // { anger: 0.8, frustration: 0.9 }
```

### Knowledge Management
```typescript
import { 
  scoreArticleQuality,
  generateArticleTags,
  analyzeKnowledgeGaps,
  generateAnswerFromRAG
} from '@hotcrm/support';

// Create knowledge article (auto-scored and tagged)
const article = await db.create('knowledge_article', {
  title: 'How to Reset Your Password',
  content: '1. Click Forgot Password...',
  category: 'Authentication',
  status: 'Published',
  visibility: 'Public'
});
// → KnowledgeArticleScoringTrigger: Calculates quality score
// → KnowledgeArticleAIEnhancementTrigger: Auto-tags, generates summary

// Get AI-generated answer from knowledge base
const ragAnswer = await generateAnswerFromRAG({
  query: 'How do I reset my password?',
  context: 'User cannot login'
});
console.log(ragAnswer.answer); // Generated answer from articles
console.log(ragAnswer.sourceArticles); // Referenced articles
console.log(ragAnswer.confidence); // Answer confidence (0-100)

// Analyze knowledge gaps
const gaps = await analyzeKnowledgeGaps({
  period: 'last_30_days'
});
console.log(gaps.missingTopics); // Topics with no articles but high search volume
console.log(gaps.outdatedArticles); // Articles needing updates
console.log(gaps.lowQualityArticles); // Articles with quality score < 60
console.log(gaps.recommendations); // Suggested new articles
```

### SLA and Escalation
```typescript
import { 
  calculateSLATargets,
  predictResolutionTime,
  optimizeAgentWorkload
} from '@hotcrm/support';

// Calculate SLA targets based on contract
const slaTargets = await calculateSLATargets({
  accountId: 'acc_123',
  priority: 'High',
  createdDate: new Date()
});
console.log(slaTargets.tier); // 'Gold'
console.log(slaTargets.responseTarget); // 2 hours from now
console.log(slaTargets.resolutionTarget); // 8 hours from now

// Predict resolution time
const prediction = await predictResolutionTime({
  caseId: 'case_123'
});
console.log(prediction.estimatedHours); // 3.5
console.log(prediction.confidence); // 85%
console.log(prediction.factors); // Complexity, agent skill, similar cases

// Optimize agent workload
const workloadOptimization = await optimizeAgentWorkload({
  queueId: 'queue_tech_support'
});
console.log(workloadOptimization.recommendations); // Reassign cases, add agents
console.log(workloadOptimization.agentUtilization); // Current workload by agent
console.log(workloadOptimization.projectedBreaches); // Cases at risk
```

### Hooks Auto-Trigger (No Code Required)
```typescript
// When case is created, entitlement is automatically checked
await db.create('case', {
  account: 'acc_123',
  subject: 'Issue with product',
  priority: 'High'
});
// → CaseEntitlementCheck hook:
//   1. Looks up account's contract/entitlement
//   2. Determines SLA tier (e.g., Platinum)
//   3. Calculates response target (1 hour)
//   4. Calculates resolution target (4 hours)
//   5. Factors in business hours and holidays

// When knowledge article is created/updated, AI enhancements trigger
await db.create('knowledge_article', {
  title: 'Troubleshooting Guide',
  content: 'Step-by-step instructions...'
});
// → KnowledgeArticleScoringTrigger: Calculates quality (0-100)
// → KnowledgeArticleAIEnhancementTrigger:
//   - Auto-categorizes article
//   - Generates tags
//   - Creates summary
//   - Extracts keywords

// When article is used to resolve case, usage is tracked
await db.update('case', caseId, {
  status: 'Resolved',
  resolution_article: articleId
});
// → KnowledgeArticleUsageTracker: Increments usage count, tracks effectiveness

// Knowledge search triggers analytics
await db.find('knowledge_article', {
  search: 'password reset'
});
// → KnowledgeArticleSearchAnalytics: Tracks search query, identifies patterns
```

## Domain Focus

This module focuses on **Customer Service and Support**, providing tools for managing support tickets and building a comprehensive knowledge base.

## Build

```bash
pnpm --filter @hotcrm/support build
```

## Development

```bash
pnpm --filter @hotcrm/support dev
```
