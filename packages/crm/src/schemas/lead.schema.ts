import { z } from 'zod';

// Reusable parts
const AddressSchema = z.object({
  Street: z.string().optional().describe('街道'),
  City: z.string().optional().describe('城市'),
  State: z.string().optional().describe('省份/州'),
  PostalCode: z.string().optional().describe('邮编'),
  Country: z.string().optional().describe('国家')
});

export const LeadSchema = z.object({
  // Basic Info
  FirstName: z.string().optional().describe('名'),
  LastName: z.string().min(1).describe('姓'),
  Company: z.string().min(1).describe('公司'),
  Title: z.string().optional().describe('职位'),
  
  // Contact
  Email: z.string().email().optional().describe('邮箱'),
  Phone: z.string().optional().describe('电话'),
  MobilePhone: z.string().optional().describe('手机'),
  Website: z.string().url().optional().describe('网站'),

  // Status & Priority
  Status: z.enum(['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'])
    .default('New')
    .describe('状态'),
  Rating: z.enum(['Hot', 'Warm', 'Cold']).optional().describe('等级'),
  
  // Scoring (Calculated)
  LeadScore: z.number().default(0).describe('线索评分'),
  DataCompleteness: z.number().min(0).max(100).default(0).describe('资料完整度(%)'),
  
  // Business Logic Fields
  Industry: z.string().optional().describe('行业'),
  NumberOfEmployees: z.number().optional().describe('员工数'),
  AnnualRevenue: z.number().optional().describe('年收入'),
  LeadSource: z.string().optional().describe('线索来源'),
  
  // Public Pool
  IsInPublicPool: z.boolean().default(false).describe('是否在公海池'),
  PoolEntryDate: z.string().datetime().optional().describe('进入公海时间'),
  ClaimedDate: z.string().datetime().optional().describe('领取时间'),

  // System
  OwnerId: z.string().optional().describe('所有者'),
  
  // Logic Fields (Rollups & Lookups)
  owner: z.any().optional().describe('所有者对象'), // Lookup expansion
  NumberOfActivities: z.number().optional().describe('活动数量'),
  LastActivityDate: z.string().datetime().optional().describe('最后活动时间'),

  Description: z.string().optional().describe('描述')
}).merge(AddressSchema);

export type Lead = z.infer<typeof LeadSchema>;
