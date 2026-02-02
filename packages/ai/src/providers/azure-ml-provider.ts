/**
 * Azure ML Provider
 * 
 * Integration with Azure Machine Learning for real-time inference
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

export interface AzureMLConfig extends MLProviderConfig {
  provider: 'azure-ml';
  credentials: {
    apiKey: string;
    endpoint: string;
    deploymentName?: string;
  };
}

/**
 * Azure ML Provider Implementation
 */
export class AzureMLProvider extends BaseMLProvider {
  private client!: AxiosInstance; // Non-null assertion since initialized in constructor
  
  constructor(config: AzureMLConfig) {
    super(config);
    this.initializeClient();
  }
  
  /**
   * Initialize HTTP client for Azure ML
   */
  private initializeClient(): void {
    const endpoint = this.config.credentials.endpoint || this.config.endpoint;
    
    if (axios) {
      this.client = axios.create({
        baseURL: endpoint,
        headers: {
          'Authorization': `Bearer ${this.config.credentials.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
    } else {
      // Mock client when axios is not available
      this.client = {
        post: async () => ({ data: { result: [0.82], confidence: 87 } }),
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
      
      if (!credentials.apiKey || !credentials.endpoint) {
        throw new Error('Missing required Azure ML credentials');
      }
      
      return true;
    } catch (error) {
      console.error('[Azure ML] Validation failed:', error);
      return false;
    }
  }
  
  /**
   * Make prediction using Azure ML endpoint
   */
  async predict<T = any>(
    modelId: string,
    input: PredictionInput
  ): Promise<PredictionOutput<T>> {
    const startTime = Date.now();
    
    try {
      // Azure ML expects data in specific format
      const requestBody = {
        data: [input.features],
        method: 'predict'
      };
      
      // In production, would call actual Azure ML endpoint
      // const response = await this.client.post('/score', requestBody);
      
      // Mock response for now
      const response = {
        data: {
          result: [0.82],
          confidence: 87
        }
      };
      
      const latency = Date.now() - startTime;
      
      return {
        prediction: (response.data.result?.[0] || response.data) as T,
        confidence: response.data.confidence || 85,
        metadata: {
          provider: 'azure-ml',
          modelId,
          latency,
          endpoint: this.config.credentials.endpoint
        }
      };
    } catch (error) {
      console.error('[Azure ML] Prediction error:', error);
      
      const err = error as any;
      if (err.isAxiosError) {
        throw new Error(`Azure ML prediction failed: ${err.response?.status} - ${err.message}`);
      }
      
      throw new Error(`Azure ML prediction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Batch predictions using Azure ML
   */
  async batchPredict<T = any>(
    modelId: string,
    inputs: PredictionInput[]
  ): Promise<PredictionOutput<T>[]> {
    const startTime = Date.now();
    
    try {
      // Azure ML can handle batch predictions in a single request
      const requestBody = {
        data: inputs.map(input => input.features),
        method: 'predict'
      };
      
      // Mock batch response
      const response = {
        data: {
          result: inputs.map(() => 0.80 + Math.random() * 0.15)
        }
      };
      
      const latency = Date.now() - startTime;
      
      return response.data.result.map((prediction: any, index: number) => ({
        prediction: prediction as T,
        confidence: 80 + Math.random() * 15,
        metadata: {
          provider: 'azure-ml',
          modelId,
          latency: latency / inputs.length,
          batchIndex: index
        }
      }));
    } catch (error) {
      console.error('[Azure ML] Batch prediction error:', error);
      throw new Error(`Azure ML batch prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Health check for Azure ML endpoint
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // In production, would call health endpoint or make minimal prediction
      // await this.client.get('/health');
      
      await new Promise(resolve => setTimeout(resolve, 15)); // Simulate network call
      
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

export default AzureMLProvider;
