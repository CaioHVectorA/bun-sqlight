import type { SQLITE_TYPES } from '../utils/sqlite.types';
import { type ColumnMetadata } from './query-builder';
import { readFileSync, writeFileSync } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

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
    case 'TIMESTAMP':
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
  console.log({ tableName, columns });
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
  const dir = dirname(`src/generated/${tableName}.types.ts`);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  console.log({ dirname: dirname(`src/generated/${tableName}.types.ts`), _dirname: __dirname + `src/generated/${tableName}.types.ts` });
  writeFileSync(`src/generated/${tableName}.types.ts`, typeContent);
  // now generated/index should have a map of all table names.
  // some thing like:
  // ```ts
  // import { type userSelect, type userInsert, type userUpdate } from './user.types';
  // import { type logsSelect, type logsInsert, type logsUpdate } from './logs.types';
  // export type TableTypes = {
  // user: {
  //  select: userSelect,
  //  insert: userInsert,
  //  update: userUpdate,
  // },
  // logs: {
  //  select: logsSelect,
  //  insert: logsInsert,
  //  update: logsUpdate,
  // },
  // //$___
  // }
  // ```
  // We can import them in our query builder
  // And the code should be incremental, so we can add new tables without breaking the existing ones

  const indexPath = 'src/generated/index.ts';
  const replaceLabel = '//$___';
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      `
      // Auto-generated index for table types
      export default class TableTypes {\n\n      //${replaceLabel}\n    }
      `
    );
  }
  let indexContent = readFileSync(indexPath, 'utf-8');
  const importStatement = `import { type ${tableName}Select, type ${tableName}Insert, type ${tableName}Update } from './${tableName}.types';`;
  const tableTypeEntry = `  \nstatic ${tableName}: {\n    select: ${tableName}Select,\n    insert: ${tableName}Insert,\n    update: ${tableName}Update,\n  }`;

  if (!indexContent.includes(importStatement)) {
    indexContent = `${importStatement}\n${indexContent}`;
  }

  if (!indexContent.includes(tableTypeEntry)) {
    indexContent = indexContent.replace(replaceLabel, `${tableTypeEntry}\n${replaceLabel}`);
  }

  writeFileSync(indexPath, indexContent);
}
