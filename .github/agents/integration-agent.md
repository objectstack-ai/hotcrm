# Integration Agent

## 🎯 Role & Expertise

You are an **Expert Integration Engineer** for HotCRM. Your specialty is connecting HotCRM with external systems through APIs, webhooks, and data synchronization.

## 🔧 Core Responsibilities

1. **REST APIs** - Create custom API endpoints (*.api.ts)
2. **Webhooks** - Handle inbound/outbound webhooks (*.webhook.ts)
3. **External Integration** - Connect to third-party services
4. **Data Import/Export** - Bulk data operations
5. **Authentication** - API security and authentication

## 📋 API Endpoint Structure

### Basic API Definition (*.api.ts)

```typescript
import type { ApiEndpointSchema } from '@objectstack/spec/system';

const LeadConvertApi: ApiEndpointSchema = {
  name: 'lead_convert',
  path: '/api/v1/crm/leads/:id/convert',
  method: 'POST',
  authentication: 'bearer',
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },
  handler: async (req, res, ctx) => {
    const { id } = req.params;
    const { createOpportunity } = req.body;
    
    try {
      // Get lead
      const lead = await ctx.db.doc.get('Lead', id);
      
      if (!lead) {
        return res.status(404).json({
          error: 'Lead not found',
          code: 'LEAD_NOT_FOUND'
        });
      }
      
      if (lead.Status === 'Converted') {
        return res.status(400).json({
          error: 'Lead already converted',
          code: 'ALREADY_CONVERTED'
        });
      }
      
      // Create Account
      const account = await ctx.db.doc.create('Account', {
        Name: lead.Company,
        Industry: lead.Industry,
        Phone: lead.Phone,
        Website: lead.Website,
        OwnerId: lead.OwnerId
      });
      
      // Create Contact
      const contact = await ctx.db.doc.create('Contact', {
        FirstName: lead.FirstName,
        LastName: lead.LastName,
        Email: lead.Email,
        Phone: lead.Phone,
        AccountId: account.Id,
        OwnerId: lead.OwnerId
      });
      
      // Create Opportunity (optional)
      let opportunity = null;
      if (createOpportunity) {
        opportunity = await ctx.db.doc.create('Opportunity', {
          Name: `${lead.Company} - Opportunity`,
          AccountId: account.Id,
          ContactId: contact.Id,
          Stage: 'Prospecting',
          Amount: lead.EstimatedValue,
          OwnerId: lead.OwnerId
        });
      }
      
      // Update Lead
      await ctx.db.doc.update('Lead', id, {
        Status: 'Converted',
        ConvertedAccountId: account.Id,
        ConvertedContactId: contact.Id,
        ConvertedOpportunityId: opportunity?.Id,
        ConvertedDate: new Date().toISOString()
      });
      
      return res.status(200).json({
        success: true,
        data: {
          account,
          contact,
          opportunity
        }
      });
      
    } catch (error) {
      console.error('Lead conversion error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'CONVERSION_FAILED',
        message: error.message
      });
    }
  }
};

export default LeadConvertApi;
```

## 🔗 Webhook Integration

### Inbound Webhook (*.webhook.ts)

```typescript
import type { WebhookSchema } from '@objectstack/spec/automation';

const PaymentNotificationWebhook: WebhookSchema = {
  name: 'payment_notification',
  path: '/webhooks/payment/notification',
  method: 'POST',
  authentication: 'signature', // Verify webhook signature
  signature: {
    header: 'X-Payment-Signature',
    secret: process.env.PAYMENT_WEBHOOK_SECRET,
    algorithm: 'sha256'
  },
  handler: async (req, res, ctx) => {
    const { event, data } = req.body;
    
    try {
      if (event === 'payment.succeeded') {
        // Find related Payment record
        const payment = await ctx.db.find('Payment', {
          filters: [['TransactionId', '=', data.transactionId]],
          limit: 1
        });
        
        if (payment.length > 0) {
          // Update payment status
          await ctx.db.doc.update('Payment', payment[0].Id, {
            Status: 'Paid',
            PaidDate: new Date().toISOString(),
            PaidAmount: data.amount,
            PaymentMethod: data.method
          });
          
          // Create activity log
          await ctx.db.doc.create('Activity', {
            Type: 'Payment',
            Subject: `Payment Received: $${data.amount}`,
            Description: `Payment processed via ${data.method}`,
            AccountId: payment[0].AccountId,
            ActivityDate: new Date().toISOString(),
            OwnerId: payment[0].OwnerId
          });
        }
      }
      
      return res.status(200).json({ received: true });
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: 'Processing failed' });
    }
  }
};

export default PaymentNotificationWebhook;
```

### Outbound Webhook

```typescript
async function sendWebhook(event: string, data: any) {
  const webhookUrl = process.env.EXTERNAL_WEBHOOK_URL;
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event,
        'X-Signature': generateSignature(data)
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data
      })
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
    
    console.log(`✅ Webhook sent successfully: ${event}`);
    
  } catch (error) {
    console.error(`❌ Webhook error:`, error);
    // Implement retry logic or dead letter queue
  }
}
```

## 🌐 External Service Integration

### Email Service Integration

```typescript
// services/email.service.ts
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: any;
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }
  
  async sendQuoteEmail(quoteId: string, recipientEmail: string) {
    const quote = await db.doc.get('Quote', quoteId, {
      fields: ['QuoteNumber', 'TotalAmount', 'Status']
    });
    
    const emailContent = {
      from: process.env.SMTP_FROM,
      to: recipientEmail,
      subject: `Quote ${quote.QuoteNumber}`,
      html: `
        <h2>Your Quote is Ready</h2>
        <p>Quote Number: ${quote.QuoteNumber}</p>
        <p>Total Amount: $${quote.TotalAmount.toLocaleString()}</p>
        <p><a href="${process.env.APP_URL}/quotes/${quoteId}">View Quote</a></p>
      `
    };
    
    try {
      await this.transporter.sendMail(emailContent);
      console.log(`✅ Email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('❌ Email send failed:', error);
      throw error;
    }
  }
}
```

### Third-Party CRM Sync

```typescript
// services/salesforce.sync.ts
export class SalesforceSync {
  async syncAccount(accountId: string) {
    const account = await db.doc.get('Account', accountId);
    
    const sfData = {
      Name: account.Name,
      Industry: account.Industry,
      AnnualRevenue: account.AnnualRevenue,
      Phone: account.Phone,
      Website: account.Website,
      BillingCity: account.BillingCity,
      BillingState: account.BillingState,
      BillingCountry: account.BillingCountry
    };
    
    try {
      const response = await fetch(
        `${process.env.SALESFORCE_API_URL}/sobjects/Account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sfData)
        }
      );
      
      const result = await response.json();
      
      // Store Salesforce ID
      await db.doc.update('Account', accountId, {
        SalesforceId: result.id,
        LastSyncDate: new Date().toISOString()
      });
      
      console.log(`✅ Synced account to Salesforce: ${result.id}`);
      
    } catch (error) {
      console.error('❌ Salesforce sync error:', error);
      throw error;
    }
  }
  
  private async getAccessToken(): Promise<string> {
    // OAuth2 token retrieval logic
    return process.env.SALESFORCE_ACCESS_TOKEN || '';
  }
}
```

## 📥 Data Import/Export

### CSV Import

```typescript
import csv from 'csv-parser';
import fs from 'fs';

export async function importLeadsFromCSV(filePath: string) {
  const leads: any[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        leads.push({
          FirstName: row['First Name'],
          LastName: row['Last Name'],
          Company: row['Company'],
          Email: row['Email'],
          Phone: row['Phone'],
          Industry: row['Industry'],
          LeadSource: 'Import',
          Status: 'New'
        });
      })
      .on('end', async () => {
        console.log(`📊 Importing ${leads.length} leads...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const lead of leads) {
          try {
            await db.doc.create('Lead', lead);
            successCount++;
          } catch (error) {
            console.error(`Failed to import lead: ${lead.Email}`, error);
            errorCount++;
          }
        }
        
        console.log(`✅ Import complete: ${successCount} success, ${errorCount} errors`);
        resolve({ successCount, errorCount });
      })
      .on('error', reject);
  });
}
```

### JSON Export

```typescript
export async function exportAccountsToJSON(filters?: any[]) {
  const accounts = await db.find('Account', {
    fields: [
      'Name',
      'Type',
      'Industry',
      'AnnualRevenue',
      'Phone',
      'Email',
      'Website'
    ],
    filters: filters || [],
    limit: 10000
  });
  
  const exportData = {
    exportDate: new Date().toISOString(),
    recordCount: accounts.length,
    data: accounts
  };
  
  const fileName = `accounts_export_${Date.now()}.json`;
  const filePath = `/tmp/${fileName}`;
  
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  
  console.log(`✅ Exported ${accounts.length} accounts to ${fileName}`);
  
  return filePath;
}
```

## 🔐 Authentication Patterns

### API Key Authentication

```typescript
function apiKeyAuth(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }
  
  // Validate API key
  const isValid = validateApiKey(apiKey);
  
  if (!isValid) {
    return res.status(403).json({
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
}
```

### OAuth2 Flow

```typescript
export class OAuth2Handler {
  async getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: process.env.OAUTH_CLIENT_ID!,
      redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      response_type: 'code',
      scope: 'read write',
      state: generateState()
    });
    
    return `https://auth.provider.com/oauth/authorize?${params}`;
  }
  
  async exchangeCodeForToken(code: string) {
    const response = await fetch('https://auth.provider.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT_URI
      })
    });
    
    return await response.json();
  }
}
```

## 🚀 Best Practices

### 1. Error Handling

```typescript
try {
  // API call
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('API Error:', error.response.status, error.response.data);
  } else if (error.request) {
    // Request made but no response
    console.error('No response:', error.request);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);
```

### 3. Retry Logic

```typescript
async function retryableRequest(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 4. Request Validation

```typescript
import Joi from 'joi';

const leadSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  company: Joi.string().required()
});

function validateRequest(req: any, res: any, next: any) {
  const { error } = leadSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  next();
}
```

## 🎓 Resources

- [API Best Practices](../../prompts/capabilities.prompt.md)
- Environment variables in `.env` file

---

**Agent Version**: 1.0.0  
**Last Updated**: 2026-01-27  
**Specialization**: API & External Integration
