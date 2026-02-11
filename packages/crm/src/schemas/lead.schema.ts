import { z } from 'zod';

// Reusable parts
const AddressSchema = z.object({
  Street: z.string().optional().describe('Street'),
  City: z.string().optional().describe('City'),
  State: z.string().optional().describe('State/Province'),
  PostalCode: z.string().optional().describe('Postal Code'),
  Country: z.string().optional().describe('Country')
});

export const LeadSchema = z.object({
  // Basic Info
  FirstName: z.string().optional().describe('First Name'),
  LastName: z.string().min(1).describe('Last Name'),
  Company: z.string().min(1).describe('Company'),
  Title: z.string().optional().describe('Title'),
  
  // Contact
  Email: z.string().email().optional().describe('Email'),
  Phone: z.string().optional().describe('Phone'),
  MobilePhone: z.string().optional().describe('Mobile Phone'),
  Website: z.string().url().optional().describe('Website'),

  // Status & Priority
  Status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted'])
    .default('new')
    .describe('Status'),
  Rating: z.enum(['Hot', 'Warm', 'Cold']).optional().describe('Rating'),
  
  // Scoring (Calculated)
  LeadScore: z.number().default(0).describe('Lead Score'),
  DataCompleteness: z.number().min(0).max(100).default(0).describe('Data Completeness (%)'),
  
  // Business Logic Fields
  Industry: z.string().optional().describe('Industry'),
  NumberOfEmployees: z.number().optional().describe('Number of Employees'),
  AnnualRevenue: z.number().optional().describe('Annual Revenue'),
  LeadSource: z.string().optional().describe('Lead Source'),
  
  // Public Pool
  IsInPublicPool: z.boolean().default(false).describe('Is In Public Pool'),
  PoolEntryDate: z.string().datetime().optional().describe('Pool Entry Date'),
  ClaimedDate: z.string().datetime().optional().describe('Claimed Date'),

  // System
  OwnerId: z.string().optional().describe('Owner ID'),
  
  // Logic Fields (Rollups & Lookups)
  owner: z.any().optional().describe('Owner'), // Lookup expansion
  NumberOfActivities: z.number().optional().describe('Number of Activities'),
  LastActivityDate: z.string().datetime().optional().describe('Last Activity Date'),

  Description: z.string().optional().describe('Description')
}).merge(AddressSchema);

export type Lead = z.infer<typeof LeadSchema>;
