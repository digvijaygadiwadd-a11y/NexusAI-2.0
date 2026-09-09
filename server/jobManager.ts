import { Response } from 'express';
import { databaseService } from './database.js';
import { fileIngestionService } from './fileIngestion.js';
import { dataProfiler } from './dataProfiler.js';
import { kpiEngine } from './kpiEngine.js';
import { DatasetJob, Dataset } from './canonicalTypes.js';

export interface SseClient {
  id: string;
  res: Response;
}

export class JobManager {
  private sseClients: SseClient[] = [];

  /**
   * Subscribe an SSE client for real-time dataset/job status notifications
   */
  public addSseClient(id: string, res: Response) {
    this.sseClients.push({ id, res });
    res.on('close', () => {
      this.sseClients = this.sseClients.filter(c => c.id !== id);
    });
  }

  /**
   * Broadcast real-time event to all connected clients
   */
  public broadcast(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    this.sseClients.forEach(client => {
      try {
        client.res.write(payload);
      } catch (e) {
        console.warn('Error writing to SSE client:', e);
      }
    });
  }

  /**
   * Enqueue and process a background ingestion job
   */
  public async enqueueUploadJob(params: {
    fileName: string;
    fileContent?: string;
    fileType?: string;
    rawText?: string;
    sheetName?: string;
    userId?: string;
  }): Promise<DatasetJob> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const job: DatasetJob = {
      id: jobId,
      fileName: params.fileName,
      jobType: 'ingest',
      status: 'processing',
      progress: 10,
      createdAt: new Date().toISOString()
    };

    await databaseService.createJob(job);
    this.broadcast('job_update', job);

    // Process asynchronously without blocking the upload HTTP response
    setImmediate(async () => {
      try {
        // Step 1: Parse and validate file
        await databaseService.updateJob(jobId, { progress: 30, status: 'processing' });
        this.broadcast('job_update', { id: jobId, progress: 30, status: 'processing' });

        const ingestion = fileIngestionService.parseUploadedFile({
          fileName: params.fileName,
          fileContent: params.fileContent,
          fileType: params.fileType,
          rawText: params.rawText,
          sheetName: params.sheetName
        });

        if (ingestion.records.length === 0) {
          throw new Error('No valid records found in uploaded file.');
        }

        // Step 2: Mathematical Profiling
        await databaseService.updateJob(jobId, { progress: 60 });
        this.broadcast('job_update', { id: jobId, progress: 60 });

        const datasetId = `custom-${Date.now()}`;
        const profile = dataProfiler.profile(ingestion.records, datasetId);

        // Step 3: Persist to Database Layer
        await databaseService.updateJob(jobId, { progress: 80 });
        this.broadcast('job_update', { id: jobId, progress: 80 });

        const dataset: Dataset = {
          id: datasetId,
          name: ingestion.fileName.replace(/\.[^/.]+$/, '') + ` (${ingestion.records.length} rows)`,
          rowCount: ingestion.records.length,
          columnCount: profile.columns.length,
          sourceType: ingestion.fileType,
          tableName: 'uploaded_data',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await databaseService.saveDataset(dataset, ingestion.records);
        await databaseService.saveColumns(datasetId, profile.columns);

        // Step 4: Generate Dynamic KPIs
        const kpis = kpiEngine.generateKpis(ingestion.records, profile.columns, datasetId);
        const problems = kpiEngine.detectProblems(ingestion.records, profile.columns, datasetId);

        // Complete Job
        await databaseService.updateJob(jobId, {
          datasetId,
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString()
        });

        this.broadcast('dataset_ready', {
          jobId,
          datasetId,
          dataset,
          rowCount: ingestion.records.length,
          columnCount: profile.columns.length
        });

        await databaseService.recordAudit({
          user_id: params.userId,
          action: 'JOB_INGEST_COMPLETED',
          status: 'SUCCESS',
          duration_ms: 100
        });
      } catch (err: any) {
        const errorMsg = (err as Error).message || 'Background ingestion failed.';
        await databaseService.updateJob(jobId, {
          status: 'failed',
          errorMessage: errorMsg,
          completedAt: new Date().toISOString()
        });

        this.broadcast('job_update', { id: jobId, status: 'failed', error: errorMsg });

        await databaseService.recordAudit({
          user_id: params.userId,
          action: 'JOB_INGEST_FAILED',
          status: 'ERROR',
          error_message: errorMsg
        });
      }
    });

    return job;
  }
}

export const jobManager = new JobManager();
