// Novo arquivo type-generator.ts
import type { SQLITE_TYPES } from '../utils/sqlite.types';
import { type ColumnMetadata } from './query-builder';
import { writeFileSync } from 'fs';

export function mapType(sqlType: SQLITE_TYPES): string {
  if (sqlType.startsWith('VARCHAR')) {
    return 'string';
  }
  switch (sqlType) {
    case 'INTEGER':
      return 'number';
    case 'TEXT':
    case 'DATE':
    case 'DATETIME':
    case 'UUID':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    case 'FLOAT':
      return 'number';
    default:
      return 'any';
  }
}

export function generateTableTypes(tableName: string, columns: Record<string, ColumnMetadata>) {
  const selectFields = Object.entries(columns)
    .map(([name, meta]) => `${name}: ${meta.tsType}${meta.nullable ? ' | null' : ''}`)
    .join('\n  ');

  const insertFields = Object.entries(columns)
    .filter(([_, meta]) => !meta.isPrimary) // Ignora PK auto gerada
    .map(([name, meta]) => `${name}${meta.nullable || meta.hasDefault ? '?' : ''}: ${meta.tsType}${meta.nullable ? ' | null' : ''}`)
    .join('\n  ');

  const updateType = `Partial<Omit<${tableName}Insert, 'id'>> & { id: number }`;

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

  writeFileSync(`src/generated/${tableName}.types.ts`, typeContent);
}
