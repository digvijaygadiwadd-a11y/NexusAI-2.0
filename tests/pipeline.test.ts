import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { dataProfiler } from '../server/dataProfiler.js';
import { kpiEngine } from '../server/kpiEngine.js';
import { sqlSecurityService } from '../server/sqlSecurityService.js';
import { analyticalEngine } from '../server/analyticalEngine.js';
import { fileIngestionService } from '../server/fileIngestion.js';
import { databaseService } from '../server/database.js';

describe('NexusAI Enterprise Decision Intelligence Platform Suite', () => {

  describe('1. Mathematical Data Profiling', () => {
    test('Calculates exact statistical metrics and detects outliers', () => {
      const records = [
        { id: '1', region: 'North', sales: 100, cost: 60 },
        { id: '2', region: 'North', sales: 120, cost: 70 },
        { id: '3', region: 'South', sales: 110, cost: 65 },
        { id: '4', region: 'East', sales: 130, cost: 75 },
        { id: '5', region: 'West', sales: 500, cost: 250 }, // Outlier
        { id: '6', region: 'West', sales: 105, cost: 62 },
        { id: '7', region: 'South', sales: null, cost: 60 } // Null sales
      ];

      const profile = dataProfiler.profile(records, 'test-dataset');
      assert.equal(profile.totalRows, 7);
      assert.equal(profile.totalColumns, 4);

      const salesCol = profile.columns.find(c => c.name === 'sales');
      assert.ok(salesCol);
      assert.equal(salesCol.nullCount, 1);
      assert.equal(salesCol.isMetricCandidate, true);
      assert.ok(salesCol.stats);
      assert.equal(salesCol.stats.min, 100);
      assert.equal(salesCol.stats.max, 500);
      assert.ok(salesCol.stats.mean > 0);
      assert.ok(salesCol.stats.outlierCount! >= 1);
    });

    test('Identifies duplicate rows accurately', () => {
      const records = [
        { sku: 'A', price: 10 },
        { sku: 'B', price: 20 },
        { sku: 'A', price: 10 } // duplicate
      ];
      const profile = dataProfiler.profile(records, 'test-dup');
      assert.equal(profile.duplicateRows, 1);
    });
  });

  describe('2. Dynamic KPI Generation', () => {
    test('Computes Revenue, Cost, and Profit Margin dynamically without hardcoded assumptions', () => {
      const records = [
        { month: '2024-01', revenue: 10000, cost: 6000 },
        { month: '2024-02', revenue: 12000, cost: 7000 },
        { month: '2024-03', revenue: 14000, cost: 8000 }
      ];

      const profile = dataProfiler.profile(records, 'test-kpi');
      const kpis = kpiEngine.generateKpis(records, profile.columns, 'test-kpi');

      const revKpi = kpis.find(k => k.title.includes('Revenue'));
      assert.ok(revKpi);
      assert.equal(revKpi.value, 36000);

      const costKpi = kpis.find(k => k.title.includes('Cost'));
      assert.ok(costKpi);
      assert.equal(costKpi.value, 21000);

      const marginKpi = kpis.find(k => k.title.includes('Margin'));
      assert.ok(marginKpi);
      // Profit = 36000 - 21000 = 15000 -> 15000 / 36000 = 41.7%
      assert.equal(marginKpi.value, 41.7);
    });
  });

  describe('3. SQL Security AST Validation', () => {
    test('Permits valid SELECT and WITH queries', () => {
      const selectValid = sqlSecurityService.validateSql('SELECT category, SUM(sales) FROM uploaded_data GROUP BY category');
      assert.equal(selectValid.valid, true);

      const withValid = sqlSecurityService.validateSql('WITH monthly AS (SELECT month, sales FROM uploaded_data) SELECT * FROM monthly');
      assert.equal(withValid.valid, true);
    });

    test('Strictly blocks dangerous DDL and DML operations', () => {
      const dropAttempt = sqlSecurityService.validateSql('DROP TABLE users');
      assert.equal(dropAttempt.valid, false);

      const deleteAttempt = sqlSecurityService.validateSql('DELETE FROM uploaded_data WHERE 1=1');
      assert.equal(deleteAttempt.valid, false);

      const insertAttempt = sqlSecurityService.validateSql('INSERT INTO users (username) VALUES ("hacker")');
      assert.equal(insertAttempt.valid, false);

      const truncateAttempt = sqlSecurityService.validateSql('TRUNCATE TABLE logs');
      assert.equal(truncateAttempt.valid, false);

      const multiStatement = sqlSecurityService.validateSql('SELECT 1; DROP TABLE users;');
      assert.equal(multiStatement.valid, false);
    });
  });

  describe('4. What-If Scenario Sensitivity Modeling', () => {
    test('Simulates sensitivity derived strictly from baseline data', () => {
      const records = [
        { revenue: 100000, cost: 70000, profit: 30000 }
      ];
      const profile = dataProfiler.profile(records, 'test-whatif');
      const scenario = analyticalEngine.calculateWhatIf(records, profile.columns, {
        priceChangePct: 10,
        volumeChangePct: 0,
        costChangePct: 0,
        churnChangePct: 0
      });

      assert.equal(scenario.baselineRevenue, 100000);
      assert.equal(scenario.baselineProfit, 30000);
      assert.equal(scenario.baselineMarginPct, 30);
      assert.equal(scenario.projectedRevenue, 110000);
      assert.equal(scenario.deltaRevenue, 10000);
    });
  });

  describe('5. Multi-Format File Ingestion', () => {
    test('Parses CSV with header sanitization and date formatting', () => {
      const csvContent = 'Region,Total Sales,Date\nNorth,500,2024-01-15\nSouth,750,2024-01-16';
      const parsed = fileIngestionService.parseUploadedFile({
        fileName: 'data.csv',
        rawText: csvContent
      });

      assert.equal(parsed.rowCount, 2);
      assert.equal(parsed.fileType, 'csv');
      assert.ok(parsed.records[0].total_sales !== undefined);
      assert.equal(parsed.records[0].total_sales, 500);
    });

    test('Parses JSON array and normalizes keys', () => {
      const jsonContent = JSON.stringify([
        { 'Customer Name': 'Acme Corp', 'ARR (USD)': 50000 },
        { 'Customer Name': 'Beta LLC', 'ARR (USD)': 35000 }
      ]);
      const parsed = fileIngestionService.parseUploadedFile({
        fileName: 'data.json',
        rawText: jsonContent
      });

      assert.equal(parsed.rowCount, 2);
      assert.equal(parsed.fileType, 'json');
      assert.ok(parsed.records[0].customer_name !== undefined);
    });
  });

  describe('6. Full End-to-End Decision Pipeline Test', () => {
    test('Executes Ingestion -> Profiling -> KPIs -> SQL -> Evidence extraction', async () => {
      // Initialize database
      await databaseService.initialize();

      // 1. Ingestion
      const rawCsv = 'Department,Budget,Spend\nSales,50000,42000\nEngineering,120000,115000\nMarketing,30000,34000';
      const parsed = fileIngestionService.parseUploadedFile({
        fileName: 'budget.csv',
        rawText: rawCsv
      });
      assert.equal(parsed.rowCount, 3);

      // 2. Profiling
      const profile = dataProfiler.profile(parsed.records, 'e2e-dataset');
      assert.equal(profile.totalRows, 3);
      assert.equal(profile.columns.length, 3);

      // 3. Dynamic KPIs
      const kpis = kpiEngine.generateKpis(parsed.records, profile.columns, 'e2e-dataset');
      assert.ok(kpis.length >= 2);

      // Save into database layer for SQL query access
      await databaseService.saveDataset(
        {
          id: 'e2e-dataset',
          name: 'Budget Data',
          rowCount: 3,
          columnCount: 3,
          sourceType: 'csv',
          tableName: 'uploaded_data',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        parsed.records
      );

      // 4. Secure SQL Execution
      const sqlResult = await sqlSecurityService.executeSecureQuery(
        'SELECT department, budget, spend FROM uploaded_data WHERE spend > 40000'
      );
      assert.equal(sqlResult.error, undefined);
      assert.equal(sqlResult.rowCount, 2);

      // 5. Evidence Extraction
      const rows = sqlResult.rows;
      assert.equal(rows.length, 2);
      assert.ok(rows.some(r => r.department === 'Engineering'));
    });
  });

  after(async () => {
    try {
      await databaseService.close();
    } catch {
      // ignore
    }
    process.exit(0);
  });
});
