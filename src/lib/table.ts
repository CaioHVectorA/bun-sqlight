import type { SQLITE_TYPES } from '../utils/sqlite.types';
import type { ColumnMetadata } from './query-builder';

export type Tables = {
  [key: string]: {
    [key: string]: ColumnMetadata;
  };
};
