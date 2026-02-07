import { RAGPipelineConfig } from '@objectstack/spec/ai';

/**
 * Knowledge Base RAG Pipeline
 * Implements Retrieval-Augmented Generation for intelligent knowledge base search
 * and AI-powered customer support responses
 */
export const KnowledgeBaseRAG = RAGPipelineConfig.create({
  name: 'knowledge_base_rag',
  description: 'RAG pipeline for intelligent knowledge article search and AI-powered answers',

  // Embedding model for vectorization
  embeddingModel: {
    provider: 'openai',
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    batchSize: 100
  },

  // Vector store configuration
  vectorStore: {
    provider: 'pinecone',
    config: {
      index: 'hotcrm-knowledge',
      namespace: 'articles',
      metric: 'cosine',
      pods: 1,
      replicas: 1
    }
  },

  // Document loader - pulls from HotCRM knowledge articles
  documentLoader: {
    source: {
      type: 'object',
      object: 'knowledge_article',
      fields: ['title', 'content', 'summary', 'category', 'tags'],
      filters: [
        ['status', '=', 'Published'],
        ['visibility', 'IN', ['Public', 'Internal']]
      ]
    },

    // Preprocessing steps
    preprocessing: [
      {
        type: 'html_to_text',
        removeImages: true,
        removeLinks: false
      },
      {
        type: 'normalize_whitespace'
      },
      {
        type: 'remove_special_chars',
        keep: ['.', ',', '!', '?', '-', '_']
      }
    ],

    // Document metadata to preserve
    metadata: {
      article_id: '${id}',
      title: '${title}',
      category: '${category}',
      tags: '${tags}',
      author: '${created_by}',
      updated_date: '${last_modified_date}',
      url: '/knowledge/${id}'
    }
  },

  // Chunking strategy
  chunkingStrategy: {
    type: 'recursive',
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' '],
    
    // Keep sections together when possible
    respectBoundaries: true,
    boundaries: ['##', '###', '####']  // Markdown headers
  },

  // Retrieval configuration
  retrievalStrategy: {
    type: 'hybrid',  // Combines vector and keyword search
    
    vectorSearch: {
      topK: 5,
      scoreThreshold: 0.7,
      mmrDiversityFactor: 0.3  // Maximal Marginal Relevance for diversity
    },
    
    keywordSearch: {
      enabled: true,
      algorithm: 'BM25',
      weight: 0.3  // 70% vector, 30% keyword
    },
    
    reranking: {
      enabled: true,
      model: 'cohere-rerank-v2',
      topN: 3,
      threshold: 0.6
    }
  },

  // Generation configuration
  generation: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3,  // Lower for more factual responses
      maxTokens: 500
    },

    promptTemplate: `You are a helpful customer support assistant with access to the knowledge base.

Context from Knowledge Base:
{context}

User Question: {question}

Instructions:
1. Answer the question based ONLY on the provided context
2. If the context doesn't contain enough information, say "I don't have enough information to answer that completely."
3. Be concise and helpful
4. Include relevant article links when appropriate
5. If you're unsure, suggest contacting a human support agent

Answer:`,

    maxContextLength: 4000,
    
    // Include source citations
    includeSources: true,
    sourceFormat: 'markdown'
  },

  // Metadata filters for fine-grained control
  metadataFilters: [
    {
      field: 'category',
      operator: 'IN',
      values: ['Technical', 'FAQ', 'Troubleshooting', 'How-To', 'Best Practices']
    },
    {
      field: 'updated_date',
      operator: '>=',
      value: 'LAST_6_MONTHS'
    }
  ],

  // Caching configuration
  caching: {
    enabled: true,
    ttl: 3600,  // 1 hour
    provider: 'redis',
    keyPrefix: 'rag:kb:'
  },

  // Performance optimization
  optimization: {
    batchEmbedding: true,
    parallelRetrieval: true,
    prefetchRelated: true
  },

  // Analytics and monitoring
  analytics: {
    trackQueries: true,
    trackRetrievalAccuracy: true,
    trackGenerationQuality: true,
    feedbackEnabled: true
  }
});

/**
 * Product Documentation RAG Pipeline
 * Specialized RAG pipeline for product documentation and technical specs
 */
export const ProductDocsRAG = RAGPipelineConfig.create({
  name: 'product_docs_rag',
  description: 'RAG pipeline for product documentation and technical specifications',

  embeddingModel: {
    provider: 'openai',
    model: 'text-embedding-ada-002',
    dimensions: 1536
  },

  vectorStore: {
    provider: 'pinecone',
    config: {
      index: 'hotcrm-knowledge',
      namespace: 'product_docs',
      metric: 'cosine'
    }
  },

  documentLoader: {
    source: {
      type: 'object',
      object: 'product',
      fields: ['name', 'description', 'features', 'specifications', 'use_cases'],
      filters: [
        ['is_active', '=', true]
      ]
    },

    metadata: {
      product_id: '${id}',
      product_name: '${name}',
      category: '${product_family}',
      price: '${list_price}'
    }
  },

  chunkingStrategy: {
    type: 'semantic',  // Semantic chunking for technical content
    maxChunkSize: 800,
    minChunkSize: 200
  },

  retrievalStrategy: {
    type: 'vector',
    vectorSearch: {
      topK: 3,
      scoreThreshold: 0.75
    }
  },

  generation: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.2
    },

    promptTemplate: `You are a product expert assistant.

Product Information:
{context}

Question: {question}

Provide a detailed, technical answer based on the product information.
Include specific features, specifications, and use cases when relevant.

Answer:`,

    maxContextLength: 3000
  }
});

/**
 * Sales Battlecards RAG Pipeline
 * RAG pipeline for competitive intelligence and sales positioning
 */
export const SalesBattlecardsRAG = RAGPipelineConfig.create({
  name: 'sales_battlecards_rag',
  description: 'RAG pipeline for competitive intelligence and objection handling',

  embeddingModel: {
    provider: 'openai',
    model: 'text-embedding-ada-002',
    dimensions: 1536
  },

  vectorStore: {
    provider: 'pinecone',
    config: {
      index: 'hotcrm-knowledge',
      namespace: 'battlecards',
      metric: 'cosine'
    }
  },

  documentLoader: {
    source: {
      type: 'object',
      object: 'knowledge_article',
      fields: ['title', 'content'],
      filters: [
        ['category', 'IN', ['Competitor Analysis', 'Objection Handling', 'Value Proposition']],
        ['status', '=', 'Published']
      ]
    },

    metadata: {
      article_id: '${id}',
      category: '${category}',
      competitor: '${tags[0]}'  // First tag is competitor name
    }
  },

  chunkingStrategy: {
    type: 'fixed',
    chunkSize: 500,
    chunkOverlap: 50
  },

  retrievalStrategy: {
    type: 'hybrid',
    vectorSearch: {
      topK: 4,
      scoreThreshold: 0.65
    },
    keywordSearch: {
      enabled: true,
      algorithm: 'BM25'
    }
  },

  generation: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.4
    },

    promptTemplate: `You are a sales enablement expert.

Competitive Intelligence:
{context}

Sales Question: {question}

Provide actionable sales guidance including:
- Our strengths vs competitors
- How to handle objections
- Key talking points
- Proof points (case studies, metrics)

Response:`,

    maxContextLength: 3500
  },

  // Metadata filtering by competitor
  metadataFilters: [
    {
      field: 'category',
      operator: 'IN',
      values: ['Competitor Analysis', 'Objection Handling']
    }
  ]
});

export const RAGPipelines = {
  knowledgeBase: KnowledgeBaseRAG,
  productDocs: ProductDocsRAG,
  salesBattlecards: SalesBattlecardsRAG
};

export default RAGPipelines;
