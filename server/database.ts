import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import { Dataset, ColumnMetadata, KPIResult, BusinessProblem, EvidenceBackedRecommendation, DatasetJob } from './canonicalTypes.js';

const { Pool } = pg;

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'Admin' | 'Analyst' | 'Manager';
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id?: string;
  action: string;
  query_text?: string;
  duration_ms?: number;
  status: 'SUCCESS' | 'ERROR';
  error_message?: string;
  created_at: string;
}

class DatabaseService {
  private pgPool: pg.Pool | null = null;
  private pglite: PGlite | null = null;
  private isExternalPostgres: boolean = false;
  private storageDir: string = path.join(process.cwd(), 'data');
  private pgliteDataDir: string = path.join(process.cwd(), 'data', 'pgdata');
  private initialized: boolean = false;

  constructor() {
    if (!fs.existsSync(this.storageDir)) {
      try {
        fs.mkdirSync(this.storageDir, { recursive: true });
      } catch (e) {
        console.warn('Could not create data storage dir:', e);
      }
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl && !dbUrl.includes('placeholder')) {
      try {
        this.pgPool = new Pool({
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000
        });

        // Test connection
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();

        this.isExternalPostgres = true;
        console.log('[DatabaseService] Connected to external PostgreSQL database successfully.');
      } catch (err) {
        console.warn('[DatabaseService] External PostgreSQL connection failed. Initializing PGlite embedded PostgreSQL engine:', (err as Error).message);
        this.isExternalPostgres = false;
        this.pgPool = null;
      }
    }

    if (!this.pgPool) {
      // Clean up stale pid file if left from abnormal process termination
      const pidFile = path.join(this.pgliteDataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
          console.log('[DatabaseService] Removed stale postmaster.pid lock file.');
        } catch (e) {
          console.warn('[DatabaseService] Could not remove stale pid file:', e);
        }
      }

      try {
        // Initialize persistent PGlite PostgreSQL engine
        this.pglite = new PGlite(this.pgliteDataDir);
        await this.pglite.waitReady;
        console.log('[DatabaseService] Initialized embedded PostgreSQL engine (PGlite) at', this.pgliteDataDir);
      } catch (pgliteErr) {
        console.warn('[DatabaseService] Failed to initialize persistent PGlite at', this.pgliteDataDir, pgliteErr);
        // Wipe corrupted directory and retry once, or fallback to in-memory
        try {
          fs.rmSync(this.pgliteDataDir, { recursive: true, force: true });
          this.pglite = new PGlite(this.pgliteDataDir);
          await this.pglite.waitReady;
          console.log('[DatabaseService] Re-initialized fresh persistent PGlite engine.');
        } catch (retryErr) {
          console.warn('[DatabaseService] Persistent engine recovery failed, falling back to in-memory PGlite:', retryErr);
          this.pglite = new PGlite();
          await this.pglite.waitReady;
          console.log('[DatabaseService] Initialized in-memory fallback PGlite engine.');
        }
      }
    }

    await this.initDatabaseSchema();
    await this.seedDefaultRoles();
    await this.seedDefaultUsers();
    this.initialized = true;
  }

  public async close(): Promise<void> {
    if (this.pgPool) {
      try {
        await this.pgPool.end();
      } catch (e) {
        console.warn('[DatabaseService] Error closing pgPool:', e);
      }
      this.pgPool = null;
    }
    if (this.pglite) {
      try {
        await this.pglite.close();
      } catch (e) {
        console.warn('[DatabaseService] Error closing pglite:', e);
      }
      this.pglite = null;
    }
    const pidFile = path.join(this.pgliteDataDir, 'postmaster.pid');
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch {}
    }
    this.initialized = false;
  }

  /**
   * Unified SQL execution interface for both external PostgreSQL and embedded PGlite.
   * Both execute real PostgreSQL queries with full syntax and type support.
   */
  public async query(sql: string, params: any[] = []): Promise<{ rows: any[]; fields?: any[] }> {
    if (this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return { rows: res.rows, fields: res.fields };
    }
    if (this.pglite) {
      const res = await this.pglite.query(sql, params);
      return { rows: res.rows, fields: res.fields };
    }
    throw new Error('DatabaseService has not been initialized. Call initialize() first.');
  }

  private async initDatabaseSchema(): Promise<void> {
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        email VARCHAR(128) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'Analyst',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS roles (
        role_name VARCHAR(32) PRIMARY KEY,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS datasets (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        row_count INT NOT NULL DEFAULT 0,
        column_count INT NOT NULL DEFAULT 0,
        source_type VARCHAR(32) NOT NULL DEFAULT 'csv',
        table_name VARCHAR(64) NOT NULL,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dataset_columns (
        id VARCHAR(64) PRIMARY KEY,
        dataset_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        data_type VARCHAR(32) NOT NULL,
        is_metric BOOLEAN DEFAULT FALSE,
        is_dimension BOOLEAN DEFAULT FALSE,
        is_time BOOLEAN DEFAULT FALSE,
        stats_json JSONB
      );

      CREATE TABLE IF NOT EXISTS dataset_rows (
        id BIGSERIAL PRIMARY KEY,
        dataset_id VARCHAR(64) NOT NULL,
        row_index INT NOT NULL,
        row_data JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset ON dataset_rows(dataset_id);

      CREATE TABLE IF NOT EXISTS dataset_jobs (
        id VARCHAR(64) PRIMARY KEY,
        dataset_id VARCHAR(64),
        file_name VARCHAR(255),
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        progress INT DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        action VARCHAR(64) NOT NULL,
        query_text TEXT,
        duration_ms NUMERIC,
        status VARCHAR(32) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Split and execute statements
    const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await this.query(stmt);
    }
  }

  private async seedDefaultRoles(): Promise<void> {
    const roles = [
      { name: 'Admin', desc: 'Full administrative access: manage users, system settings, execute SQL, and upload datasets.' },
      { name: 'Analyst', desc: 'Analytical access: upload datasets, build KPIs, run AI queries, execute SQL, and perform forecasting.' },
      { name: 'Manager', desc: 'Executive access: view operational dashboards, review recommendations, and export reports.' }
    ];

    for (const r of roles) {
      await this.query(
        `INSERT INTO roles (role_name, description) VALUES ($1, $2)
         ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description`,
        [r.name, r.desc]
      );
    }
  }

  private async seedDefaultUsers(): Promise<void> {
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'NexusAI@2026';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);

    const defaultUsers: UserRecord[] = [
      {
        id: 'usr-admin',
        username: 'admin',
        email: 'admin@nexusai.enterprise',
        password_hash: hash,
        role: 'Admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr-analyst',
        username: 'analyst',
        email: 'analyst@nexusai.enterprise',
        password_hash: hash,
        role: 'Analyst',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'usr-manager',
        username: 'manager',
        email: 'manager@nexusai.enterprise',
        password_hash: hash,
        role: 'Manager',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const u of defaultUsers) {
      await this.query(
        `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()`,
        [u.id, u.username, u.email, u.password_hash, u.role, u.created_at, u.updated_at]
      );
    }
  }

  // User Authentication Queries
  public async findUserByUsername(usernameOrEmail: string): Promise<UserRecord | null> {
    const res = await this.query(
      `SELECT id, username, email, password_hash, role, created_at, updated_at
       FROM users
       WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [usernameOrEmail.trim()]
    );
    return (res.rows[0] as UserRecord) || null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    const res = await this.query(
      `SELECT id, username, email, password_hash, role, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return (res.rows[0] as UserRecord) || null;
  }

  public async createUser(user: Omit<UserRecord, 'created_at' | 'updated_at'>): Promise<UserRecord> {
    const now = new Date().toISOString();
    const fullUser: UserRecord = {
      ...user,
      created_at: now,
      updated_at: now
    };
    await this.query(
      `INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fullUser.id, fullUser.username, fullUser.email, fullUser.password_hash, fullUser.role, fullUser.created_at, fullUser.updated_at]
    );
    return fullUser;
  }

  public async listUsers(): Promise<Omit<UserRecord, 'password_hash'>[]> {
    const res = await this.query('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at ASC');
    return res.rows;
  }

  // Dataset Management with PostgreSQL tables and Isolation
  public async saveDataset(
    dataset: Dataset,
    records: Record<string, any>[],
    userId?: string,
    columns?: ColumnMetadata[]
  ): Promise<void> {
    const sanitizedId = dataset.id.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const tableName = `dataset_${sanitizedId}`;

    // 1. Insert/Update dataset catalog row
    await this.query(
      `INSERT INTO datasets (id, user_id, name, description, row_count, column_count, source_type, table_name, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         row_count = EXCLUDED.row_count,
         column_count = EXCLUDED.column_count,
         updated_at = NOW()`,
      [
        dataset.id,
        userId || 'usr-analyst',
        dataset.name,
        dataset.description || null,
        records.length,
        columns ? columns.length : (records[0] ? Object.keys(records[0]).length : 0),
        dataset.sourceType || 'csv',
        tableName,
        true, // Allow workspace members to see seeded/uploaded datasets
        dataset.createdAt || new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    // 2. Insert columns metadata
    if (columns && columns.length > 0) {
      await this.query('DELETE FROM dataset_columns WHERE dataset_id = $1', [dataset.id]);
      for (let idx = 0; idx < columns.length; idx++) {
        const col = columns[idx];
        await this.query(
          `INSERT INTO dataset_columns (id, dataset_id, name, data_type, is_metric, is_dimension, is_time, stats_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            `col-${dataset.id}-${idx}`,
            dataset.id,
            col.name,
            col.type,
            Boolean(col.isMetricCandidate),
            Boolean(col.isDimensionCandidate),
            Boolean(col.isTimeCandidate),
            JSON.stringify(col.stats || {})
          ]
        );
      }
    }

    // 3. Store raw rows in dataset_rows JSONB table (batch insert for performance)
    await this.query('DELETE FROM dataset_rows WHERE dataset_id = $1', [dataset.id]);
    const rowBatchSize = 100;
    for (let i = 0; i < records.length; i += rowBatchSize) {
      const batch = records.slice(i, i + rowBatchSize);
      const rowPlaceholders: string[] = [];
      const rowParams: any[] = [];
      batch.forEach((row, offset) => {
        const p1 = rowParams.length + 1;
        const p2 = rowParams.length + 2;
        const p3 = rowParams.length + 3;
        rowPlaceholders.push(`($${p1}, $${p2}, $${p3})`);
        rowParams.push(dataset.id, i + offset, JSON.stringify(row));
      });
      await this.query(
        `INSERT INTO dataset_rows (dataset_id, row_index, row_data) VALUES ${rowPlaceholders.join(', ')}`,
        rowParams
      );
    }

    // 4. Create dedicated relational PostgreSQL table with typed columns
    if (records.length > 0) {
      // Gather all unique keys across records to avoid missing columns
      const keysSet = new Set<string>();
      for (const r of records) {
        if (r && typeof r === 'object') {
          for (const k of Object.keys(r)) {
            keysSet.add(k);
          }
        }
      }
      const keys = Array.from(keysSet);

      if (keys.length > 0) {
        // Determine column data types by inspecting the full column distribution
        const colTypeMap: Record<string, 'NUMERIC' | 'BOOLEAN' | 'TEXT'> = {};

        for (const k of keys) {
          const nonNullVals = records
            .map(r => r[k])
            .filter(v => v !== null && v !== undefined && v !== '');

          if (nonNullVals.length === 0) {
            colTypeMap[k] = 'TEXT';
            continue;
          }

          // Check if boolean
          const isAllBool = nonNullVals.every(v =>
            typeof v === 'boolean' || ['true', 'false', 't', 'f'].includes(String(v).trim().toLowerCase())
          );
          if (isAllBool) {
            colTypeMap[k] = 'BOOLEAN';
            continue;
          }

          // Check if numeric
          let numericCount = 0;
          let nonNumericCount = 0;
          for (const v of nonNullVals) {
            if (typeof v === 'number') {
              if (!isNaN(v) && isFinite(v)) {
                numericCount++;
              } else {
                nonNumericCount++;
              }
            } else if (typeof v === 'string') {
              const clean = v.trim().replace(/[$,\s]/g, '').replace(/%$/, '');
              if (clean !== '' && !isNaN(Number(clean)) && isFinite(Number(clean))) {
                numericCount++;
              } else {
                nonNumericCount++;
              }
            } else {
              nonNumericCount++;
            }
          }

          const totalNonEmpty = nonNullVals.length;
          const numericRatio = numericCount / totalNonEmpty;

          // If >= 85% of values are numbers, treat as NUMERIC column,
          // allowing for summary labels or occasional empty/sentinel strings (e.g. "AVERAGE", "Total", "N/A", "-")
          // If it contains more than 15% text strings, treat as TEXT so categories/IDs are not lost.
          if (numericCount > 0 && numericRatio >= 0.85 && nonNumericCount <= Math.max(3, totalNonEmpty * 0.15)) {
            colTypeMap[k] = 'NUMERIC';
          } else {
            colTypeMap[k] = 'TEXT';
          }
        }

        const colDefs = keys.map(k => {
          const safeName = `"${k.replace(/"/g, '""')}"`;
          const type = colTypeMap[k] || 'TEXT';
          return `${safeName} ${type}`;
        });

        await this.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
        await this.query(`CREATE TABLE ${tableName} (
          _row_id SERIAL PRIMARY KEY,
          ${colDefs.join(', ')}
        )`);

        // Sanitization function strictly guaranteed not to pass non-numeric strings to NUMERIC columns
        const sanitizeValue = (val: any, colType: 'NUMERIC' | 'BOOLEAN' | 'TEXT'): any => {
          if (val === undefined || val === null || val === '') {
            return null;
          }

          if (colType === 'NUMERIC') {
            if (typeof val === 'number') {
              return isNaN(val) || !isFinite(val) ? null : val;
            }
            if (typeof val === 'string') {
              const clean = val.trim().replace(/[$,\s]/g, '').replace(/%$/, '');
              if (clean === '' || isNaN(Number(clean)) || !isFinite(Number(clean))) {
                // Non-numeric strings (like "AVERAGE", "Total", "N/A", "-") safely convert to null
                return null;
              }
              return Number(clean);
            }
            return null;
          }

          if (colType === 'BOOLEAN') {
            if (typeof val === 'boolean') return val;
            const str = String(val).trim().toLowerCase();
            if (str === 'true' || str === '1' || str === 't') return true;
            if (str === 'false' || str === '0' || str === 'f') return false;
            return null;
          }

          // colType === 'TEXT'
          if (typeof val === 'object') {
            return JSON.stringify(val);
          }
          return String(val);
        };

        // Insert records into dedicated table using efficient batch inserts
        const safeColList = keys.map(k => `"${k.replace(/"/g, '""')}"`).join(', ');
        const batchSize = Math.max(1, Math.floor(1000 / Math.max(1, keys.length)));

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const valuePlaceholders: string[] = [];
          const params: any[] = [];

          batch.forEach((row) => {
            const rowParams: string[] = [];
            keys.forEach((k) => {
              const paramIdx = params.length + 1;
              rowParams.push(`$${paramIdx}`);
              params.push(sanitizeValue(row[k], colTypeMap[k]));
            });
            valuePlaceholders.push(`(${rowParams.join(', ')})`);
          });

          await this.query(
            `INSERT INTO ${tableName} (${safeColList}) VALUES ${valuePlaceholders.join(', ')}`,
            params
          );
        }
      }
    }

    // 5. Point view 'uploaded_data' to this active dataset
    await this.setActiveView(tableName);
  }

  public async setActiveView(tableName: string): Promise<void> {
    await this.query(`DROP VIEW IF EXISTS uploaded_data CASCADE`);
    await this.query(`CREATE VIEW uploaded_data AS SELECT * FROM "${tableName.replace(/"/g, '""')}"`);
  }

  public async tableExists(tableName: string): Promise<boolean> {
    try {
      const res = await this.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [tableName]
      );
      return Boolean(res.rows[0]?.exists);
    } catch {
      return false;
    }
  }

  public async getDataset(id: string, userId?: string, userRole?: string): Promise<Dataset | null> {
    let sql = 'SELECT * FROM datasets WHERE id = $1';
    const params: any[] = [id];

    // Enforce dataset isolation for non-Admin users if private
    if (userId && userRole !== 'Admin') {
      sql += ' AND (user_id = $2 OR is_public = TRUE)';
      params.push(userId);
    }

    const res = await this.query(sql, params);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      rowCount: Number(r.row_count),
      columnCount: Number(r.column_count),
      sourceType: r.source_type,
      tableName: r.table_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }

  public async listDatasets(userId?: string, userRole?: string): Promise<Dataset[]> {
    let sql = 'SELECT * FROM datasets';
    const params: any[] = [];

    // Dataset isolation
    if (userId && userRole !== 'Admin') {
      sql += ' WHERE user_id = $1 OR is_public = TRUE';
      params.push(userId);
    }

    sql += ' ORDER BY created_at DESC';
    const res = await this.query(sql, params);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      rowCount: Number(r.row_count),
      columnCount: Number(r.column_count),
      sourceType: r.source_type,
      tableName: r.table_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  public async getDatasetRecords(tableNameOrId: string, limit = 10000): Promise<Record<string, any>[]> {
    try {
      // 1. Check if it's the active view 'uploaded_data'
      if (tableNameOrId === 'uploaded_data') {
        const res = await this.query(`SELECT * FROM uploaded_data LIMIT ${limit}`);
        return res.rows.map(({ _row_id, ...rest }) => rest);
      }

      // 2. Check if dataset exists by ID
      const dsRes = await this.query('SELECT table_name FROM datasets WHERE id = $1', [tableNameOrId]);
      if (dsRes.rows.length > 0) {
        const tbl = dsRes.rows[0].table_name;
        const res = await this.query(`SELECT * FROM ${tbl} LIMIT ${limit}`);
        return res.rows.map(({ _row_id, ...rest }) => rest);
      }

      // 3. Check directly by table name
      const res = await this.query(`SELECT * FROM ${tableNameOrId} LIMIT ${limit}`);
      return res.rows.map(({ _row_id, ...rest }) => rest);
    } catch {
      // Fallback to dataset_rows JSONB
      try {
        const jsonRes = await this.query('SELECT row_data FROM dataset_rows WHERE dataset_id = $1 ORDER BY row_index LIMIT $2', [tableNameOrId, limit]);
        return jsonRes.rows.map(r => typeof r.row_data === 'string' ? JSON.parse(r.row_data) : r.row_data);
      } catch {
        return [];
      }
    }
  }

  // Dataset Columns / Schema
  public async saveColumns(datasetId: string, columns: ColumnMetadata[]): Promise<void> {
    await this.query('DELETE FROM dataset_columns WHERE dataset_id = $1', [datasetId]);
    for (let idx = 0; idx < columns.length; idx++) {
      const col = columns[idx];
      await this.query(
        `INSERT INTO dataset_columns (id, dataset_id, name, data_type, is_metric, is_dimension, is_time, stats_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `col-${datasetId}-${idx}`,
          datasetId,
          col.name,
          col.type,
          Boolean(col.isMetricCandidate),
          Boolean(col.isDimensionCandidate),
          Boolean(col.isTimeCandidate),
          JSON.stringify(col.stats || {})
        ]
      );
    }
  }

  public async getColumns(datasetId: string): Promise<ColumnMetadata[]> {
    const res = await this.query('SELECT * FROM dataset_columns WHERE dataset_id = $1', [datasetId]);
    return res.rows.map(r => ({
      name: r.name,
      type: r.data_type,
      nullable: true,
      nullCount: 0,
      nullPercentage: 0,
      uniqueCount: 0,
      isConstant: false,
      isHighCardinality: false,
      invalidDatesCount: 0,
      invalidNumericCount: 0,
      sampleValues: [],
      isMetricCandidate: r.is_metric,
      isDimensionCandidate: r.is_dimension,
      isTimeCandidate: r.is_time,
      stats: typeof r.stats_json === 'string' ? JSON.parse(r.stats_json) : r.stats_json
    }));
  }

  // Background Job Processing
  public async createJob(job: DatasetJob): Promise<DatasetJob> {
    await this.query(
      `INSERT INTO dataset_jobs (id, dataset_id, file_name, job_type, status, progress, error_message, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [job.id, job.datasetId || null, job.fileName, job.jobType, job.status, job.progress, job.errorMessage || null, job.createdAt, job.completedAt || null]
    );
    return job;
  }

  public async updateJob(jobId: string, updates: Partial<DatasetJob>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
      if (updates.status === 'completed' || updates.status === 'failed') {
        fields.push(`completed_at = $${idx++}`);
        values.push(new Date().toISOString());
      }
    }
    if (updates.progress !== undefined) {
      fields.push(`progress = $${idx++}`);
      values.push(updates.progress);
    }
    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${idx++}`);
      values.push(updates.errorMessage);
    }
    if (updates.datasetId !== undefined) {
      fields.push(`dataset_id = $${idx++}`);
      values.push(updates.datasetId);
    }

    if (fields.length > 0) {
      values.push(jobId);
      await this.query(`UPDATE dataset_jobs SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
  }

  public async getJob(jobId: string): Promise<DatasetJob | null> {
    const res = await this.query('SELECT * FROM dataset_jobs WHERE id = $1', [jobId]);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      datasetId: r.dataset_id,
      fileName: r.file_name,
      jobType: r.job_type,
      status: r.status,
      progress: Number(r.progress),
      errorMessage: r.error_message,
      createdAt: r.created_at,
      completedAt: r.completed_at
    };
  }

  public async listJobs(limit = 20): Promise<DatasetJob[]> {
    const res = await this.query(`SELECT * FROM dataset_jobs ORDER BY created_at DESC LIMIT ${limit}`);
    return res.rows.map(r => ({
      id: r.id,
      datasetId: r.dataset_id,
      fileName: r.file_name,
      jobType: r.job_type,
      status: r.status,
      progress: Number(r.progress),
      errorMessage: r.error_message,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
  }

  // Audit Logging
  public async recordAudit(log: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<void> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    try {
      await this.query(
        `INSERT INTO audit_logs (id, user_id, action, query_text, duration_ms, status, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, log.user_id || null, log.action, log.query_text || null, log.duration_ms || null, log.status, log.error_message || null, now]
      );
    } catch (err) {
      console.warn('Could not record audit log:', err);
    }
  }

  public async getAuditLogs(limit = 50): Promise<AuditLogRecord[]> {
    const res = await this.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`);
    return res.rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      action: r.action,
      query_text: r.query_text,
      duration_ms: Number(r.duration_ms),
      status: r.status,
      error_message: r.error_message,
      created_at: r.created_at
    }));
  }

  public isUsingPostgres(): boolean {
    return true; // Both external PostgreSQL and embedded PGlite are authentic PostgreSQL engines!
  }
}

export const databaseService = new DatabaseService();
