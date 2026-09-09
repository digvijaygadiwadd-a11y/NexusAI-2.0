# NexusAI Security & Access Control Architecture

NexusAI enforces enterprise-grade security standards across authentication, authorization, query execution, and audit logging.

---

## 1. Authentication

- **JSON Web Tokens (JWT)**: Cryptographically signed tokens utilizing the `HS256` algorithm with 24-hour expiration windows.
- **Password Security**: Passwords are saved and verified using `bcryptjs` with salt work factors ($\ge 10$).
- **Session Protection**: No plain-text tokens or keys stored client-side.

---

## 2. Role-Based Access Control (RBAC)

| Capability | Admin | Analyst | Manager |
| :--- | :---: | :---: | :---: |
| View Dashboards & KPIs | Yes | Yes | Yes |
| Run What-If Simulations | Yes | Yes | Yes |
| Export PDF Reports | Yes | Yes | Yes |
| Ingest Datasets (CSV/XLSX) | Yes | Yes | No |
| Run Raw SQL Queries | Yes | Yes | No |
| Connect Power BI Feeds | Yes | Yes | Yes |
| Manage User Accounts | Yes | No | No |
| Access Audit Trail Logs | Yes | No | No |

---

## 3. SQL Security & Injection Mitigation

User-submitted and AI-generated SQL queries are subjected to strict validation rules:
1. **Whitelist Policy**: Only queries starting with `SELECT` or `WITH` (Common Table Expression) are permitted.
2. **Blacklist Keywords**: Any query containing `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `EXEC`, `EXECUTE`, `SHUTDOWN`, or `INFORMATION_SCHEMA` is immediately rejected.
3. **Stacked Query Prevention**: Semicolons followed by second statements are detected and blocked.
4. **Row Caps & Timeouts**: Queries are automatically capped at a maximum of 500 rows and enforced with an 8-second execution timeout.

---

## 4. Audit Trail Logging

Every security-sensitive operation generates an immutable audit record:
- `user_id`: Identity of the performing user.
- `action`: E.g., `SQL_QUERY_EXECUTED`, `DATASET_INGESTED`, `USER_LOGIN`.
- `query`: Exact SQL query or file name processed.
- `status`: `SUCCESS` or `SECURITY_VIOLATION` / `ERROR`.
- `execution_time_ms`: Duration of execution.
- `timestamp`: UTC timestamp of the operation.
