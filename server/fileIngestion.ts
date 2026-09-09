import * as XLSX from 'xlsx';

export interface IngestionResult {
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'json' | 'sql';
  rowCount: number;
  columnCount: number;
  records: Record<string, any>[];
  availableSheets?: string[];
  selectedSheet?: string;
  warnings: string[];
}

export class FileIngestionService {
  /**
   * Auto-detect and parse uploaded content into standardized records
   */
  public parseUploadedFile(params: {
    fileName: string;
    fileContent?: string; // base64 or raw text
    fileType?: string;
    rawText?: string;
    sheetName?: string;
    isBase64?: boolean;
  }): IngestionResult {
    const warnings: string[] = [];
    const fileName = params.fileName || 'uploaded_data.csv';
    const detectedType = this.detectFileType(fileName, params.fileType, params.rawText || params.fileContent);

    let rawBuffer: Buffer | null = null;
    let textContent: string = '';

    if (params.rawText) {
      textContent = params.rawText;
    } else if (params.fileContent) {
      if (detectedType === 'xlsx') {
        rawBuffer = Buffer.from(params.fileContent, 'base64');
      } else {
        // Only decode as base64 if explicitly flagged as base64 or if it looks like pure base64
        const contentStr = params.fileContent;
        if (params.isBase64) {
          try {
            textContent = Buffer.from(contentStr, 'base64').toString('utf8');
          } catch {
            textContent = contentStr;
          }
        } else if (/[\r\n\t,;\{\}\[\]]/.test(contentStr) || !/^[A-Za-z0-9+/=]+$/.test(contentStr.trim())) {
          // Already plain text (contains newlines, commas, delimiters, etc.)
          textContent = contentStr;
        } else {
          // Might be base64 encoded text
          try {
            const decoded = Buffer.from(contentStr, 'base64').toString('utf8');
            // Verify decoded doesn't contain replacement characters / non-printable garbage
            if (!decoded.includes('\uFFFD') && /[\x20-\x7E\r\n\t]/.test(decoded)) {
              textContent = decoded;
            } else {
              textContent = contentStr;
            }
          } catch {
            textContent = contentStr;
          }
        }
      }
    }

    switch (detectedType) {
      case 'json':
        return this.parseJson(textContent, fileName, warnings);

      case 'sql':
        return this.parseSql(textContent, fileName, warnings);

      case 'xlsx':
        return this.parseExcel(rawBuffer || Buffer.from(textContent), fileName, params.sheetName, warnings);

      case 'csv':
      default:
        return this.parseCsv(textContent, fileName, warnings);
    }
  }

  private detectFileType(fileName: string, explicitType?: string, sampleContent?: string): 'csv' | 'xlsx' | 'json' | 'sql' {
    if (explicitType) {
      const low = explicitType.toLowerCase();
      if (low.includes('json')) return 'json';
      if (low.includes('sql')) return 'sql';
      if (low.includes('excel') || low.includes('sheet') || low.includes('xlsx') || low.includes('xls')) return 'xlsx';
      if (low.includes('csv') || low.includes('comma')) return 'csv';
    }

    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) return 'xlsx';
    if (lowerName.endsWith('.json')) return 'json';
    if (lowerName.endsWith('.sql')) return 'sql';
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv') || lowerName.endsWith('.txt')) return 'csv';

    if (sampleContent) {
      const trimmed = sampleContent.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
      if (/INSERT\s+INTO/i.test(trimmed) || /CREATE\s+TABLE/i.test(trimmed)) return 'sql';
    }

    return 'csv';
  }

  private parseJson(text: string, fileName: string, warnings: string[]): IngestionResult {
    let parsed: any;
    try {
      parsed = JSON.parse(text.trim());
    } catch (e) {
      throw new Error(`Invalid JSON file format: ${(e as Error).message}`);
    }

    let rawRecords: any[] = [];
    if (Array.isArray(parsed)) {
      rawRecords = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      const possibleArrays = ['data', 'records', 'rows', 'items', 'results'];
      for (const key of possibleArrays) {
        if (Array.isArray(parsed[key])) {
          rawRecords = parsed[key];
          break;
        }
      }
      if (rawRecords.length === 0) {
        rawRecords = [parsed];
      }
    }

    // Flatten nested JSON where practical
    const records = rawRecords.map(item => this.flattenRecord(item));
    const normalized = this.cleanAndNormalizeRows(records, warnings);

    return {
      fileName,
      fileType: 'json',
      rowCount: normalized.length,
      columnCount: normalized.length > 0 ? Object.keys(normalized[0]).length : 0,
      records: normalized,
      warnings
    };
  }

  private parseExcel(buffer: Buffer, fileName: string, targetSheet: string | undefined, warnings: string[]): IngestionResult {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const availableSheets = workbook.SheetNames;
    if (availableSheets.length === 0) {
      throw new Error('The uploaded Excel file contains no worksheets.');
    }

    const selectedSheet = targetSheet && availableSheets.includes(targetSheet)
      ? targetSheet
      : availableSheets[0];

    const worksheet = workbook.Sheets[selectedSheet];
    // Convert to json with raw headers
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null, blankrows: false });
    const normalized = this.cleanAndNormalizeRows(rawRows, warnings);

    return {
      fileName,
      fileType: 'xlsx',
      rowCount: normalized.length,
      columnCount: normalized.length > 0 ? Object.keys(normalized[0]).length : 0,
      records: normalized,
      availableSheets,
      selectedSheet,
      warnings
    };
  }

  private parseCsv(text: string, fileName: string, warnings: string[]): IngestionResult {
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null, blankrows: false });
    const normalized = this.cleanAndNormalizeRows(rawRows, warnings);

    return {
      fileName,
      fileType: 'csv',
      rowCount: normalized.length,
      columnCount: normalized.length > 0 ? Object.keys(normalized[0]).length : 0,
      records: normalized,
      warnings
    };
  }

  private parseSql(text: string, fileName: string, warnings: string[]): IngestionResult {
    const lines = text.split('\n');
    const records: Record<string, any>[] = [];
    let columnNames: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const insertMatch = trimmed.match(/INSERT\s+INTO\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*(.+)/i);
      if (insertMatch) {
        columnNames = insertMatch[2].split(',').map(c => this.cleanHeaderName(c));
        const valuesPart = insertMatch[3];
        const tupleRegex = /\(([^)]+)\)/g;
        let match;
        while ((match = tupleRegex.exec(valuesPart)) !== null) {
          const rawVals = match[1].split(',').map(v => {
            const vTrim = v.trim();
            if (vTrim.startsWith("'") && vTrim.endsWith("'")) return vTrim.slice(1, -1);
            if (vTrim.toLowerCase() === 'null') return null;
            if (!isNaN(Number(vTrim))) return Number(vTrim);
            return vTrim;
          });
          const row: Record<string, any> = {};
          columnNames.forEach((col, idx) => {
            row[col] = rawVals[idx] !== undefined ? rawVals[idx] : null;
          });
          records.push(row);
        }
      }
    }

    if (records.length === 0) {
      // Fallback: parse as standard tabular data
      return this.parseCsv(text, fileName, warnings);
    }

    const normalized = this.cleanAndNormalizeRows(records, warnings);
    return {
      fileName,
      fileType: 'sql',
      rowCount: normalized.length,
      columnCount: normalized.length > 0 ? Object.keys(normalized[0]).length : 0,
      records: normalized,
      warnings
    };
  }

  /**
   * Disambiguate duplicate headers, filter empty rows, normalize dates & nulls
   */
  private cleanAndNormalizeRows(rawRows: any[], warnings: string[]): Record<string, any>[] {
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) return [];

    // Collect all headers
    const rawKeys = Array.from(new Set(rawRows.flatMap(r => (r && typeof r === 'object' ? Object.keys(r) : []))));
    const headerMapping: Record<string, string> = {};
    const seenHeaders = new Set<string>();

    rawKeys.forEach(rawKey => {
      let clean = this.cleanHeaderName(rawKey);
      if (!clean) clean = 'column';
      let uniqueHeader = clean;
      let counter = 2;
      while (seenHeaders.has(uniqueHeader.toLowerCase())) {
        uniqueHeader = `${clean}_${counter}`;
        counter++;
      }
      seenHeaders.add(uniqueHeader.toLowerCase());
      headerMapping[rawKey] = uniqueHeader;
      if (uniqueHeader !== rawKey) {
        warnings.push(`Normalized header "${rawKey}" to "${uniqueHeader}"`);
      }
    });

    const normalized: Record<string, any>[] = [];

    for (const row of rawRows) {
      if (!row || typeof row !== 'object') continue;

      let hasNonEmpty = false;
      const cleanRow: Record<string, any> = {};

      Object.keys(headerMapping).forEach(rawKey => {
        const targetKey = headerMapping[rawKey];
        let val = row[rawKey];

        // Format dates
        if (val instanceof Date) {
          val = val.toISOString().slice(0, 10);
        } else if (typeof val === 'string') {
          val = val.trim();
          const low = val.toLowerCase();
          if (
            val === '' ||
            low === 'null' ||
            low === 'nan' ||
            low === 'undefined' ||
            low === 'n/a' ||
            low === '#n/a' ||
            low === '#value!' ||
            low === '#ref!' ||
            low === '#div/0!' ||
            low === 'none' ||
            val === '-' ||
            val === '--'
          ) {
            val = null;
          } else if (!isNaN(Number(val)) && !/^\d{4}[-/]\d{1,2}/.test(val)) {
            // Keep as numeric if valid number
            val = Number(val);
          } else if (/^\$?\s*-?\(?\d{1,3}(,\d{3})*(\.\d+)?\)?%?$/.test(val) && !/^\d{4}[-/]\d{1,2}/.test(val)) {
            // Handle formatted currency/percentage/comma numbers like "$1,234.50" or "1,200"
            const stripped = val.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1').replace(/%$/, '');
            if (!isNaN(Number(stripped))) {
              val = Number(stripped);
            }
          }
        }

        if (val !== null && val !== undefined) {
          hasNonEmpty = true;
        }

        cleanRow[targetKey] = val;
      });

      // Skip entirely empty rows
      if (hasNonEmpty) {
        normalized.push(cleanRow);
      }
    }

    return normalized;
  }

  private cleanHeaderName(header: string): string {
    return header
      .trim()
      .replace(/[`"'[\]]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  private flattenRecord(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    if (!obj || typeof obj !== 'object') {
      result['value'] = obj;
      return result;
    }

    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = prefix ? `${prefix}_${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, this.flattenRecord(value, cleanKey));
      } else {
        result[cleanKey] = Array.isArray(value) ? JSON.stringify(value) : value;
      }
    }
    return result;
  }
}

export const fileIngestionService = new FileIngestionService();
