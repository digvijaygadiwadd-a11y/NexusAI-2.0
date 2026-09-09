# NexusAI Data Pipeline & Analytical Specifications

NexusAI provides a deterministic data engineering and mathematical analytics pipeline that extracts actionable intelligence from raw unstructured or structured tables.

---

## 1. Ingestion & Preprocessing

### Supported File Types
- **CSV / TSV**: Comma, tab, and pipe-delimited text with automatic quote handling.
- **Excel (`.xlsx`, `.xls`)**: Multi-worksheet workbooks with sheet selector support and cell date conversion.
- **JSON**: Array of objects or nested `{ "data": [...] }` payloads.
- **SQL Dumps**: Standard `INSERT INTO [table] VALUES (...)` dump formats.

### Normalization Pipeline
1. **Header Sanitization**: Removes symbols, replaces whitespace with underscores, and forces lowercase snake_case naming (`Gross Margin (%)` ➔ `gross_margin_pct`).
2. **Type Casting**: Strings representing numbers (`$1,250.50`, `45%`) are cleanly parsed into valid floating-point numbers.
3. **Temporal Standardization**: Date strings formatted in diverse locales are parsed into standard ISO-8601 timestamps.

---

## 2. Statistical Data Profiling

Every column is analyzed through mathematical passes:
- **Central Tendency**: Mean, Median, Mode.
- **Dispersion**: Range, Variance, Standard Deviation.
- **Distribution Quartiles**: Q1 (25th percentile), Q2 (50th percentile), Q3 (75th percentile).
- **Interquartile Range (IQR)**: $\text{IQR} = Q3 - Q1$.
- **Outlier Detection**: Values where $x < Q1 - 1.5 \times \text{IQR}$ or $x > Q3 + 1.5 \times \text{IQR}$.
- **Quality Metrics**: Percentage of null or missing cells, duplicate row detection, and constant column flags.

### Data Health Scoring Formula
$$\text{Health Score} = 100 - (\text{Missing Cells Penalty}) - (\text{Duplicate Rows Penalty}) - (\text{Outlier Columns Penalty})$$
The score is bounded within $[25, 100]$.

---

## 3. Dynamic Business Metric Extraction

Without hardcoding column names, the platform automatically detects semantic roles:
- **Revenue Candidate**: Matches tokens `revenue`, `sales`, `mrr`, `arr`, `billing`, `turnover`.
- **Cost Candidate**: Matches tokens `cost`, `expense`, `cogs`, `spend`, `overhead`.
- **Profit Candidate**: Matches tokens `profit`, `margin`, `net_income`, `ebitda`.
- **Unit / Volume Candidate**: Matches tokens `volume`, `quantity`, `orders`, `units`, `customers`.

If explicit profit columns are absent, the engine dynamically calculates:
$$\text{Profit} = \text{Revenue} - \text{Cost}$$
$$\text{Gross Margin \%} = \frac{\text{Profit}}{\text{Revenue}} \times 100$$

---

## 4. Time-Series Forecasting

Given chronological data points $(t_i, y_i)$, the engine performs ordinary least squares (OLS) linear regression:
$$y = mt + b$$
$$m = \frac{n \sum (t y) - \sum t \sum y}{n \sum t^2 - (\sum t)^2}$$
$$\text{Standard Error} = \sqrt{\frac{\sum (y_i - \hat{y}_i)^2}{n - 2}}$$

Forecast intervals are computed with 95% confidence bands:
$$\hat{y}_{\text{future}} \pm 1.96 \times \text{Standard Error} \times \sqrt{1 + \frac{1}{n}}$$
