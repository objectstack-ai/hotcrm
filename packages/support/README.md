# @hotcrm/support

Customer Service & Support module for HotCRM - Case management and Knowledge base.

## Overview

This package contains all customer support functionality including case management, SLA tracking, and knowledge base management. Package structure follows vertical slice architecture, prepared for future expansion with hooks and actions.

## Business Objects (Schemas)

**Legacy YAML Definitions:**
- **Case**: Multi-channel ticket intake (Email, Web, Phone, WeChat, Chat), SLA management, priority/escalation, customer satisfaction tracking
- **Knowledge**: Help documentation, FAQ management, article categorization, version control, RAG support with vector embeddings

> Note: Case and Knowledge objects are currently defined in YAML format. They are planned for TypeScript migration to this package in future releases.

## Key Features

### Case Management
- **Multi-Channel Intake**: Email, Web, Phone, WeChat, Chat Bot, Mobile App
- **SLA Management**: Automatic calculation and tracking of response/resolution times
- **AI-Powered Routing**: Intelligent auto-assignment to best available agent
- **Priority Management**: Configurable priority levels with escalation rules
- **Customer Satisfaction**: Built-in CSAT tracking and feedback collection
- **Solution Recommendations**: AI-powered suggestions from knowledge base

### Knowledge Base
- **Article Management**: Create, edit, and publish help documentation
- **Categorization**: Hierarchical categories and flexible tagging system
- **Version Control**: Track article revisions with review workflows
- **Visibility Levels**: Public, Internal, and Partner access controls
- **AI Enhancement**: Automated article summarization and related content discovery
- **RAG Ready**: Vector embeddings for retrieval-augmented generation
- **Analytics**: Usage tracking and helpfulness scoring

## Usage

```typescript
import { /* CaseSchema, KnowledgeSchema */ } from '@hotcrm/support';

// Note: TypeScript schema exports will be available after migration from YAML
```

## Future Enhancements

This package is structured to support:
- TypeScript schema definitions (`.object.ts` files)
- Business logic hooks for case automation
- Custom actions for AI-powered support features
- Integration with external support platforms

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
