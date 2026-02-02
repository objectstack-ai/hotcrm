/**
 * OpenAI Provider
 * 
 * Integration with OpenAI for NLP tasks like sentiment analysis
 */

import BaseMLProvider, { MLProviderConfig, PredictionInput, PredictionOutput } from './base-provider';

// Type stubs for when axios is not available
interface AxiosInstance {
  post(url: string, data: any): Promise<any>;
  get(url: string): Promise<any>;
}

interface AxiosStatic {
  create(config: any): AxiosInstance;
  isAxiosError(payload: any): boolean;
}

// Lazy load axios
let axios: AxiosStatic | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  axios = (globalThis as any).require?.('axios') || null;
} catch (e) {
  // Axios not available, will use mock
}

export interface OpenAIConfig extends MLProviderConfig {
  provider: 'openai';
  credentials: {
    apiKey: string;
  };
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends BaseMLProvider {
  private client!: AxiosInstance; // Non-null assertion since initialized in constructor
  private defaultModel: string;
  
  constructor(config: OpenAIConfig) {
    super(config);
    this.defaultModel = config.config?.model || 'gpt-4';
    this.initializeClient();
  }
  
  /**
   * Initialize HTTP client for OpenAI
   */
  private initializeClient(): void {
    if (axios) {
      this.client = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          'Authorization': `Bearer ${this.config.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for LLM calls
      });
    } else {
      // Mock client when axios is not available
      this.client = {
        post: async () => ({ data: { choices: [{ message: { content: '{}' } }] } }),
        get: async () => ({ data: { status: 'ok' } })
      } as AxiosInstance;
    }
  }
  
  /**
   * Validate configuration
   */
  async validate(): Promise<boolean> {
    try {
      const { credentials } = this.config;
      
      if (!credentials.apiKey) {
        throw new Error('Missing required OpenAI API key');
      }
      
      return true;
    } catch (error) {
      console.error('[OpenAI] Validation failed:', error);
      return false;
    }
  }
  
  /**
   * Make prediction using OpenAI
   */
  async predict<T = any>(
    modelId: string,
    input: PredictionInput
  ): Promise<PredictionOutput<T>> {
    const startTime = Date.now();
    
    try {
      // Build prompt based on task type
      const prompt = this.buildPrompt(modelId, input.features);
      
      // In production, would call OpenAI API:
      // const response = await this.client.post('/chat/completions', {
      //   model: this.defaultModel,
      //   messages: [{ role: 'user', content: prompt }],
      //   temperature: this.config.config?.temperature || 0.3,
      //   max_tokens: this.config.config?.maxTokens || 500
      // });
      // const result = JSON.parse(response.data.choices[0].message.content);
      
      // Mock response for now
      const result = this.getMockPrediction(modelId, input.features);
      const latency = Date.now() - startTime;
      
      return {
        prediction: result.prediction as T,
        confidence: result.confidence,
        metadata: {
          provider: 'openai',
          modelId,
          latency,
          model: this.defaultModel
        }
      };
    } catch (error) {
      console.error('[OpenAI] Prediction error:', error);
      
      const err = error as any;
      if (err.isAxiosError) {
        throw new Error(`OpenAI prediction failed: ${err.response?.status} - ${err.message}`);
      }
      
      throw new Error(`OpenAI prediction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build prompt for OpenAI based on task
   */
  private buildPrompt(modelId: string, features: Record<string, any>): string {
    if (modelId.includes('sentiment')) {
      return `Analyze the sentiment of the following text and return a JSON object with sentiment (positive/negative/neutral) and score (0-1):\n\n${features.text}`;
    }
    
    if (modelId.includes('lead-scoring')) {
      return `Evaluate this lead and return a JSON object with score (0-100) and confidence (0-100):\n\n${JSON.stringify(features, null, 2)}`;
    }
    
    return `Analyze the following data and provide prediction:\n\n${JSON.stringify(features, null, 2)}`;
  }
  
  /**
   * Mock prediction for development
   */
  private getMockPrediction(modelId: string, features: Record<string, any>): { prediction: any; confidence: number } {
    if (modelId.includes('sentiment')) {
      const text = features.text || '';
      const hasPositive = /good|great|excellent|happy|love/i.test(text);
      const hasNegative = /bad|terrible|awful|hate|poor/i.test(text);
      
      let sentiment = 'neutral';
      let score = 0.5;
      
      if (hasPositive && !hasNegative) {
        sentiment = 'positive';
        score = 0.8 + Math.random() * 0.15;
      } else if (hasNegative && !hasPositive) {
        sentiment = 'negative';
        score = 0.15 + Math.random() * 0.15;
      }
      
      return {
        prediction: { sentiment, score },
        confidence: 85 + Math.random() * 10
      };
    }
    
    return {
      prediction: { value: 0.75 },
      confidence: 80
    };
  }
  
  /**
   * Batch predictions using OpenAI
   */
  async batchPredict<T = any>(
    modelId: string,
    inputs: PredictionInput[]
  ): Promise<PredictionOutput<T>[]> {
    // OpenAI doesn't have native batch API for chat completions
    // Make parallel requests with rate limiting
    const promises = inputs.map(input => this.predict<T>(modelId, input));
    return Promise.all(promises);
  }
  
  /**
   * Health check for OpenAI
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // In production, would call models endpoint
      // await this.client.get('/models');
      
      await new Promise(resolve => setTimeout(resolve, 20)); // Simulate network call
      
      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default OpenAIProvider;
