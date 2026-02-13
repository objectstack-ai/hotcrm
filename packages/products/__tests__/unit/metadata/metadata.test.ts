import { describe, it, expect } from 'vitest';
import { MCPToolSchema } from '@objectstack/spec/ai';
import {
  SearchProductsTool,
  GetPricingTool,
  ConfigureBundleTool,
  CalculateQuoteTool,
} from '../../../src/products_mcp_tools.mcp';

describe('Products MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'SearchProductsTool', tool: SearchProductsTool },
    { name: 'GetPricingTool', tool: GetPricingTool },
    { name: 'ConfigureBundleTool', tool: ConfigureBundleTool },
    { name: 'CalculateQuoteTool', tool: CalculateQuoteTool },
  ];

  it('should export a collection of tools', () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  describe.each(tools)('$name', ({ tool }) => {
    it('should be defined', () => {
      expect(tool).toBeDefined();
    });

    it('should validate against MCPToolSchema', () => {
      expect(() => MCPToolSchema.parse(tool)).not.toThrow();
    });
  });
});
