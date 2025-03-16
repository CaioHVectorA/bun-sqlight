import type { Tables } from './table';

// add quotes to string values, convert boolean to 1 or 0, and convert Date to ISO string
export const normalizeInsertData = (t: Tables, table: string, keys: string[]) => (value: any, index: number) => {
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  // the library should handle the Date conversion in different ways
  if (value instanceof Date) {
    const actualTable = t[table];
    const field = actualTable[keys[index]];
    if (field.sqlType === 'DATE') {
      return `"${value.toISOString().split('T')[0]}"`; // -> "2021-01-01"
    }
    if (field.sqlType === 'DATETIME' || field.sqlType === 'TIMESTAMP') {
      return `"${value.toISOString().replace('T', ' ').replace('Z', '')}"`; // -> "2021-01-01 00:00:00"
    }
    return `"${value.toISOString()}"`; // -> "2021-01-01T00:00:00.000Z"
  }
  return value;
};
