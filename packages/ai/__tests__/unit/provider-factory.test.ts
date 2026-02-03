import { ProviderFactory } from '../../src/providers/provider-factory';
import { MLProviderConfig } from '../../src/providers/base-provider';

describe('ProviderFactory', () => {
  beforeEach(() => {
    // Clear any cached providers
    ProviderFactory.clearCache();
  });

  describe('getProvider', () => {
    it('should create AWS SageMaker provider', async () => {
      // Arrange
      const config = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1'
        }
      };

      // Act
      const provider = ProviderFactory.getProvider(config);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('AWSSageMakerProvider');
    });

    it('should create Azure ML provider', async () => {
      // Arrange
      const config = {
        provider: 'azure-ml',
        endpoint: 'https://example.azureml.net',
        credentials: {
          apiKey: 'test-api-key'
        }
      };

      // Act
      const provider = ProviderFactory.getProvider(config);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('AzureMLProvider');
    });

    it('should create OpenAI provider', async () => {
      // Arrange
      const config = {
        provider: 'openai',
        credentials: {
          apiKey: 'test-openai-key'
        }
      };

      // Act
      const provider = ProviderFactory.getProvider(config);

      // Assert
      expect(provider).toBeDefined();
      expect(provider.constructor.name).toBe('OpenAIProvider');
    });

    it('should cache provider instances', () => {
      // Arrange
      const config = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1'
        }
      };

      // Act
      const provider1 = ProviderFactory.getProvider(config);
      const provider2 = ProviderFactory.getProvider(config);

      // Assert
      expect(provider1).toBe(provider2); // Same instance
    });

    it('should create different instances for different configurations', () => {
      // Arrange
      const config1 = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'key-1',
          secretAccessKey: 'secret-1',
          region: 'us-east-1'
        }
      };

      const config2 = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'key-2',
          secretAccessKey: 'secret-2',
          region: 'us-west-2'
        }
      };

      // Act
      const provider1 = ProviderFactory.getProvider(config1);
      const provider2 = ProviderFactory.getProvider(config2);

      // Assert
      expect(provider1).not.toBe(provider2); // Different instances
    });

    it('should throw error for unsupported provider', () => {
      // Arrange
      const config: any = {
        provider: 'unsupported-provider',
        credentials: {
          apiKey: 'test-key'
        }
      };

      // Act & Assert
      expect(() => ProviderFactory.getProvider(config)).toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached providers', () => {
      // Arrange
      const config = {
        provider: 'aws-sagemaker',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          region: 'us-east-1'
        }
      };

      const provider1 = ProviderFactory.getProvider(config);

      // Act
      ProviderFactory.clearCache();
      const provider2 = ProviderFactory.getProvider(config);

      // Assert
      expect(provider1).not.toBe(provider2); // New instance after cache clear
    });
  });
});
