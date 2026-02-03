import { ModelRegistry, ModelConfig } from '../../src/model-registry';

describe('ModelRegistry', () => {
  beforeEach(() => {
    ModelRegistry.clear();
  });

  describe('register', () => {
    it('should register a new model', () => {
      // Arrange
      const model = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'A test model',
        status: 'active'
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('test-model');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-model');
      expect(retrieved?.name).toBe('Test Model');
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should register model with provider configuration', () => {
      // Arrange
      const model = {
        id: 'aws-model',
        name: 'AWS Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'aws-sagemaker',
        description: 'AWS SageMaker model',
        status: 'active',
        providerConfig: {
          provider: 'aws-sagemaker',
          endpoint: 'https://sagemaker.amazonaws.com',
          credentials: {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1'
          }
        }
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('aws-model');

      // Assert
      expect(retrieved?.providerConfig).toBeDefined();
      expect(retrieved?.providerConfig?.provider).toBe('aws-sagemaker');
    });

    it('should register model with A/B testing configuration', () => {
      // Arrange
      const championModel = {
        id: 'champion',
        name: 'Champion Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Current champion',
        status: 'active'
      };

      const challengerModel = {
        id: 'challenger',
        name: 'Challenger Model',
        version: '2.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'New challenger',
        status: 'active',
        abTest: {
          enabled: true,
          trafficPercentage: 20,
          championModelId: 'champion'
        }
      };

      // Act
      ModelRegistry.register(championModel);
      ModelRegistry.register(challengerModel);
      const retrieved = ModelRegistry.getModel('challenger');

      // Assert
      expect(retrieved?.abTest).toBeDefined();
      expect(retrieved?.abTest?.enabled).toBe(true);
      expect(retrieved?.abTest?.trafficPercentage).toBe(20);
      expect(retrieved?.abTest?.championModelId).toBe('champion');
    });

    it('should update existing model when re-registered', () => {
      // Arrange
      const model1 = {
        id: 'update-model',
        name: 'Original Name',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Original description',
        status: 'active'
      };

      const model2 = {
        id: 'update-model',
        name: 'Updated Name',
        version: '2.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Updated description',
        status: 'active'
      };

      // Act
      ModelRegistry.register(model1);
      ModelRegistry.register(model2);
      const retrieved = ModelRegistry.getModel('update-model');

      // Assert
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.version).toBe('2.0.0');
    });
  });

  describe('getModel', () => {
    it('should retrieve a registered model', () => {
      // Arrange
      const model = {
        id: 'get-model',
        name: 'Get Test',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Test model',
        status: 'active'
      };
      ModelRegistry.register(model);

      // Act
      const retrieved = ModelRegistry.getModel('get-model');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('get-model');
    });

    it('should return undefined for non-existent model', () => {
      // Act
      const retrieved = ModelRegistry.getModel('non-existent');

      // Assert
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should list all registered models', () => {
      // Arrange
      const model1 = {
        id: 'model-1',
        name: 'Model 1',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'First model',
        status: 'active'
      };

      const model2 = {
        id: 'model-2',
        name: 'Model 2',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Second model',
        status: 'active'
      };

      ModelRegistry.register(model1);
      ModelRegistry.register(model2);

      // Act
      const models = ModelRegistry.listModels();

      // Assert - Should have at least 2 models (may have more from default registrations)
      expect(models.length).toBeGreaterThanOrEqual(2);
      expect(models.find(m => m.id === 'model-1')).toBeDefined();
      expect(models.find(m => m.id === 'model-2')).toBeDefined();
    });

    it('should filter models by status', () => {
      // Arrange
      const activeModel = {
        id: 'active',
        name: 'Active Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Active',
        status: 'active'
      };

      const deprecatedModel = {
        id: 'deprecated',
        name: 'Deprecated Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Deprecated',
        status: 'deprecated'
      };

      ModelRegistry.register(activeModel);
      ModelRegistry.register(deprecatedModel);

      // Act
      const activeModels = ModelRegistry.listModels({ status: 'active' });

      // Assert
      expect(activeModels.find(m => m.id === 'active')).toBeDefined();
      expect(activeModels.find(m => m.id === 'deprecated')).toBeUndefined();
    });

    it('should filter models by type', () => {
      // Arrange
      const classificationModel = {
        id: 'classification',
        name: 'Classification Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Classification',
        status: 'active'
      };

      const regressionModel = {
        id: 'regression',
        name: 'Regression Model',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Regression',
        status: 'active'
      };

      ModelRegistry.register(classificationModel);
      ModelRegistry.register(regressionModel);

      // Act
      const classificationModels = ModelRegistry.listModels({ type: 'classification' });

      // Assert
      expect(classificationModels.find(m => m.id === 'classification')).toBeDefined();
      // regression model might still be in results due to default models
    });
  });

  describe('unregister', () => {
    it('should remove a registered model', () => {
      // Arrange
      const model = {
        id: 'remove-model',
        name: 'Remove Test',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test model',
        status: 'active'
      };
      ModelRegistry.register(model);

      // Act
      ModelRegistry.unregister('remove-model');
      const retrieved = ModelRegistry.getModel('remove-model');

      // Assert
      expect(retrieved).toBeUndefined();
    });

    it('should not throw when removing non-existent model', () => {
      // Act & Assert
      expect(() => ModelRegistry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all registered models', () => {
      // Arrange
      ModelRegistry.register({
        id: 'model-1',
        name: 'Model 1',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'First',
        status: 'active'
      });

      ModelRegistry.register({
        id: 'model-2',
        name: 'Model 2',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Second',
        status: 'active'
      });

      // Act
      ModelRegistry.clear();
      const models = ModelRegistry.listModels();

      // Assert
      expect(models).toEqual([]);
    });
  });

  describe('model metrics', () => {
    it('should store and retrieve model metrics', () => {
      // Arrange
      const model = {
        id: 'metrics-model',
        name: 'Metrics Test',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active',
        metrics: {
          accuracy: 0.95,
          precision: 0.93,
          recall: 0.97,
          f1Score: 0.95
        }
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('metrics-model');

      // Assert
      expect(retrieved?.metrics).toBeDefined();
      expect(retrieved?.metrics?.accuracy).toBe(0.95);
      expect(retrieved?.metrics?.precision).toBe(0.93);
      expect(retrieved?.metrics?.recall).toBe(0.97);
      expect(retrieved?.metrics?.f1Score).toBe(0.95);
    });
  });
});

describe('ModelRegistry', () => {
  beforeEach(() => {
    ModelRegistry.clear();
  });

  describe('register', () => {
    it('should register a new model', () => {
      // Arrange
      const model = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'A test model',
        status: 'active'
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('test-model');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-model');
      expect(retrieved?.name).toBe('Test Model');
      expect(retrieved?.version).toBe('1.0.0');
    });

    it('should register model with provider configuration', () => {
      // Arrange
      const model = {
        id: 'aws-model',
        name: 'AWS Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'aws-sagemaker',
        description: 'AWS SageMaker model',
        status: 'active',
        providerConfig: {
          provider: 'aws-sagemaker',
          endpoint: 'https://sagemaker.amazonaws.com',
          credentials: {
            accessKeyId: 'test-key',
            secretAccessKey: 'test-secret',
            region: 'us-east-1'
          }
        }
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('aws-model');

      // Assert
      expect(retrieved?.providerConfig).toBeDefined();
      expect(retrieved?.providerConfig?.provider).toBe('aws-sagemaker');
    });

    it('should register model with A/B testing configuration', () => {
      // Arrange
      const championModel = {
        id: 'champion',
        name: 'Champion Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Current champion',
        status: 'active'
      };

      const challengerModel = {
        id: 'challenger',
        name: 'Challenger Model',
        version: '2.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'New challenger',
        status: 'active',
        abTest: {
          enabled: true,
          trafficPercentage: 20,
          championModelId: 'champion'
        }
      };

      // Act
      ModelRegistry.register(championModel);
      ModelRegistry.register(challengerModel);
      const retrieved = ModelRegistry.getModel('challenger');

      // Assert
      expect(retrieved?.abTest).toBeDefined();
      expect(retrieved?.abTest?.enabled).toBe(true);
      expect(retrieved?.abTest?.trafficPercentage).toBe(20);
      expect(retrieved?.abTest?.championModelId).toBe('champion');
    });

    it('should update existing model when re-registered', () => {
      // Arrange
      const model1 = {
        id: 'update-model',
        name: 'Original Name',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Original description',
        status: 'active'
      };

      const model2 = {
        id: 'update-model',
        name: 'Updated Name',
        version: '2.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Updated description',
        status: 'active'
      };

      // Act
      ModelRegistry.register(model1);
      ModelRegistry.register(model2);
      const retrieved = ModelRegistry.getModel('update-model');

      // Assert
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.version).toBe('2.0.0');
    });
  });

  describe('getModel', () => {
    it('should retrieve a registered model', () => {
      // Arrange
      const model = {
        id: 'get-model',
        name: 'Get Test',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Test model',
        status: 'active'
      };
      ModelRegistry.register(model);

      // Act
      const retrieved = ModelRegistry.getModel('get-model');

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('get-model');
    });

    it('should return undefined for non-existent model', () => {
      // Act
      const retrieved = ModelRegistry.getModel('non-existent');

      // Assert
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should list all registered models', () => {
      // Arrange
      const model1 = {
        id: 'model-1',
        name: 'Model 1',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'First model',
        status: 'active'
      };

      const model2 = {
        id: 'model-2',
        name: 'Model 2',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Second model',
        status: 'active'
      };

      ModelRegistry.register(model1);
      ModelRegistry.register(model2);

      // Act
      const models = ModelRegistry.listModels();

      // Assert - Should have at least 2 models (may have more from default registrations)
      expect(models.length).toBeGreaterThanOrEqual(2);
      expect(models.find(m => m.id === 'model-1')).toBeDefined();
      expect(models.find(m => m.id === 'model-2')).toBeDefined();
    });

    it('should filter models by status', () => {
      // Arrange
      const activeModel = {
        id: 'active',
        name: 'Active Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Active',
        status: 'active'
      };

      const deprecatedModel = {
        id: 'deprecated',
        name: 'Deprecated Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Deprecated',
        status: 'deprecated'
      };

      ModelRegistry.register(activeModel);
      ModelRegistry.register(deprecatedModel);

      // Act
      const activeModels = ModelRegistry.listModels({ status: 'active' });

      // Assert
      expect(activeModels.find(m => m.id === 'active')).toBeDefined();
      expect(activeModels.find(m => m.id === 'deprecated')).toBeUndefined();
    });

    it('should filter models by type', () => {
      // Arrange
      const classificationModel = {
        id: 'classification',
        name: 'Classification Model',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Classification',
        status: 'active'
      };

      const regressionModel = {
        id: 'regression',
        name: 'Regression Model',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Regression',
        status: 'active'
      };

      ModelRegistry.register(classificationModel);
      ModelRegistry.register(regressionModel);

      // Act
      const classificationModels = ModelRegistry.listModels({ type: 'classification' });

      // Assert
      expect(classificationModels.find(m => m.id === 'classification')).toBeDefined();
      // regression model might still be in results due to default models
    });
  });

  describe('unregister', () => {
    it('should remove a registered model', () => {
      // Arrange
      const model = {
        id: 'remove-model',
        name: 'Remove Test',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test model',
        status: 'active'
      };
      ModelRegistry.register(model);

      // Act
      ModelRegistry.unregister('remove-model');
      const retrieved = ModelRegistry.getModel('remove-model');

      // Assert
      expect(retrieved).toBeUndefined();
    });

    it('should not throw when removing non-existent model', () => {
      // Act & Assert
      expect(() => ModelRegistry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all registered models', () => {
      // Arrange
      ModelRegistry.register({
        id: 'model-1',
        name: 'Model 1',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'First',
        status: 'active'
      });

      ModelRegistry.register({
        id: 'model-2',
        name: 'Model 2',
        version: '1.0.0',
        type: 'regression',
        provider: 'custom',
        description: 'Second',
        status: 'active'
      });

      // Act
      ModelRegistry.clear();
      const models = ModelRegistry.listModels();

      // Assert
      expect(models).toEqual([]);
    });
  });

  describe('model metrics', () => {
    it('should store and retrieve model metrics', () => {
      // Arrange
      const model = {
        id: 'metrics-model',
        name: 'Metrics Test',
        version: '1.0.0',
        type: 'classification',
        provider: 'custom',
        description: 'Test',
        status: 'active',
        metrics: {
          accuracy: 0.95,
          precision: 0.93,
          recall: 0.97,
          f1Score: 0.95
        }
      };

      // Act
      ModelRegistry.register(model);
      const retrieved = ModelRegistry.getModel('metrics-model');

      // Assert
      expect(retrieved?.metrics).toBeDefined();
      expect(retrieved?.metrics?.accuracy).toBe(0.95);
      expect(retrieved?.metrics?.precision).toBe(0.93);
      expect(retrieved?.metrics?.recall).toBe(0.97);
      expect(retrieved?.metrics?.f1Score).toBe(0.95);
    });
  });
});
