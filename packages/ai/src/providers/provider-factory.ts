/**
 * Provider Factory
 * 
 * Factory for creating and managing ML provider instances
 */

import BaseMLProvider, { MLProviderConfig } from './base-provider';
import { AWSSageMakerProvider, SageMakerConfig } from './aws-sagemaker-provider';
import { AzureMLProvider, AzureMLConfig } from './azure-ml-provider';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';

/**
 * Provider Factory - Creates and caches provider instances
 */
export class ProviderFactory {
  private static providers: Map<string, BaseMLProvider> = new Map();
  
  /**
   * Create or get cached provider instance
   */
  static getProvider(config: MLProviderConfig): BaseMLProvider {
    const key = `${config.provider}:${config.endpoint || 'default'}`;
    
    // Return cached provider if exists
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }
    
    // Create new provider based on type
    let provider: BaseMLProvider;
    
    switch (config.provider) {
      case 'aws-sagemaker':
        provider = new AWSSageMakerProvider(config as SageMakerConfig);
        break;
      
      case 'azure-ml':
        provider = new AzureMLProvider(config as AzureMLConfig);
        break;
      
      case 'openai':
        provider = new OpenAIProvider(config as OpenAIConfig);
        break;
      
      case 'custom':
        throw new Error('Custom provider must be registered separately');
      
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
    
    // Cache provider
    this.providers.set(key, provider);
    
    return provider;
  }
  
  /**
   * Register a custom provider
   */
  static registerProvider(key: string, provider: BaseMLProvider): void {
    this.providers.set(key, provider);
  }
  
  /**
   * Remove provider from cache
   */
  static removeProvider(key: string): void {
    this.providers.delete(key);
  }
  
  /**
   * Clear all cached providers
   */
  static clearAll(): void {
    this.providers.clear();
  }
  
  /**
   * Get all registered providers
   */
  static getAllProviders(): Map<string, BaseMLProvider> {
    return new Map(this.providers);
  }
}

export default ProviderFactory;
