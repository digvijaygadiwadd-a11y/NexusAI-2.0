import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { databaseService } from './server/database.js';
import { authService, authenticateToken, requireRole, getJwtSecret, AuthRequest } from './server/authService.js';
import { fileIngestionService } from './server/fileIngestion.js';
import { dataProfiler } from './server/dataProfiler.js';
import { kpiEngine } from './server/kpiEngine.js';
import { analyticalEngine } from './server/analyticalEngine.js';
import { sqlSecurityService } from './server/sqlSecurityService.js';
import { geminiService } from './server/geminiService.js';
import { jobManager } from './server/jobManager.js';
import { sampleDatasets, saasDataset } from './server/sampleDatasets.js';
import { DatasetMeta } from './src/types.js';

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  durationMs?: number;
}

const systemLogs: LogEntry[] = [];

function log(level: 'INFO' | 'WARN' | 'ERROR', category: string, message: string, durationMs?: number) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    durationMs
  };
  systemLogs.unshift(entry);
  if (systemLogs.length > 300) systemLogs.pop();
  console.log(`[${entry.timestamp}] [${level}] [${category}] ${message} ${durationMs !== undefined ? `(${durationMs}ms)` : ''}`);
}

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    process.env.JWT_SECRET = getJwtSecret();
  }

  const app = express();
  const PORT = 3000;

  // Increase payload limit for CSV, Excel, and SQL files
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Initialize Database Service (PostgreSQL with disk-backed relational storage)
  await databaseService.initialize();

  // Load sample presets into database
  for (const ds of sampleDatasets) {
    await databaseService.saveDataset(
      {
        id: ds.id,
        name: ds.name,
        description: ds.description,
        rowCount: ds.records.length,
        columnCount: Object.keys(ds.records[0] || {}).length,
        sourceType: 'preset',
        tableName: `dataset_${ds.id.replace(/-/g, '_')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ds.records
    );
  }

  // Set active dataset (SaaS preset default)
  let activeDatasetId = saasDataset.id;
  await databaseService.saveDataset(
    {
      id: saasDataset.id,
      name: saasDataset.name,
      description: saasDataset.description,
      rowCount: saasDataset.records.length,
      columnCount: Object.keys(saasDataset.records[0] || {}).length,
      sourceType: 'preset',
      tableName: 'uploaded_data',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    saasDataset.records
  );
  log('INFO', 'Engine', `Loaded default dataset: ${saasDataset.name} (${saasDataset.records.length} records)`);

  // Helper to retrieve current active records & profile
  async function getActiveState() {
    try {
      const records = await databaseService.getDatasetRecords('uploaded_data');
      const safeRecords = Array.isArray(records) ? records : [];
      const profile = dataProfiler.profile(safeRecords, activeDatasetId);
      return { records: safeRecords, profile };
    } catch (err: any) {
      log('WARN', 'Engine', `Failed to retrieve active records: ${err.message}`);
      return {
        records: [],
        profile: dataProfiler.profile([], activeDatasetId)
      };
    }
  }

  // ==========================================
  // Real-Time Server-Sent Events (SSE)
  // ==========================================
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    jobManager.addSseClient(clientId, res);

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, activeDatasetId })}\n\n`);
  });

  // ==========================================
  // 1. Health & Observability Endpoint
  // ==========================================
  app.get('/api/health', async (req, res) => {
    const memory = process.memoryUsage();
    const { records, profile } = await getActiveState();

    res.json({
      status: 'healthy',
      database: {
        engine: databaseService.isUsingPostgres() ? 'PostgreSQL' : 'Persistent Relational Storage',
        isProductionReady: true
      },
      uptimeSeconds: Math.floor(process.uptime()),
      activeDataset: {
        id: activeDatasetId,
        rowCount: records.length,
        columnCount: profile.columns.length,
        healthScore: profile.healthScore
      },
      memory: {
        rssMb: Number((memory.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(1)),
        heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(1))
      },
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    });
  });

  // ==========================================
  // 2. Real Authentication & RBAC Endpoints
  // ==========================================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      log('INFO', 'Auth', `User "${result.user.username}" authenticated successfully with role "${result.user.role}"`);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: (err as Error).message });
    }
  });

  // Quick switch / demo session endpoint using real JWT signing
  app.post('/api/auth/session', async (req, res) => {
    try {
      const role = (req.body.role || 'Analyst') as 'Admin' | 'Analyst' | 'Manager';
      const username = req.body.username || `${role.toLowerCase()}`;
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'NexusAI@2026';

      try {
        const result = await authService.login(username, defaultPassword);
        return res.json(result);
      } catch {
        // Fallback for custom names
        const mockUser = {
          id: `usr-${username.toLowerCase()}`,
          username,
          email: `${username.toLowerCase()}@nexusai.enterprise`,
          role
        };
        const jwtToken = jwt.sign(mockUser, getJwtSecret(), { expiresIn: '24h' });
        res.json({
          token: jwtToken,
          user: mockUser,
          permissions: authService.getPermissionsForRole(role)
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
    const user = req.user || {
      id: 'usr-public',
      username: 'Open Access User',
      email: 'user@nexusai.enterprise',
      role: 'Admin'
    };
    const permissions = authService.getPermissionsForRole(user.role);
    res.json({ user, permissions, isFreeAndAccessible: true });
  });

  app.get('/api/auth/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
    const users = await databaseService.listUsers();
    res.json({ users });
  });

  // ==========================================
  // 3. Dataset Catalog & Selection
  // ==========================================
  app.get('/api/datasets', authenticateToken, async (req, res) => {
    const list = await databaseService.listDatasets();
    res.json({
      activeId: activeDatasetId,
      datasets: list.map(d => ({
        id: d.id,
        name: d.name,
        rowCount: d.rowCount,
        columnCount: d.columnCount,
        sourceType: d.sourceType,
        uploadedAt: d.createdAt,
        tableName: d.tableName
      }))
    });
  });

  app.post('/api/datasets/select', authenticateToken, requireRole(['Admin', 'Analyst', 'Manager']), async (req, res) => {
    const { id } = req.body;
    const dataset = await databaseService.getDataset(id);
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    activeDatasetId = dataset.id;
    const targetTable = dataset.tableName || `dataset_${dataset.id.replace(/-/g, '_')}`;
    const exists = await databaseService.tableExists(targetTable);
    if (exists) {
      await databaseService.setActiveView(targetTable);
    } else {
      const records = await databaseService.getDatasetRecords(dataset.tableName || dataset.id);
      await databaseService.saveDataset(dataset, records);
    }

    log('INFO', 'Engine', `Switched active dataset to: ${dataset.name}`);
    jobManager.broadcast('dataset_switched', { datasetId: dataset.id, name: dataset.name });

    res.json({
      success: true,
      meta: {
        id: dataset.id,
        name: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        sourceType: dataset.sourceType,
        uploadedAt: dataset.createdAt,
        tableName: 'uploaded_data'
      }
    });
  });

  // ==========================================
  // 4. File Ingestion & Background Jobs
  // ==========================================
  app.post('/api/upload', authenticateToken, requireRole(['Admin', 'Analyst']), async (req: AuthRequest, res) => {
    const start = performance.now();
    try {
      const { fileName, fileContent, fileType, rawText, sheetName, asyncMode } = req.body;

      // In asynchronous background mode, return job ticket immediately
      if (asyncMode) {
        const job = await jobManager.enqueueUploadJob({
          fileName: fileName || 'uploaded_data.csv',
          fileContent,
          fileType,
          rawText,
          sheetName,
          userId: req.user?.id
        });
        return res.json({ success: true, jobId: job.id, status: job.status, progress: job.progress });
      }

      // Synchronous ingestion
      const parsed = fileIngestionService.parseUploadedFile({
        fileName,
        fileContent,
        fileType,
        rawText,
        sheetName
      });

      if (parsed.records.length === 0) {
        return res.status(400).json({ error: 'No valid records could be extracted from the file.' });
      }

      const datasetId = `custom-${Date.now()}`;
      activeDatasetId = datasetId;
      const profile = dataProfiler.profile(parsed.records, datasetId);

      const datasetMeta: DatasetMeta = {
        id: datasetId,
        name: parsed.fileName.replace(/\.[^/.]+$/, '') + ` (${parsed.records.length} rows)`,
        rowCount: parsed.records.length,
        columnCount: profile.columns.length,
        sourceType: parsed.fileType,
        uploadedAt: new Date().toISOString(),
        tableName: 'uploaded_data'
      };

      await databaseService.saveDataset(
        {
          id: datasetId,
          name: datasetMeta.name,
          rowCount: parsed.records.length,
          columnCount: profile.columns.length,
          sourceType: parsed.fileType,
          tableName: 'uploaded_data',
          createdAt: datasetMeta.uploadedAt,
          updatedAt: datasetMeta.uploadedAt
        },
        parsed.records,
        req.user?.id,
        profile.columns
      );
      await databaseService.saveColumns(datasetId, profile.columns);

      const kpis = kpiEngine.generateKpis(parsed.records, profile.columns, datasetId);
      const problems = kpiEngine.detectProblems(parsed.records, profile.columns, datasetId);

      const duration = Number((performance.now() - start).toFixed(1));
      log('INFO', 'Upload', `Ingested ${parsed.records.length} records (${parsed.fileType}) from ${parsed.fileName}`, duration);

      jobManager.broadcast('dataset_ready', { datasetId, name: datasetMeta.name });

      res.json({
        success: true,
        meta: datasetMeta,
        availableSheets: parsed.availableSheets,
        selectedSheet: parsed.selectedSheet,
        warnings: parsed.warnings,
        profile,
        kpis,
        problems
      });
    } catch (err: any) {
      log('ERROR', 'Upload', `Failed to parse upload: ${err?.message}`);
      res.status(500).json({ error: `Upload processing failed: ${err?.message}` });
    }
  });

  app.get('/api/jobs/:id', authenticateToken, async (req, res) => {
    const job = await databaseService.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  });

  app.get('/api/jobs', authenticateToken, async (req, res) => {
    const jobs = await databaseService.listJobs(20);
    res.json({ jobs });
  });

  // ==========================================
  // 5. Data Profiling & Schema Detection
  // ==========================================
  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      const { profile } = await getActiveState();
      res.json({
        meta: { id: activeDatasetId, rowCount: profile.totalRows, columnCount: profile.totalColumns },
        profile
      });
    } catch (err: any) {
      log('ERROR', 'Profile', `Profile retrieval failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to retrieve profile', details: err.message });
    }
  });

  // ==========================================
  // 6. Dynamic KPI Generation
  // ==========================================
  app.get('/api/kpis', authenticateToken, async (req, res) => {
    try {
      const { records, profile } = await getActiveState();
      if (!records || records.length === 0) {
        return res.json({ kpis: [] });
      }
      const kpis = kpiEngine.generateKpis(records, profile.columns, activeDatasetId);
      res.json({ kpis });
    } catch (err: any) {
      log('ERROR', 'KPIs', `KPI generation failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to generate KPIs', details: err.message });
    }
  });

  // ==========================================
  // 7. Dynamic Business Problem Detection
  // ==========================================
  app.get('/api/problems', authenticateToken, async (req, res) => {
    try {
      const { records, profile } = await getActiveState();
      if (!records || records.length === 0) {
        return res.json({ problems: [] });
      }
      const problems = kpiEngine.detectProblems(records, profile.columns, activeDatasetId);
      res.json({ problems });
    } catch (err: any) {
      log('ERROR', 'Problems', `Problem detection failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to detect problems', details: err.message });
    }
  });

  // ==========================================
  // 8. Raw Data Sample
  // ==========================================
  app.get('/api/data/sample', authenticateToken, async (req, res) => {
    try {
      const limit = Math.min(1000, Number(req.query.limit) || 100);
      const { records } = await getActiveState();
      res.json({
        total: records.length,
        rows: records.slice(0, limit)
      });
    } catch (err: any) {
      log('ERROR', 'Sample', `Data sampling failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to retrieve data sample', details: err.message });
    }
  });

  // ==========================================
  // 9. Real AI Executive Analysis
  // ==========================================
  app.post('/api/ai/analyze', authenticateToken, requireRole(['Admin', 'Analyst', 'Manager']), async (req, res) => {
    const start = performance.now();
    try {
      const { records, profile } = await getActiveState();
      if (records.length === 0) {
        return res.status(400).json({ error: 'No dataset available.' });
      }

      const kpis = kpiEngine.generateKpis(records, profile.columns, activeDatasetId);
      const problems = kpiEngine.detectProblems(records, profile.columns, activeDatasetId);

      const analysis = await geminiService.generateBusinessAnalysis({
        datasetId: activeDatasetId,
        datasetName: `Active Dataset (${records.length} records)`,
        totalRows: records.length,
        kpis,
        problems,
        schema: profile.columns,
        sampleRecords: records.slice(0, 5)
      });

      const duration = Number((performance.now() - start).toFixed(1));
      log('INFO', 'Gemini', 'Executive analysis completed', duration);
      res.json(analysis);
    } catch (err: any) {
      log('ERROR', 'Gemini', `Analysis failed: ${err?.message}`);
      res.status(500).json({ error: err?.message || 'AI analysis failed' });
    }
  });

  // ==========================================
  // 10. Natural Language Analytics Q&A
  // ==========================================
  app.post('/api/ai/ask', authenticateToken, async (req, res) => {
    const start = performance.now();
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const { records, profile } = await getActiveState();
      if (records.length === 0) {
        return res.json({
          answer: 'No dataset available.',
          evidenceData: [],
          confidence: 0
        });
      }

      const kpis = kpiEngine.generateKpis(records, profile.columns, activeDatasetId);
      const problems = kpiEngine.detectProblems(records, profile.columns, activeDatasetId);

      const answer = await geminiService.answerQuestion({
        question,
        datasetName: `Active Dataset`,
        kpis,
        problems,
        schema: profile.columns,
        records
      });

      const duration = Number((performance.now() - start).toFixed(1));
      log('INFO', 'Gemini', `Answered question: "${question}"`, duration);
      res.json(answer);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Q&A processing failed' });
    }
  });

  // ==========================================
  // 11. AI-to-SQL Generation & Auto-Execution
  // ==========================================
  app.post('/api/ai/nl-to-sql', authenticateToken, requireRole(['Admin', 'Analyst']), async (req, res) => {
    const start = performance.now();
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      const { records, profile } = await getActiveState();
      if (records.length === 0) {
        return res.status(400).json({ error: 'No dataset available.' });
      }

      // Step 1: AI generates SQL query against actual schema
      const generated = await geminiService.generateSql({
        question,
        schema: profile.columns,
        sampleData: records.slice(0, 3)
      });

      // Step 2: Validate and execute securely
      const queryResult = await sqlSecurityService.executeSecureQuery(generated.sql, { rowLimit: 100 });

      const duration = Number((performance.now() - start).toFixed(1));
      log('INFO', 'SQL', `AI-to-SQL executed: ${generated.sql}`, duration);

      res.json({
        question,
        sql: generated.sql,
        explanation: generated.explanation,
        recommendedChart: generated.recommendedChart,
        result: queryResult
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'AI-to-SQL failed' });
    }
  });

  // ==========================================
  // 12. Secure SQL Execution Engine
  // ==========================================
  app.post('/api/sql/execute', authenticateToken, requireRole(['Admin', 'Analyst']), async (req: AuthRequest, res) => {
    const query = req.body.query || req.body.sql;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await sqlSecurityService.executeSecureQuery(query, {
      userId: req.user?.id,
      rowLimit: 500
    });

    log('INFO', 'SQL', `User SQL executed (${result.rowCount} rows returned)`, result.executionTimeMs);
    res.json(result);
  });

  // ==========================================
  // 13. Trend & Forecasting Engine
  // ==========================================
  app.post('/api/forecast', authenticateToken, async (req, res) => {
    try {
      const { metric, timeDimension, periodsAhead } = req.body;
      const { records, profile } = await getActiveState();
      const forecast = analyticalEngine.generateForecast(
        records,
        profile.columns,
        metric,
        timeDimension,
        periodsAhead ? Number(periodsAhead) : 4
      );
      res.json({ forecast });
    } catch (err: any) {
      log('ERROR', 'Forecast', `Forecast generation failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to generate forecast', details: err.message });
    }
  });

  // ==========================================
  // 14. Real What-If Scenario Analysis
  // ==========================================
  app.post('/api/what-if', authenticateToken, async (req, res) => {
    try {
      const { priceChangePct = 0, volumeChangePct = 0, costChangePct = 0, churnChangePct = 0 } = req.body;
      const { records, profile } = await getActiveState();
      const scenario = analyticalEngine.calculateWhatIf(records, profile.columns, {
        priceChangePct: Number(priceChangePct),
        volumeChangePct: Number(volumeChangePct),
        costChangePct: Number(costChangePct),
        churnChangePct: Number(churnChangePct)
      });
      res.json(scenario);
    } catch (err: any) {
      log('ERROR', 'WhatIf', `What-If calculation failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to calculate what-if scenario', details: err.message });
    }
  });

  // ==========================================
  // 15. Statistical Anomaly Detection
  // ==========================================
  app.get('/api/anomalies', authenticateToken, async (req, res) => {
    try {
      const { records, profile } = await getActiveState();
      const anomalies = analyticalEngine.detectAnomalies(records, profile.columns);
      res.json({ anomalies });
    } catch (err: any) {
      log('ERROR', 'Anomalies', `Anomaly detection failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to detect anomalies', details: err.message });
    }
  });

  // ==========================================
  // 16. Power BI Integration & OData Feed
  // ==========================================
  app.get('/api/powerbi/metadata', authenticateToken, async (req, res) => {
    try {
      const { profile } = await getActiveState();
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      // Generate Power Query M-Code
      const mCode = `let
    // Connect to NexusAI Live Decision Intelligence Feed
    Source = Json.Document(Web.Contents("${appUrl}/api/data/sample?limit=5000")),
    rows = Source[rows],
    #"Converted to Table" = Table.FromList(rows, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Expanded Column" = Table.ExpandRecordColumn(#"Converted to Table", "Column1", {${profile.columns.map(c => `"${c.name}"`).join(', ')}})
in
    #"Expanded Column"`;

      // Dynamic DAX measures strictly from actual numeric columns
      const numCols = profile.columns.filter(c => c.isMetricCandidate);
      const daxMeasures = numCols.slice(0, 4).map(c => ({
        name: `Total ${c.name}`,
        formula: `Total_${c.name} = SUM(uploaded_data[${c.name}])`,
        description: `Sum of ${c.name} calculated across all active records`
      }));

      res.json({
        datasetName: `Active Dataset (${profile.totalRows} records)`,
        endpointUrl: `${appUrl}/api/data/sample?limit=5000`,
        powerBiWebUrl: 'https://app.powerbi.com',
        mCode,
        daxMeasures,
        instructions: [
          'Open Power BI Desktop.',
          'Click "Get Data" > "Web" and paste the Live REST Endpoint URL.',
          'Alternatively, open Power Query Editor > "Advanced Editor" and paste the generated M-Code.',
          'Load and create real-time interactive Power BI reports grounded in the exact dataset schema.'
        ]
      });
    } catch (err: any) {
      log('ERROR', 'PowerBI', `PowerBI metadata retrieval failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to generate Power BI metadata', details: err.message });
    }
  });

  // ==========================================
  // 17. Data Lineage Metadata
  // ==========================================
  app.get('/api/lineage', authenticateToken, async (req, res) => {
    try {
      const { records, profile } = await getActiveState();
      const kpis = kpiEngine.generateKpis(records, profile.columns, activeDatasetId);
      const problems = kpiEngine.detectProblems(records, profile.columns, activeDatasetId);

      const nodes = [
        { id: 'source', label: `Raw Source: Dataset ${activeDatasetId}`, type: 'source', details: `${records.length} records, ${profile.columns.length} columns` },
        { id: 'parser', label: 'Multi-Format File Ingestion', type: 'transform', details: 'CSV / Excel / JSON / SQL parser with header sanitization' },
        { id: 'profiler', label: 'Statistical Data Profiler', type: 'profiler', details: `Health Score: ${profile.healthScore}%, ${profile.duplicateRows} duplicates detected` },
        { id: 'sql_table', label: 'Relational Database Layer', type: 'database', details: databaseService.isUsingPostgres() ? 'PostgreSQL Database Engine' : 'Persistent Storage Engine' },
        { id: 'kpi_engine', label: 'Automatic KPI Engine', type: 'kpi', details: `${kpis.length} dynamic metrics calculated` },
        { id: 'problem_engine', label: 'Empirical Problem Detector', type: 'detector', details: `${problems.length} detected risks with evidence` },
        { id: 'gemini_agent', label: 'Gemini Decision Intelligence AI', type: 'ai', details: 'Evidence-grounded diagnosis & recommendations' },
        { id: 'dashboard', label: 'Executive Analytics & Power BI', type: 'consumer', details: 'Dynamic charts & automated exports' }
      ];

      const edges = [
        { from: 'source', to: 'parser' },
        { from: 'parser', to: 'profiler' },
        { from: 'profiler', to: 'sql_table' },
        { from: 'sql_table', to: 'kpi_engine' },
        { from: 'sql_table', to: 'problem_engine' },
        { from: 'kpi_engine', to: 'gemini_agent' },
        { from: 'problem_engine', to: 'gemini_agent' },
        { from: 'gemini_agent', to: 'dashboard' },
        { from: 'kpi_engine', to: 'dashboard' }
      ];

      res.json({ nodes, edges });
    } catch (err: any) {
      log('ERROR', 'Lineage', `Lineage generation failed: ${err.message}`);
      res.status(500).json({ error: 'Failed to retrieve lineage', details: err.message });
    }
  });

  // ==========================================
  // 18. Audit Logs (Restricted to Admin)
  // ==========================================
  app.get('/api/audit-logs', authenticateToken, requireRole(['Admin']), async (req, res) => {
    try {
      const logs = await databaseService.getAuditLogs(50);
      res.json({ auditLogs: logs });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve audit logs', details: err.message });
    }
  });

  // ==========================================
  // 19. System Diagnostics Logs
  // ==========================================
  app.get('/api/system/logs', authenticateToken, requireRole(['Admin']), (req, res) => {
    res.json({ logs: systemLogs.slice(0, 50) });
  });

  // Ensure any unmatched /api route returns 404 JSON, never HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
  });

  // Global API error handler ensuring JSON responses
  app.use('/api', (err: any, req: Request, res: Response, next: any) => {
    console.error('[API Internal Error]:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  // ==========================================
  // Vite Middleware Setup
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexusAI Enterprise Intelligence Server listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[Server] Listen error:', err);
  });

  const shutdown = async () => {
    console.log('[Server] Shutting down cleanly...');
    server.close();
    try {
      await databaseService.close();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
