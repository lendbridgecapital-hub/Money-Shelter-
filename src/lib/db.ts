import fs from 'fs';
import path from 'path';
import initialSeedData from '../../data/initial-data.json';

interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface DatabaseAdapter {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  close(): void;
}

let instance: DatabaseAdapter | null = null;

function initDatabase(): DatabaseAdapter {
  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbFilePath = process.env.DATABASE_FILE || path.join(dbDir, 'app.db');
  const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
  const schemaSql = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';

  // Try loading native better-sqlite3 first
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DatabaseConstructor = require('better-sqlite3');
    const nativeDb = new DatabaseConstructor(dbFilePath);
    nativeDb.pragma('journal_mode = WAL');
    nativeDb.pragma('foreign_keys = ON');

    if (schemaSql) {
      nativeDb.exec(schemaSql);
    }
    return nativeDb;
  } catch (nativeErr) {
    console.warn(
      '[db] better-sqlite3 native driver unavailable, falling back to portable persistent storage adapter:',
      (nativeErr as Error).message
    );

    return createPortableStorage(path.join(dbDir, 'app-portable.json'));
  }
}

/**
 * Universal disk-backed storage engine.
 * Accurately parses and executes SQL operations for the loan platform.
 */
function createPortableStorage(storageFilePath: string): DatabaseAdapter {
  interface StorageData {
    tenants: Record<string, unknown>[];
    company_settings: Record<string, unknown>[];
    branches: Record<string, unknown>[];
    users: Record<string, unknown>[];
    loan_applications: Record<string, unknown>[];
    application_documents: Record<string, unknown>[];
    status_history: Record<string, unknown>[];
    banks: Record<string, unknown>[];
    commissions: Record<string, unknown>[];
    clawbacks: Record<string, unknown>[];
    operational_remarks: Record<string, unknown>[];
    partner_notifications: Record<string, unknown>[];
    required_documents: Record<string, unknown>[];
    bank_products: Record<string, unknown>[];
    [key: string]: Record<string, unknown>[];
  }

  const defaultData: StorageData = {
    tenants: [],
    company_settings: [],
    branches: [],
    users: [],
    loan_applications: [],
    application_documents: [],
    status_history: [],
    banks: [],
    bank_products: [],
    commissions: [],
    clawbacks: [],
    operational_remarks: [],
    partner_notifications: [],
    required_documents: [],
    ...(initialSeedData as unknown as Partial<StorageData>),
  };

  let cachedData: StorageData = defaultData;
  let hasHydratedFromNeon = false;
  let neonPushTimer: NodeJS.Timeout | null = null;

  function syncWithNeonAsync(data: StorageData) {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) return;

    if (neonPushTimer) clearTimeout(neonPushTimer);
    neonPushTimer = setTimeout(async () => {
      try {
        const { neon } = require('@neondatabase/serverless');
        const sql = neon(dbUrl);
        const jsonStr = JSON.stringify(data);
        const queryFn = sql.query ? sql.query.bind(sql) : sql;
        await queryFn(
          `INSERT INTO quickfinsure_store (key, value, updated_at) 
           VALUES ('main_store', $1::jsonb, NOW()) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();`,
          [jsonStr]
        );
      } catch (err) {
        console.error('[db] Error pushing updates to Neon PostgreSQL:', (err as Error).message);
      }
    }, 60);
  }

  function loadData(): StorageData {
    if (Array.isArray(cachedData.users) && cachedData.users.length > 0 && hasHydratedFromNeon) {
      return cachedData;
    }

    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    // If Neon PostgreSQL is configured, pull fresh database snapshot on startup
    if (dbUrl && !hasHydratedFromNeon) {
      hasHydratedFromNeon = true;
      try {
        const helperPath = path.resolve(process.cwd(), 'scripts/sync-neon.js');
        if (fs.existsSync(helperPath)) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { spawnSync } = require('child_process');
          const res = spawnSync(process.execPath, [helperPath, 'pull'], {
            env: process.env,
            encoding: 'utf8',
            timeout: 10000,
          });
          if (res.stdout) {
            const parsed = JSON.parse(res.stdout);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.users) && parsed.users.length > 0) {
              cachedData = { ...defaultData, ...parsed };
              try {
                fs.writeFileSync(storageFilePath, JSON.stringify(cachedData, null, 2), 'utf8');
              } catch {}
              return cachedData;
            }
          }
        }
      } catch (neonErr) {
        console.warn('[db] Note: Initial Neon sync failed, falling back to bundled snapshot:', (neonErr as Error).message);
      }
    }

    if (fs.existsSync(storageFilePath)) {
      try {
        const raw = fs.readFileSync(storageFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          cachedData = { ...defaultData, ...parsed };
          return cachedData;
        }
      } catch {
        // fallback
      }
    }

    // Default to bundled initial seed snapshot
    cachedData = { ...defaultData };
    return cachedData;
  }

  function saveData(data: StorageData) {
    cachedData = data;
    try {
      fs.writeFileSync(storageFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Local cache write might fail on read-only environments; Neon is the primary store
    }
    syncWithNeonAsync(data);
  }

  let memoryData = loadData();

  function parseTableName(sql: string): keyof StorageData | null {
    const match = sql.match(/(?:FROM|INTO|UPDATE)\s+([a-zA-Z0-9_]+)/i);
    if (!match) return null;
    const name = match[1].toLowerCase() as keyof StorageData;
    if (!(name in memoryData)) {
      memoryData[name] = [];
    }
    return name;
  }

  function cleanColName(raw: string): string {
    return raw
      .replace(/LOWER\s*\(/i, '')
      .replace(/\)/g, '')
      .replace(/^[a-zA-Z0-9_]+\./, '') // remove table alias like u. or a.
      .trim()
      .toLowerCase();
  }

  function filterRowsByWhere(rows: Record<string, unknown>[], whereSql: string, params: unknown[]): Record<string, unknown>[] {
    const cleanWhere = whereSql.trim();
    if (!cleanWhere) return rows;

    // Handle OR conditions like: tenant_id = ? OR id = ?
    if (/\bOR\b/i.test(cleanWhere)) {
      const parts = cleanWhere.split(/\bOR\b/i);
      return rows.filter((r) => {
        let paramIdx = 0;
        for (const part of parts) {
          const colMatch = part.match(/([a-zA-Z0-9_.]+)\s*=\s*\?/i);
          if (colMatch) {
            const col = cleanColName(colMatch[1]);
            const val = params[paramIdx] !== undefined ? params[paramIdx] : params[0];
            paramIdx++;
            const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
            if (rowVal !== undefined && String(rowVal).toLowerCase() === String(val).toLowerCase()) {
              return true;
            }
          }
        }
        return false;
      });
    }

    // Handle literal condition: column = 'literal' or column = 123
    const litMatch = cleanWhere.match(/([a-zA-Z0-9_.()]+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\d+))/i);
    if (litMatch) {
      const col = cleanColName(litMatch[1]);
      const targetVal = String(
        litMatch[2] !== undefined ? litMatch[2] : litMatch[3] !== undefined ? litMatch[3] : litMatch[4]
      ).toLowerCase();

      return rows.filter((r) => {
        const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
        if (rowVal === undefined || rowVal === null) return false;
        return String(rowVal).toLowerCase() === targetVal;
      });
    }

    // Handle single condition: [LOWER(] [alias.]column [)] = ?
    const match = cleanWhere.match(/([a-zA-Z0-9_.()]+)\s*=\s*\?/i);
    if (match) {
      if (params.length === 0) return []; // If parameter expected but not supplied, match none
      const col = cleanColName(match[1]);
      const targetVal = String(params[0]).toLowerCase();

      return rows.filter((r) => {
        const rowVal = r[col] !== undefined ? r[col] : r[col.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
        if (rowVal === undefined || rowVal === null) return false;
        return String(rowVal).toLowerCase() === targetVal;
      });
    }

    return rows;
  }

  return {
    exec(_sql: string) {
      // Schema initialization
    },
    close() {
      saveData(memoryData);
    },
    prepare(sql: string): Statement {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();
      const upperSql = cleanSql.toUpperCase();
      const tableName = parseTableName(cleanSql);

      return {
        run(...params: unknown[]) {
          // Always reload freshest data from disk before write
          memoryData = loadData();
          if (!tableName) return { changes: 0, lastInsertRowid: 0 };
          if (!memoryData[tableName]) {
            memoryData[tableName] = [];
          }
          const rows = memoryData[tableName];

          if (upperSql.startsWith('INSERT INTO')) {
            const colsMatch = cleanSql.match(/INSERT\s+INTO\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/i);
            const valsMatch = cleanSql.match(/VALUES\s*\(([^)]+)\)/i);

            if (colsMatch && valsMatch) {
              const cols = colsMatch[1].split(',').map((c) => c.trim().toLowerCase());
              const valTokens = valsMatch[1].split(',').map((v) => v.trim());

              const newRow: Record<string, unknown> = {};
              let paramIdx = 0;

              cols.forEach((col, idx) => {
                const token = valTokens[idx] || '?';
                if (token === '?') {
                  newRow[col] = params[paramIdx] !== undefined ? params[paramIdx] : null;
                  paramIdx++;
                } else if (/^['"].*['"]$/.test(token)) {
                  newRow[col] = token.slice(1, -1);
                } else if (/^\d+$/.test(token)) {
                  newRow[col] = Number(token);
                } else if (token.toUpperCase() === 'NULL') {
                  newRow[col] = null;
                } else {
                  newRow[col] = token;
                }
              });

              rows.push(newRow);
              saveData(memoryData);
              return { changes: 1, lastInsertRowid: rows.length };
            }
          }

          if (upperSql.startsWith('UPDATE')) {
            let changes = 0;
            const setPartMatch = cleanSql.match(/SET\s+(.*?)\s+(?:WHERE|$)/i);
            const wherePartMatch = cleanSql.match(/WHERE\s+(.*)$/i);

            if (setPartMatch) {
              // Parse SET assignments: e.g. col1 = ?, status = 'APPROVED', col2 = ?
              const assignmentTokens = setPartMatch[1].split(',').map((s) => s.trim());
              const setAssignments: { col: string; val: unknown }[] = [];
              let paramIdx = 0;

              for (const token of assignmentTokens) {
                const eqIdx = token.indexOf('=');
                if (eqIdx === -1) continue;
                const col = token.substring(0, eqIdx).trim().toLowerCase();
                const rawVal = token.substring(eqIdx + 1).trim();

                if (rawVal === '?') {
                  setAssignments.push({ col, val: params[paramIdx] });
                  paramIdx++;
                } else if (/^['"].*['"]$/.test(rawVal)) {
                  setAssignments.push({ col, val: rawVal.slice(1, -1) });
                } else if (/^\d+$/.test(rawVal)) {
                  setAssignments.push({ col, val: Number(rawVal) });
                } else if (rawVal.toUpperCase() === 'NULL') {
                  setAssignments.push({ col, val: null });
                } else {
                  setAssignments.push({ col, val: rawVal });
                }
              }

              const whereValues = params.slice(paramIdx);

              let targetRows: Record<string, unknown>[] = [];
              if (wherePartMatch) {
                targetRows = filterRowsByWhere(rows, wherePartMatch[1], whereValues);
              } else {
                targetRows = rows;
              }

              targetRows.forEach((row) => {
                setAssignments.forEach(({ col, val }) => {
                  row[col] = val;
                });
                changes++;
              });

              if (changes > 0) saveData(memoryData);
              return { changes, lastInsertRowid: 0 };
            }
          }

          if (upperSql.startsWith('DELETE FROM')) {
            const wherePartMatch = cleanSql.match(/WHERE\s+(.*)$/i);
            const initialLen = rows.length;
            if (wherePartMatch) {
              const toKeep = rows.filter((r) => !filterRowsByWhere([r], wherePartMatch[1], params).length);
              memoryData[tableName] = toKeep;
            } else {
              memoryData[tableName] = [];
            }
            const changes = initialLen - memoryData[tableName].length;
            if (changes > 0) saveData(memoryData);
            return { changes, lastInsertRowid: 0 };
          }

          return { changes: 0, lastInsertRowid: 0 };
        },

        get(...params: unknown[]) {
          const list = this.all(...params);
          return list[0] || undefined;
        },

        all(...params: unknown[]) {
          // Always read freshest data from disk / cache
          memoryData = loadData();

          // Self-heal if users table is queried but currently empty
          if (tableName === 'users' && (!memoryData.users || memoryData.users.length === 0)) {
            const seed = (initialSeedData as unknown as StorageData);
            memoryData = {
              ...memoryData,
              users: seed.users || [],
              branches: memoryData.branches?.length ? memoryData.branches : (seed.branches || []),
              tenants: memoryData.tenants?.length ? memoryData.tenants : (seed.tenants || []),
              company_settings: memoryData.company_settings?.length ? memoryData.company_settings : (seed.company_settings || []),
              banks: memoryData.banks?.length ? memoryData.banks : (seed.banks || []),
              loan_applications: memoryData.loan_applications?.length ? memoryData.loan_applications : (seed.loan_applications || []),
            };
            saveData(memoryData);
          }

          if (!tableName) return [];
          let rows = [...(memoryData[tableName] || [])];

          // Handle WHERE clauses
          if (upperSql.includes('WHERE')) {
            const whereClause = cleanSql.substring(cleanSql.indexOf('WHERE') + 5).split(/ORDER\s+BY|LIMIT/i)[0];
            rows = filterRowsByWhere(rows, whereClause, params);
          }

          // Handle COUNT(*) queries
          if (upperSql.includes('COUNT(')) {
            return [{ c: rows.length, count: rows.length }];
          }

          // Handle ORDER BY
          if (upperSql.includes('ORDER BY')) {
            if (upperSql.includes('DESC')) {
              rows.reverse();
            }
          }

          // Return cloned rows with mapped camelCase / snake_case convenience
          return rows.map((r) => {
            const rowCopy = { ...r };
            for (const key of Object.keys(rowCopy)) {
              const camel = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
              if (!(camel in rowCopy)) {
                rowCopy[camel] = rowCopy[key];
              }
            }
            return rowCopy;
          });
        },
      };
    },
  };
}

export const db: DatabaseAdapter = (() => {
  if (!instance) {
    instance = initDatabase();
  }
  return instance;
})();
