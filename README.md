# NexusAI Enterprise AI Business Decision Intelligence Platform

A high-performance, genuinely data-grounded AI decision intelligence platform for enterprise executives, analysts, and operators. Built with React 19, TypeScript, Tailwind CSS, Express, PostgreSQL, and Google Gemini.

---

## Key Capabilities

1. **Multi-Format Ingestion Pipeline**
   - Ingest CSV, Excel (`.xlsx`, `.xls`), JSON, and raw SQL dumps.
   - Automatic column header sanitization, type normalization, and sheet extraction.
   - Non-blocking asynchronous job worker with real-time SSE progress streaming.

2. **Mathematical Data Profiling**
   - Automated profiling: mean, median, standard deviation, quartiles, IQR, and statistical outliers.
   - Exact duplicate row detection and null cell tracking.
   - Deterministic 0–100 Data Health Score calculation.

3. **Dynamic KPI & Problem Detection Engine**
   - Automatically identifies metric and dimension candidates.
   - Computes Revenue, Cost, Gross Margins, Conversion, and Retention from raw dataset columns.
   - Algorithmic anomaly and risk detection with exact mathematical evidence citations.

4. **AST-Validated SQL Security Layer**
   - Whitelist-enforced read-only SQL engine (`SELECT` and `WITH` CTEs).
   - Blocks destructive DDL/DML (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `TRUNCATE`).
   - Query execution timeouts, pagination limits, and comprehensive audit trail logging.

5. **Grounded AI Decision Intelligence**
   - **Zero Invented Data**: Every AI claim is grounded in calculated dataset aggregates and verified SQL query outputs.
   - **Evidence-Backed Recommendations**: Prescriptive actions citing actual values, comparison benchmarks, formula lineage, and confidence scores.
   - **Natural Language to SQL**: Translates business questions into parameterized SQL queries, auto-executing and summarizing findings.

6. **Predictive Analytics & What-If Simulation**
   - Real historical time-series forecasting with linear trend regression and confidence intervals.
   - Mathematical sensitivity simulator modeling Price, Volume, Cost, and Churn dynamics without hardcoded margins.

7. **Power BI & Enterprise Export**
   - Live authenticated REST feeds for Power BI Desktop and Power BI Service.
   - Dynamic Power Query M-Code and auto-generated DAX measures.
   - One-click executive PDF report export.

8. **Enterprise Authentication & RBAC**
   - Secure signed JWT tokens with bcrypt password hashing.
   - Role-Based Access Control: `Admin`, `Analyst`, and `Manager`.
   - Complete administrative audit logging.

---

## Architecture Flow

```
Upload (CSV / XLSX / JSON / SQL)
  ├── 1. Schema Ingestion & Normalization
  ├── 2. Statistical Data Profiling (Health Score, Outliers, Quartiles)
  ├── 3. Relational Persistence (PostgreSQL / Disk Relational Layer)
  ├── 4. Dynamic KPI Aggregation & Problem Detection
  ├── 5. AST-Validated SQL Execution Engine
  ├── 6. Gemini Decision Intelligence Engine (Evidence-Grounded Analysis)
  └── 7. Real-Time Streaming & Power BI Live Feeds
```

---

## Quick Start

### 1. Environment Configuration

Copy the example environment file and configure variables:
```bash
cp .env.example .env
```

### 2. Local Development

```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the platform.

### 3. Docker Deployment

```bash
docker-compose up -d --build
```

---

## Automated Test Suite

The platform includes automated unit and end-to-end integration tests:
```bash
npm test
```
- Mathematical Data Profiling
- Dynamic KPI Generation
- SQL Security AST Validation
- What-If Sensitivity Simulation
- Multi-Format File Ingestion
- End-to-End Decision Pipeline Execution
