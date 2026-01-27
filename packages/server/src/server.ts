/**
 * HotCRM Server
 * 
 * Main server entry point for the enterprise CRM system.
 * This server provides RESTful APIs for ObjectQL queries, triggers, and UI rendering.
 */

import express, { Request, Response, NextFunction } from 'express';
import { db } from '@hotcrm/core';
import { executeSmartBriefing } from '@hotcrm/actions';
import { salesDashboard } from '@hotcrm/ui';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== API Routes ====================

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * ObjectQL Query Endpoint
 * POST /api/query
 */
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const query = req.body;
    const result = await db.query(query);
    res.json(result);
  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({
      error: 'Query failed',
      message: error.message
    });
  }
});

/**
 * Create Record Endpoint
 * POST /api/objects/:objectName
 */
app.post('/api/objects/:objectName', async (req: Request, res: Response) => {
  try {
    const { objectName } = req.params;
    const data = req.body;
    const result = await db.doc.create(objectName, data);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Create error:', error);
    res.status(500).json({
      error: 'Create failed',
      message: error.message
    });
  }
});

/**
 * Get Record Endpoint
 * GET /api/objects/:objectName/:id
 */
app.get('/api/objects/:objectName/:id', async (req: Request, res: Response) => {
  try {
    const { objectName, id } = req.params;
    const fields = req.query.fields ? (req.query.fields as string).split(',') : undefined;
    const result = await db.doc.get(objectName, id, { fields });
    res.json(result);
  } catch (error: any) {
    console.error('Get error:', error);
    res.status(404).json({
      error: 'Record not found',
      message: error.message
    });
  }
});

/**
 * Update Record Endpoint
 * PUT /api/objects/:objectName/:id
 */
app.put('/api/objects/:objectName/:id', async (req: Request, res: Response) => {
  try {
    const { objectName, id } = req.params;
    const data = req.body;
    await db.doc.update(objectName, id, data);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Update error:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error.message
    });
  }
});

/**
 * Delete Record Endpoint
 * DELETE /api/objects/:objectName/:id
 */
app.delete('/api/objects/:objectName/:id', async (req: Request, res: Response) => {
  try {
    const { objectName, id } = req.params;
    await db.doc.delete(objectName, id);
    res.json({ success: true, id });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: error.message
    });
  }
});

// ==================== Dashboard KPI Endpoints ====================

/**
 * Get Revenue KPI
 */
app.get('/api/kpi/revenue', async (req: Request, res: Response) => {
  try {
    // Mock data - in production, query from database
    res.json({
      revenue: 12500000,
      growth: 23.5,
      previousQuarter: 10125000
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Leads KPI
 */
app.get('/api/kpi/leads', async (req: Request, res: Response) => {
  try {
    res.json({
      count: 156,
      qualified: 89,
      unqualified: 67
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Win Rate KPI
 */
app.get('/api/kpi/winrate', async (req: Request, res: Response) => {
  try {
    res.json({
      rate: 68,
      won: 34,
      total: 50
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Pipeline Stages
 */
app.get('/api/pipeline/stages', async (req: Request, res: Response) => {
  try {
    res.json({
      stages: [
        { stage: '潜在客户', amount: 5000000 },
        { stage: '需求确认', amount: 3800000 },
        { stage: '方案设计', amount: 2500000 },
        { stage: '方案展示', amount: 1800000 },
        { stage: '商务谈判', amount: 1200000 }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Recent Activities
 */
app.get('/api/activities/recent', async (req: Request, res: Response) => {
  try {
    res.json({
      activities: [
        {
          userName: '张伟',
          userAvatar: '/avatars/zhangwei.jpg',
          actionText: '创建了新商机',
          subject: '阿里巴巴 - 企业级CRM采购',
          relativeTime: '2小时前',
          status: '进行中',
          statusColor: 'bg-blue-100 text-blue-800'
        },
        {
          userName: '李娜',
          userAvatar: '/avatars/lina.jpg',
          actionText: '更新了客户',
          subject: '腾讯科技有限公司',
          relativeTime: '4小时前',
          status: '已完成',
          statusColor: 'bg-green-100 text-green-800'
        },
        {
          userName: '王强',
          userAvatar: '/avatars/wangqiang.jpg',
          actionText: '赢得了商机',
          subject: '字节跳动 - 销售自动化项目',
          relativeTime: '昨天',
          status: '成交',
          statusColor: 'bg-purple-100 text-purple-800'
        }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AI Endpoints ====================

/**
 * AI Smart Briefing Endpoint
 * POST /api/ai/smart-briefing
 */
app.post('/api/ai/smart-briefing', async (req: Request, res: Response) => {
  try {
    const { accountId, activityLimit } = req.body;
    
    if (!accountId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'accountId is required'
      });
    }
    
    const briefing = await executeSmartBriefing({ accountId, activityLimit });
    res.json({ briefing });
    
  } catch (error: any) {
    console.error('AI Smart Briefing error:', error);
    res.status(500).json({
      error: 'Smart Briefing failed',
      message: error.message
    });
  }
});

// ==================== UI Endpoints ====================

/**
 * Get Sales Dashboard Configuration
 */
app.get('/api/ui/dashboard/sales', (req: Request, res: Response) => {
  res.json(salesDashboard);
});

// ==================== Error Handling ====================

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

/**
 * Global error handler
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message
  });
});

// ==================== Server Startup ====================

/**
 * Start the server
 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔥 HotCRM - Enterprise CRM System                      ║
║                                                           ║
║   Server running on http://localhost:${PORT}              ║
║   Health check: http://localhost:${PORT}/health          ║
║                                                           ║
║   📊 Dashboard: /api/ui/dashboard/sales                  ║
║   🤖 AI Briefing: /api/ai/smart-briefing                 ║
║   🔍 ObjectQL: /api/query                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

export default app;
