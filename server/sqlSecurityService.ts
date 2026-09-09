import NodeSqlParser from 'node-sql-parser';
import { databaseService } from './database.js';

const { Parser } = NodeSqlParser;
const parser = new Parser();

export interface SqlExecutionResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  totalAvailableRows?: number;
  executionTimeMs: number;
  query: string;
  error?: string;
  metadata?: {
    isAggregated: boolean;
    rowLimitApplied: boolean;
    page: number;
    pageSize: number;
  };
}

export class SqlSecurityService {
  /**
   * Validate SQL query for security compliance using Abstract Syntax Tree (AST) validation:
   * Only SELECT or WITH (Common Table Expressions) statements are permitted.
   */
  public validateSql(sqlQuery: string): { valid: boolean; reason?: string; sanitizedQuery: string } {
    if (!sqlQuery || typeof sqlQuery !== 'string') {
      return { valid: false, reason: 'Empty query received.', sanitizedQuery: '' };
    }
    let ast: any;
    try {
      ast = parser.astify(sqlQuery, { database: 'postgresql' });
    } catch (e: any) {
      return { valid: false, reason: `SQL parse error: ${e.message}`, sanitizedQuery: sqlQuery };
    }
    const statements = Array.isArray(ast) ? ast : [ast];
    if (statements.length > 1) {
      return { valid: false, reason: 'Multiple SQL statements are not permitted.', sanitizedQuery: sqlQuery };
    }
    const stmt = statements[0];
    if (!stmt || stmt.type !== 'select') {
      return { valid: false, reason: `Only SELECT/WITH statements are permitted, got: ${stmt ? stmt.type : 'unknown'}`, sanitizedQuery: sqlQuery };
    }
    // node-sql-parser folds WITH...SELECT into a 'select' node with a `.with` property — no separate check needed.
    return { valid: true, sanitizedQuery: parser.sqlify(ast, { database: 'postgresql' }) };
  }

  /**
   * Execute validated SQL with timeout, row limit, and audit logging
   */
  public async executeSecureQuery(
    rawQuery: string,
    options: {
      userId?: string;
      rowLimit?: number;
      page?: number;
      pageSize?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<SqlExecutionResult> {
    const start = performance.now();
    const { rowLimit = 500, page = 1, pageSize = 100, timeoutMs = 5000 } = options;

    const validation = this.validateSql(rawQuery);
    if (!validation.valid) {
      const duration = Number((performance.now() - start).toFixed(1));
      await databaseService.recordAudit({
        user_id: options.userId,
        action: 'SQL_EXECUTE_BLOCKED',
        query_text: rawQuery,
        duration_ms: duration,
        status: 'ERROR',
        error_message: validation.reason
      });

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: duration,
        query: rawQuery,
        error: validation.reason
      };
    }

    let queryToRun = validation.sanitizedQuery;

    // Check if query already has a LIMIT clause
    const hasLimit = /\bLIMIT\s+\d+/i.test(queryToRun);
    if (!hasLimit) {
      queryToRun = `${queryToRun} LIMIT ${rowLimit}`;
    }

    try {
      // Execute on PostgreSQL engine with timeout race
      const executionPromise = databaseService.query(queryToRun).then(res => res.rows);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query execution timed out after ${timeoutMs}ms.`)), timeoutMs);
      });

      const rawRows: any[] = await Promise.race([executionPromise, timeoutPromise]);
      const duration = Number((performance.now() - start).toFixed(1));

      const normalizedRows: Record<string, any>[] = rawRows.filter(r => r !== null && typeof r === 'object');
      const columns = normalizedRows.length > 0 ? Object.keys(normalizedRows[0]) : [];

      await databaseService.recordAudit({
        user_id: options.userId,
        action: 'SQL_EXECUTE_SUCCESS',
        query_text: queryToRun,
        duration_ms: duration,
        status: 'SUCCESS'
      });

      return {
        columns,
        rows: normalizedRows,
        rowCount: normalizedRows.length,
        executionTimeMs: duration,
        query: queryToRun,
        metadata: {
          isAggregated: /GROUP\s+BY|SUM\(|AVG\(|COUNT\(|MIN\(|MAX\(/i.test(queryToRun),
          rowLimitApplied: !hasLimit,
          page,
          pageSize
        }
      };
    } catch (err: any) {
      const duration = Number((performance.now() - start).toFixed(1));
      const errorMsg = (err as Error).message || 'SQL execution failed.';

      await databaseService.recordAudit({
        user_id: options.userId,
        action: 'SQL_EXECUTE_FAILED',
        query_text: queryToRun,
        duration_ms: duration,
        status: 'ERROR',
        error_message: errorMsg
      });

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: duration,
        query: queryToRun,
        error: errorMsg
      };
    }
  }
}

export const sqlSecurityService = new SqlSecurityService();
