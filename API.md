# NexusAI API Documentation

Base URL: `http://localhost:3000/api`

---

## Authentication & Authorization

All secure endpoints accept an `Authorization` header with a signed JWT:
```http
Authorization: Bearer <jwt-token>
```

### 1. User Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "NexusAI@2026"
  }
  ```
- **Response**:
  ```json
  {
    "token": "<jwt-token>",
    "user": {
      "id": "usr-admin-1",
      "username": "admin",
      "email": "admin@nexusai.enterprise",
      "role": "Admin"
    },
    "permissions": {
      "canUpload": true,
      "canRunRawSql": true,
      "canChangeParameters": true,
      "canExportReports": true,
      "canViewLineage": true,
      "canManageUsers": true,
      "canViewAuditLogs": true
    }
  }
  ```

### 2. Session Switcher (Testing & Development)
- **Endpoint**: `POST /auth/session`
- **Body**: `{ "role": "Admin" | "Analyst" | "Manager" }`

---

## Datasets & Ingestion

### 3. List Datasets
- **Endpoint**: `GET /datasets`
- **Response**:
  ```json
  {
    "activeId": "saas-mrr",
    "datasets": [
      {
        "id": "saas-mrr",
        "name": "B2B SaaS Growth & Churn Metrics",
        "rowCount": 36,
        "columnCount": 11,
        "sourceType": "preset"
      }
    ]
  }
  ```

### 4. Switch Active Dataset
- **Endpoint**: `POST /datasets/select`
- **Body**: `{ "id": "saas-mrr" }`

### 5. Ingest File
- **Endpoint**: `POST /upload`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "fileName": "sales_q4.csv",
    "rawText": "Region,Sales,Cost\nNorth,1000,600\nSouth,1500,800",
    "fileType": "csv",
    "asyncMode": false
  }
  ```
- **Asynchronous Mode**: Pass `"asyncMode": true` to receive a `jobId` for non-blocking processing.

### 6. Job Status
- **Endpoint**: `GET /jobs/:id`

---

## Analytics & AI Decision Intelligence

### 7. Data Profile & Health Score
- **Endpoint**: `GET /profile`

### 8. Dynamic KPIs
- **Endpoint**: `GET /kpis`

### 9. Business Problem Detection
- **Endpoint**: `GET /problems`

### 10. AI Executive Analysis
- **Endpoint**: `POST /ai/analyze`
- **Response**:
  ```json
  {
    "executiveSummary": "...",
    "keyDrivers": ["..."],
    "riskFactors": ["..."],
    "recommendations": [
      {
        "id": "rec-1",
        "title": "Remediate Margin Erosion",
        "recommendation": "Address high discounts on enterprise tiers",
        "reason": "Gross margins declined 6.4% over Q3",
        "metric": "gross_margin",
        "actualValue": "54.2%",
        "comparisonValue": "60.6%",
        "confidence": 0.95,
        "sourceColumns": ["revenue", "cogs"]
      }
    ]
  }
  ```

### 11. Natural Language Analytics Q&A
- **Endpoint**: `POST /ai/ask`
- **Body**: `{ "question": "Which product category drove highest profitability?" }`

### 12. Secure SQL Execution
- **Endpoint**: `POST /sql/execute`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "query": "SELECT category, SUM(profit) as total_profit FROM uploaded_data GROUP BY category ORDER BY total_profit DESC"
  }
  ```

### 13. What-If Scenario Sensitivity
- **Endpoint**: `POST /what-if`
- **Body**:
  ```json
  {
    "priceChangePct": 5,
    "volumeChangePct": -2,
    "costChangePct": 3,
    "churnChangePct": 0
  }
  ```

### 14. Time-Series Forecasting
- **Endpoint**: `POST /forecast`
- **Body**:
  ```json
  {
    "metric": "revenue",
    "periodsAhead": 4
  }
  ```

---

## Enterprise Integrations

### 15. Power BI Metadata & M-Code Feed
- **Endpoint**: `GET /powerbi/metadata`

### 16. Power BI Live Data Feed
- **Endpoint**: `GET /data/sample?limit=5000`

### 17. Server-Sent Events (SSE)
- **Endpoint**: `GET /events`
- **Stream Events**: `connected`, `job_update`, `dataset_ready`, `dataset_switched`

### 18. Audit Logs (Admin Only)
- **Endpoint**: `GET /audit-logs`
- **Headers**: `Authorization: Bearer <admin-token>`
