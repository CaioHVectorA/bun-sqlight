import type { SQLITE_TYPES } from '../utils/sqlite.types';
import { type ColumnMetadata } from './query-builder';
import { readFileSync, writeFileSync } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function mapType(sqlType: SQLITE_TYPES): string {
  if (!sqlType) return 'any';
  if (sqlType.startsWith('VARCHAR') || sqlType.startsWith('CHAR')) {
    return 'string';
  }
  switch (sqlType) {
    case 'INTEGER':
    case 'INT':
    case 'BIGINT':
    case 'FLOAT':
    case 'REAL':
    case 'DOUBLE':
    case 'DECIMAL':
    case 'NUMERIC':
      return 'number';
    case 'TEXT':
    case 'CHAR':
    case 'DATE':
    case 'DATETIME':
    case 'TIME':
    case 'TIMESTAMP':
    case 'UUID':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    case 'BLOB':
      return 'Buffer | Uint8Array';
    case 'NULL':
      return 'null';
    default:
      return 'any';
  }
}

export function generateTableTypes(tableName: string, columns: Record<string, ColumnMetadata>) {
  if (!columns) return;
  const entries = Object.entries(columns);

  const selectFields = entries
    .map(([name, meta]) => `${name}: ${meta.tsType || mapType(meta.sqlType as SQLITE_TYPES)}${meta.nullable ? ' | null' : ''}`)
    .join('\n  ');

  const insertFields = entries
    .filter(([_, meta]) => !meta.isPrimary) // Ignora PK auto gerada
    .map(([name, meta]) => `${name}${meta.nullable || meta.hasDefault ? '?' : ''}: ${meta.tsType || mapType(meta.sqlType as SQLITE_TYPES)}${meta.nullable ? ' | null' : ''}`)
    .join('\n  ');

  const updateType = `Partial<${tableName}Insert>`;

  const typeContent = `
// Auto-generated types for ${tableName}
export interface ${tableName}Select {
  ${selectFields}
}

export interface ${tableName}Insert {
  ${insertFields}
}

export type ${tableName}Update = ${updateType};
  `;

  const generatedDir = existsSync('src') ? 'src/generated' : 'generated';
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true });
  }

  const tableFilePath = `${generatedDir}/${tableName}.types.ts`;
  writeFileSync(tableFilePath, typeContent);

  const indexPath = `${generatedDir}/index.ts`;
  const replaceLabel = '//$___';
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      `// Auto-generated index for table types\nexport default class TableTypes {\n  ${replaceLabel}\n}\n`
    );
  }
  let indexContent = readFileSync(indexPath, 'utf-8');
  const importStatement = `import { type ${tableName}Select, type ${tableName}Insert, type ${tableName}Update } from './${tableName}.types';`;
  const tableTypeEntry = `  static ${tableName}: {\n    select: ${tableName}Select;\n    insert: ${tableName}Insert;\n    update: ${tableName}Update;\n  };`;

  if (!indexContent.includes(importStatement)) {
    indexContent = `${importStatement}\n${indexContent}`;
  }

  if (!indexContent.includes(`static ${tableName}:`)) {
    indexContent = indexContent.replace(replaceLabel, `${tableTypeEntry}\n  ${replaceLabel}`);
  }

  writeFileSync(indexPath, indexContent);
}
